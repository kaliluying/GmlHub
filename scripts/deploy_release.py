"""Root-owned SSH forced command; runs as the unprivileged GmlHub deploy user."""
import fcntl
import gzip
import hashlib
import json
import os
import re
import shlex
import shutil
import signal
import subprocess
import sys
import tarfile
import tempfile
import time
from pathlib import Path, PurePosixPath
from urllib.parse import quote

ROOT = Path('/www/wwwroot/gmlhub-cicd')
LIMIT = 128 * 1024 * 1024


def validate_release(directory, commit):
    manifest = json.loads((directory / 'version.json').read_text())
    if manifest.get('commit') != commit or not isinstance(manifest.get('files'), dict):
        raise ValueError('release manifest does not match the requested commit')
    files = manifest['files']
    if not {'index.html', 'sw.js', 'manifest.webmanifest'} <= files.keys():
        raise ValueError('incomplete release')
    # Baota may create these protected control files when changing the site root.
    server_files = {'version.json', '.user.ini', '.htaccess'}
    actual = {path.relative_to(directory).as_posix() for path in directory.rglob('*')
              if path.is_file() and path.relative_to(directory).as_posix() not in server_files}
    if set(files) != actual:
        raise ValueError('release file list was modified')
    for name, digest in files.items():
        path = PurePosixPath(name)
        if path.is_absolute() or '..' in path.parts or any(part.startswith('.') for part in path.parts):
            raise ValueError('unsafe manifest path')
        target = directory / name
        if target.is_symlink() or hashlib.sha256(target.read_bytes()).hexdigest() != digest:
            raise ValueError('release file checksum mismatch: ' + name)
    return manifest


def unpack(archive, directory):
    with gzip.open(archive, 'rb') as compressed, tempfile.TemporaryFile() as plain:
        while True:
            chunk = compressed.read(65536)
            if not chunk:
                break
            if plain.tell() + len(chunk) > LIMIT + 2 * 1024 * 1024:
                raise ValueError('tar stream is too large')
            plain.write(chunk)
        plain.seek(0)
        with tarfile.open(fileobj=plain, mode='r:') as stream:
            extract_files(stream, directory)


def extract_files(stream, directory):
    total = 0
    names = set()
    for member in stream:
        path = PurePosixPath(member.name)
        if (not member.isfile() or path.is_absolute() or '..' in path.parts
                or any(part.startswith('.') for part in path.parts)
                or member.name in names or len(names) >= 1000):
            raise ValueError('archive contains an unsafe entry')
        total += member.size
        if total > LIMIT:
            raise ValueError('unpacked release is too large')
        names.add(member.name)
        target = directory / path
        target.parent.mkdir(parents=True, exist_ok=True, mode=0o755)
        with stream.extractfile(member) as source, target.open('xb') as dest:
            shutil.copyfileobj(source, dest)
        target.chmod(0o644)


def switch(root, target):
    link = root / '.current-next'
    link.unlink(missing_ok=True)
    link.symlink_to(target)
    os.replace(link, root / 'current')


def probe(directory, commit):
    manifest = validate_release(directory, commit)
    deadline = time.monotonic() + 90
    for name in ['version.json', *manifest['files']]:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise TimeoutError('origin checks exceeded 90 seconds')
        body = subprocess.check_output([
            'curl', '--fail', '--silent', '--show-error', '--noproxy', '*',
            '--max-time', str(min(8, remaining)), '--resolve', 'gmlhub.top:443:127.0.0.1',
            'https://gmlhub.top/' + quote(name) + '?release=' + commit,
        ], timeout=min(12, remaining + 1))
        if body != (directory / name).read_bytes():
            raise ValueError('origin serves different release bytes: ' + name)


def activate(root, commit, health_check=probe):
    target = root / 'releases' / commit / 'public'
    validate_release(target, commit)
    current = root / 'current'
    previous = current.resolve(strict=True) if current.is_symlink() else None
    if current.exists() and previous is None:
        raise ValueError('current must be a symlink')
    try:
        switch(root, target)
        health_check(target, commit)
    except BaseException:
        if previous:
            switch(root, previous)
        else:
            current.unlink(missing_ok=True)
        raise
    print('active release: ' + commit, flush=True)


def deploy(root, commit, digest, archive, health_check=probe):
    if hashlib.sha256(archive.read_bytes()).hexdigest() != digest:
        raise ValueError('uploaded archive checksum mismatch')
    release = root / 'releases' / commit
    if release.exists():
        if (release / 'archive.sha256').read_text().strip() != digest:
            raise ValueError('the same commit already has a different build')
    else:
        with tempfile.TemporaryDirectory(prefix='.stage-', dir=root) as stage:
            stage = Path(stage)
            public = stage / 'public'
            public.mkdir(mode=0o755)
            unpack(archive, public)
            validate_release(public, commit)
            assets = root / 'shared' / 'assets'
            assets.mkdir(parents=True, exist_ok=True, mode=0o755)
            for source in (public / 'assets').rglob('*'):
                if not source.is_file():
                    continue
                dest = assets / source.relative_to(public / 'assets')
                dest.parent.mkdir(parents=True, exist_ok=True, mode=0o755)
                if dest.exists():
                    if dest.read_bytes() != source.read_bytes():
                        raise ValueError('hashed asset name collision')
                else:
                    temporary = dest.with_name(dest.name + '.incoming')
                    shutil.copyfile(source, temporary)
                    temporary.chmod(0o644)
                    os.replace(temporary, dest)
            public.joinpath('.well-known').symlink_to(root / 'shared' / 'well-known')
            (stage / 'archive.sha256').write_text(digest + '\n')
            stage.chmod(0o755)
            release.parent.mkdir(exist_ok=True)
            os.replace(stage, release)
    activate(root, commit, health_check)


def parse_command(command):
    args = shlex.split(command)
    if (len(args) not in (2, 3) or args[0] not in ('deploy', 'rollback')
            or not re.fullmatch(r'[0-9a-f]{40}', args[1])
            or (args[0] == 'deploy' and (len(args) != 3 or not re.fullmatch(r'[0-9a-f]{64}', args[2])))
            or (args[0] == 'rollback' and len(args) != 2)):
        raise ValueError('only deploy <commit> <checksum> or rollback <commit> is allowed')
    return args


def main():
    def interrupted(signum, _frame):
        raise InterruptedError('deployment interrupted by signal ' + str(signum))
    for signum in (signal.SIGTERM, signal.SIGHUP):
        signal.signal(signum, interrupted)
    os.umask(0o022)
    args = parse_command(os.environ.get('SSH_ORIGINAL_COMMAND', ''))
    with tempfile.TemporaryDirectory(prefix='.upload-', dir=ROOT) as temporary:
        archive = Path(temporary) / 'release.tar.gz'
        if args[0] == 'deploy':
            size = 0
            with archive.open('wb') as dest:
                while True:
                    chunk = sys.stdin.buffer.read(65536)
                    if not chunk:
                        break
                    size += len(chunk)
                    if size > 32 * 1024 * 1024:
                        raise ValueError('uploaded archive is too large')
                    dest.write(chunk)
        with (ROOT / 'deploy.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            if args[0] == 'deploy':
                deploy(ROOT, args[1], args[2], archive)
            else:
                activate(ROOT, args[1])


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('deployment failed: ' + str(error), file=sys.stderr)
        sys.exit(1)

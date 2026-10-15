"""Package the existing Vite build with a verifiable file manifest."""
import hashlib
import gzip
import json
import re
import sys
import tarfile
from pathlib import Path


def package(source, commit, output):
    if not re.fullmatch(r"[0-9a-f]{40}", commit):
        raise ValueError("commit must be a full Git SHA")
    source = Path(source)
    files = sorted(path for path in source.rglob("*") if path.is_file())
    if any(path.is_symlink() or any(part.startswith(".") for part in path.relative_to(source).parts)
           for path in source.rglob("*")):
        raise ValueError("build must not contain links or hidden files")
    files = [path for path in files if path.relative_to(source).as_posix() != "version.json"]
    if not all((source / name).is_file() for name in ["index.html", "sw.js", "manifest.webmanifest"]):
        raise ValueError("incomplete build")
    if "__BUILD_VERSION__" in (source / "sw.js").read_text():
        raise ValueError("service worker was not built")
    manifest = {"commit": commit, "files": {
        path.relative_to(source).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in files
    }}
    version = source / "version.json"
    version.write_text(json.dumps(manifest, sort_keys=True) + "\n")
    with open(output, 'wb') as dest, gzip.GzipFile(filename='', mode='wb', fileobj=dest, mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode='w') as archive:
            for path in [*files, version]:
                info = archive.gettarinfo(path, arcname=path.relative_to(source).as_posix())
                info.mtime = info.uid = info.gid = 0
                info.uname = info.gname = ''
                info.mode = 0o644
                with path.open('rb') as source_file:
                    archive.addfile(info, source_file)
    return hashlib.sha256(Path(output).read_bytes()).hexdigest()


if __name__ == "__main__":
    print(package(*sys.argv[1:]))

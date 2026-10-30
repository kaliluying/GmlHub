"""Deploy a tested Worker with recovery to the pre-deploy desktop release."""
import argparse
import json
import os
import re
import subprocess
import sys
import time
import uuid
from pathlib import Path

from check_one_ip_release import check, get
from deploy_release import validate_release
from select_worker_version import select_version


def wrangler(*arguments):
    try:
        result = subprocess.run([
            'pnpm', '--dir', 'modules/one-ip', 'exec', 'wrangler',
            *arguments, '--config', '../../wrangler.toml',
        ], capture_output=True, timeout=180, check=False)
    except (OSError, subprocess.SubprocessError):
        raise ValueError('Worker CLI unavailable or timed out') from None
    if result.returncode:
        # CLI output can contain bindings or credentials; report only the operation.
        raise ValueError('Worker CLI failed: ' + ' '.join(arguments[:2]))
    return result.stdout


def public_commit(origin, path):
    document = json.loads(get(origin + path + '?release=' + uuid.uuid4().hex))
    commit = document.get('commit') if isinstance(document, dict) else None
    if not isinstance(commit, str) or not re.fullmatch(r'[a-f0-9]{40}', commit):
        raise ValueError('Invalid public release metadata: ' + path)
    return commit


def retry(check):
    for attempt in range(3):
        try:
            return check()
        except (ValueError, OSError):
            if attempt == 2:
                raise
            time.sleep(3)


def deploy(commit, directory, snapshot_path, origin='https://gmlhub.top'):
    if not re.fullmatch(r'[a-f0-9]{40}', commit):
        raise ValueError('Invalid release SHA')
    if not os.environ.get('CLOUDFLARE_API_TOKEN') or not re.fullmatch(
            r'[a-fA-F0-9]{32}', os.environ.get('CLOUDFLARE_ACCOUNT_ID', '')):
        raise ValueError('Missing or invalid Worker deployment configuration')
    validate_release(Path(directory), commit)
    desktop = public_commit(origin, '/version.json')
    previous_worker = public_commit(origin, '/one-ip/api/deployment')
    versions = json.loads(wrangler('versions', 'list', '--json'))
    version_id = select_version(versions, desktop)
    version = json.loads(wrangler('versions', 'view', version_id, '--json'))
    if (version.get('id') != version_id
            or version.get('annotations', {}).get('workers/tag') != desktop
            or not any(binding.get('name') == 'RELEASE_SHA'
                       and binding.get('type') == 'plain_text'
                       and binding.get('text') == desktop
                       for binding in version.get('resources', {}).get('bindings', []))):
        raise ValueError('Recovery version does not identify the desktop release')
    snapshot = {
        'desktop_commit': desktop,
        'previous_worker_commit': previous_worker,
        'recovery_version_id': version_id,
    }
    with open(snapshot_path, 'x', encoding='utf-8') as stream:
        os.chmod(snapshot_path, 0o600)
        json.dump(snapshot, stream)
        stream.flush()
        os.fsync(stream.fileno())
    with open(snapshot_path, encoding='utf-8') as stream:
        if json.load(stream) != snapshot:
            raise ValueError('Recovery snapshot verification failed; deployment stopped')
    print(f'Recovery target: desktop {desktop}, Worker version {version_id}', flush=True)
    if previous_worker != desktop:
        print(f'Pre-existing mismatch: Worker {previous_worker}; recovery targets the desktop SHA.', flush=True)
    if public_commit(origin, '/version.json') != desktop:
        raise ValueError('Desktop changed during preflight; deployment stopped')
    if public_commit(origin, '/one-ip/api/deployment') != previous_worker:
        raise ValueError('Worker changed during preflight; deployment stopped')

    try:
        wrangler('deploy', '../../.worker-check/one-ip-worker.js', '--no-bundle',
                 '--keep-vars', '--tag', commit, '--var', 'RELEASE_SHA:' + commit)
        retry(lambda: check(commit, directory, origin))
    except (ValueError, OSError) as failure:
        print('Worker deployment/check failed; attempting recovery.', flush=True)
        try:
            if public_commit(origin, '/version.json') != desktop:
                raise ValueError('Desktop changed; refusing automatic Worker recovery')
            wrangler('versions', 'deploy', '--version-id', version_id, '--percentage', '100', '--yes')

            def verify_recovery():
                status = json.loads(wrangler('deployments', 'status', '--json'))
                if status.get('versions') != [{'version_id': version_id, 'percentage': 100}]:
                    raise ValueError('Recovery Worker version/traffic not confirmed')
                if public_commit(origin, '/one-ip/api/deployment') != desktop:
                    raise ValueError('Recovery Worker public commit not confirmed')
                if public_commit(origin, '/version.json') != desktop:
                    raise ValueError('Desktop changed during recovery')

            retry(verify_recovery)
        except (ValueError, OSError, TypeError, KeyError, AttributeError) as recovery_failure:
            raise RuntimeError(
                f'Worker recovery FAILED; consistency is NOT verified. '
                f'Target {desktop} / {version_id}. {recovery_failure}'
            ) from None
        raise ValueError(f'Worker recovery verified for {desktop}; release remains FAILED: {failure}') from None
    print('Worker deployment and release checks verified: ' + commit, flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('commit')
    parser.add_argument('directory')
    parser.add_argument('--snapshot', default='worker-recovery.json')
    parser.add_argument('--origin', default='https://gmlhub.top')
    arguments = parser.parse_args()
    try:
        deploy(arguments.commit, arguments.directory, arguments.snapshot, arguments.origin)
    except (ValueError, OSError, RuntimeError, TypeError, KeyError, AttributeError) as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())

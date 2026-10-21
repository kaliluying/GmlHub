"""Check the actual Worker revision, bundled pages, and a public-IP API query."""
import hashlib
import json
import re
import subprocess
import sys
import time
from pathlib import Path
from deploy_release import validate_release


def get(url, accept='*/*'):
    result = subprocess.run([
        'curl', '--fail', '--silent', '--show-error',
        '--max-time', '15', '--header', 'Cache-Control: no-cache',
        '--header', 'Accept: ' + accept, url,
    ], capture_output=True, check=False)
    if result.returncode:
        raise ValueError('public request failed')
    return result.stdout


def check(commit, directory, origin='https://gmlhub.top'):
    if not re.fullmatch(r'[a-f0-9]{40}', commit):
        raise ValueError('invalid release SHA')
    directory = Path(directory)
    validate_release(directory, commit)
    cache_buster = '?release=' + commit
    deployment = json.loads(get(origin + '/one-ip/api/deployment' + cache_buster))
    if not isinstance(deployment, dict) or deployment.get('commit') != commit:
        raise ValueError('Worker release mismatch')
    config = json.loads(get(origin + '/one-ip/api/browser/challenges' + cache_buster))
    if not isinstance(config, list) or not config or not all(
            isinstance(item, dict) and isinstance(item.get('configured'), bool) for item in config):
        raise ValueError('Worker configuration API is unavailable')
    health = json.loads(get(origin + '/one-ip/api/ip/health?ip=1.1.1.1&release=' + commit))
    if not isinstance(health, dict) or health.get('ip') != '1.1.1.1':
        raise ValueError('Worker public-IP lookup is unavailable')
    html = (directory / 'one-ip/index.html').read_bytes()
    script = re.search(rb'<script[^>]+src="(/one-ip/assets/[^"]+\.js)"', html)
    if not script:
        raise ValueError('missing module entry script')
    paths = ['/one-ip/', '/one-ip/network/ip/1.1.1.1', script.group(1).decode()]
    for path in paths:
        expected = html if path in paths[:2] else (directory / path.lstrip('/')).read_bytes()
        actual = get(origin + path + cache_buster, 'text/html' if path in paths[:2] else '*/*')
        if hashlib.sha256(actual).digest() != hashlib.sha256(expected).digest():
            raise ValueError('Worker asset mismatch: ' + path)


if __name__ == '__main__':
    for attempt in range(3):
        try:
            check(*sys.argv[1:])
            print('one-ip Worker and public assets verified: ' + sys.argv[1])
            break
        except (ValueError, OSError) as error:
            if attempt == 2:
                raise SystemExit('one-ip release check failed: ' + str(error))
            time.sleep(3)

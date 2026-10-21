"""Resolve a release SHA to the newest retained Worker version, including retries."""
import json
import re
import sys


def select_version(versions, commit):
    if not re.fullmatch(r'[a-f0-9]{40}', commit):
        raise ValueError('invalid release SHA')
    matches = [version for version in versions
               if version.get('annotations', {}).get('workers/tag') == commit]
    if not matches:
        raise ValueError('release not found in the 10 most recent Worker versions')
    version = max(matches, key=lambda item: item['metadata']['created_on'])
    if not re.fullmatch(r'[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}', version['id']):
        raise ValueError('invalid Worker version ID')
    return version['id']


if __name__ == '__main__':
    try:
        print(select_version(json.load(sys.stdin), sys.argv[1]))
    except (ValueError, KeyError, TypeError, AttributeError) as error:
        raise SystemExit('Cannot select Worker rollback: ' + str(error))

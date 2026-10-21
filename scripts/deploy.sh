#!/usr/bin/env bash
set -euo pipefail
umask 077

: "${DEPLOY_HOST:?}" "${DEPLOY_PORT:?}" "${DEPLOY_USER:?}" "${DEPLOY_SSH_KEY:?}" "${DEPLOY_KNOWN_HOSTS:?}"
[[ "$DEPLOY_HOST" =~ ^[a-zA-Z0-9.-]+$ && "$DEPLOY_PORT" =~ ^[0-9]+$ && "$DEPLOY_USER" == gmlhub-deploy ]]
[[ "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]]
[[ "$OPERATION" == deploy || "$OPERATION" == rollback ]]
if [[ "${1:-}" == --check-only ]]; then exit 0; fi

key_dir=$(mktemp -d)
trap 'rm -rf "$key_dir"' EXIT
printf '%s\n' "$DEPLOY_SSH_KEY" > "$key_dir/key"
printf '%s\n' "$DEPLOY_KNOWN_HOSTS" > "$key_dir/known_hosts"
ssh_args=(-i "$key_dir/key" -p "$DEPLOY_PORT" -o BatchMode=yes -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$key_dir/known_hosts" -o ConnectTimeout=15)

if [[ "$OPERATION" == deploy ]]; then
  digest=$(sha256sum release.tar.gz | cut -d ' ' -f 1)
  timeout 180 ssh "${ssh_args[@]}" "$DEPLOY_USER@$DEPLOY_HOST" "deploy $RELEASE_SHA $digest" < release.tar.gz
else
  timeout 180 ssh "${ssh_args[@]}" "$DEPLOY_USER@$DEPLOY_HOST" "rollback $RELEASE_SHA"
fi

curl --fail --silent --show-error --retry 3 --retry-delay 2 --max-time 20 \
  "https://gmlhub.top/version.json?release=$RELEASE_SHA" > "$key_dir/version.json"
python3 - "$key_dir/version.json" "$RELEASE_SHA" <<'PY'
import json, sys
with open(sys.argv[1]) as source:
    assert json.load(source)['commit'] == sys.argv[2], 'public release check failed'
print('Public release verified: ' + sys.argv[2])
PY

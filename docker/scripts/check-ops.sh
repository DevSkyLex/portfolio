#!/usr/bin/env bash
# Static checks of the operations code, all in pinned containers (only Docker needed):
#   bash docker/scripts/check-ops.sh [check…]
# Checks (all by default): shellcheck hadolint compose nginx csp ansible
# Runs on Linux (CI) and on Windows with Git Bash. Nothing is deployed and no server is contacted;
# the ansible check downloads the collections listed in ansible/requirements.yml.
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
cd "$repo"

SHELLCHECK_IMAGE=koalaman/shellcheck:v0.11.0
HADOLINT_IMAGE=hadolint/hadolint:v2.14.0
NGINX_IMAGE=nginx:1.29.8-alpine3.23
PYTHON_IMAGE=python:3.13-slim-bookworm
ANSIBLE_CORE_VERSION=2.21.5
ANSIBLE_LINT_VERSION=26.10.1

# Git Bash: no path conversion of container paths, Windows form for bind mounts.
if command -v cygpath > /dev/null 2>&1; then
  export MSYS_NO_PATHCONV=1
  host_path() { cygpath -w "$1"; }
else
  host_path() { printf '%s' "$1"; }
fi
REPO_MOUNT="$(host_path "$repo")"

failed=()
run_check() {
  local name=$1
  printf '\n=== %s\n' "$name"
  if "check_$name"; then echo "--- $name: OK"; else echo "--- $name: FAILED" >&2; failed+=("$name"); fi
}

check_shellcheck() {
  docker run --rm -v "$REPO_MOUNT:/mnt:ro" -w /mnt "$SHELLCHECK_IMAGE" \
    --severity=style --external-sources docker/scripts/*.sh docker/postgres/init/*.sh
}

check_hadolint() {
  docker run --rm -i "$HADOLINT_IMAGE" hadolint --failure-threshold style - < docker/service.Dockerfile
}

check_compose() {
  # Functions run under `if`, where `set -e` does not apply: each step returns explicitly.
  TRUSTED_PROXIES=192.0.2.10 \
    docker compose --env-file docker/.env.example -f docker/compose.prod.yml --profile ops config --quiet || return 1
  echo "compose.prod.yml: valid"
  # The acceptance overlay selects committed examples without creating a temporary Compose file.
  docker compose --env-file docker/.env.example -f docker/compose.dev.yml -f docker/compose.e2e.yml \
    --profile ops --profile seed config --quiet || return 1
  echo "compose.dev.yml + compose.e2e.yml: valid"
}

check_nginx() {
  local nginx=$repo/docker/nginx
  local run=(docker run --rm --read-only --tmpfs /var/cache/nginx --tmpfs /run --tmpfs /tmp
    -e NGINX_ENTRYPOINT_QUIET_LOGS=1)
  echo "production:"
  "${run[@]}" \
    -v "$(host_path "$nginx/nginx.conf"):/etc/nginx/nginx.conf:ro" \
    -v "$(host_path "$nginx/conf.d"):/etc/nginx/conf.d:ro" \
    -v "$(host_path "$nginx/snippets"):/etc/nginx/snippets:ro" \
    -v "$(host_path "$nginx/templates"):/etc/nginx/templates:ro" \
    -e APP_HOST=example.test -e APP_PORT=8080 -e TRUSTED_PROXIES=192.0.2.10 \
    -e 'NGINX_ENVSUBST_FILTER=^(APP_HOST|APP_PORT|TRUSTED_PROXIES)$' \
    -e NGINX_ENVSUBST_OUTPUT_DIR=/tmp \
    "$NGINX_IMAGE" nginx -t || return 1
  echo "development:"
  "${run[@]}" \
    -v "$(host_path "$nginx/nginx.conf"):/etc/nginx/nginx.conf:ro" \
    -v "$(host_path "$nginx/conf.d/00-http.conf"):/etc/nginx/conf.d/00-http.conf:ro" \
    -v "$(host_path "$nginx/dev/portfolio.conf"):/etc/nginx/conf.d/default.conf:ro" \
    -v "$(host_path "$nginx/snippets"):/etc/nginx/snippets:ro" \
    -v "$(host_path "$nginx/dev/security-headers.conf"):/etc/nginx/snippets/security-headers.conf:ro" \
    "$NGINX_IMAGE" nginx -t
}

# Production and development must send the same CSP (development only drops upgrade-insecure-requests).
check_csp() {
  local prod dev
  prod=$(sed -n 's/.*Content-Security-Policy "\([^"]*\)".*/\1/p' docker/nginx/snippets/security-headers.conf)
  dev=$(sed -n 's/.*Content-Security-Policy "\([^"]*\)".*/\1/p' docker/nginx/dev/security-headers.conf)
  [ -n "$prod" ] && [ "${prod%; upgrade-insecure-requests}" = "$dev" ] || {
    printf 'CSP differs:\n  prod: %s\n  dev:  %s\n' "$prod" "$dev" >&2
    return 1
  }
  echo "CSP identical in production and development."
}

check_ansible() {
  # Copied into the container: ansible.cfg is ignored in a world-writable directory (Windows mounts).
  docker run --rm -v "$REPO_MOUNT:/repo:ro" -v portfolio-check-ops-pip:/root/.cache/pip \
    -e ANSIBLE_FORCE_COLOR=0 "$PYTHON_IMAGE" sh -euc "
      pip install --quiet --root-user-action=ignore --disable-pip-version-check \
        ansible-core==$ANSIBLE_CORE_VERSION ansible-lint==$ANSIBLE_LINT_VERSION
      cp -r /repo/ansible /work && cd /work && rm -rf .collections
      ansible-galaxy collection install -r requirements.yml -p .collections > /dev/null
      for playbook in playbooks/*.yml; do ansible-playbook --syntax-check \"\$playbook\"; done
      ansible-lint --profile production
    "
}

checks=("$@")
[ ${#checks[@]} -gt 0 ] || checks=(shellcheck hadolint compose nginx csp ansible)
for check in "${checks[@]}"; do run_check "$check"; done

if [ ${#failed[@]} -gt 0 ]; then
  printf '\nFailed checks: %s\n' "${failed[*]}" >&2
  exit 1
fi
printf '\nAll operations checks passed.\n'

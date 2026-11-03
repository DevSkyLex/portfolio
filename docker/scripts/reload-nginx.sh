#!/usr/bin/env bash
# Validates the Nginx configuration, then reloads it without dropping connections; nothing to do when
# the container is not running. Used by scripts/deploy.sh and Ansible.
#   bash scripts/reload-nginx.sh
set -euo pipefail
cd "$(dirname "$0")/.."
export COMPOSE_FILE="${COMPOSE_FILE:-compose.prod.yml}"

if [ -z "$(docker compose ps --status running --quiet nginx)" ]; then
  echo "Nginx is not running: nothing to reload."
  exit 0
fi
# Bind-mounted templates can change without a container recreation. Render with the same restricted
# environment filter as startup before testing; an invalid configuration leaves the running workers.
docker compose exec -T nginx /docker-entrypoint.d/20-envsubst-on-templates.sh
# An invalid configuration stops here: the running Nginx keeps the previous one.
docker compose exec -T nginx nginx -t -q
docker compose exec -T nginx nginx -s reload
echo "Nginx reloaded."

#!/usr/bin/env bash
# Deploys the services of a published version on the VPS (run by playbooks/deploy.yml, or by hand):
#   TAG=<commit sha> bash scripts/deploy.sh
# Order: images pulled → Postgres up → backup (skipped on a blank database) → roles and passwords
# synced → migrations (migration role) → services recreated and healthy → Nginx reloaded → TAG saved
# in .env (used by every later compose command: backups, renewals, manual operations).
# Migrations run while the previous version still serves: they must stay backward compatible
# (expand, then contract in a later release). A failure leaves the previous TAG in .env.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${TAG:?TAG required (SHA of the deployed commit)}"
[[ "$TAG" =~ ^[0-9a-f]{7,40}$ ]] || { echo "Invalid TAG (commit SHA expected): $TAG" >&2; exit 1; }
export TAG COMPOSE_FILE="${COMPOSE_FILE:-compose.prod.yml}"

# One deployment at a time (workflow and manual runs).
command -v flock > /dev/null || { echo "flock (util-linux) is required." >&2; exit 1; }
exec 9> .deploy.lock
flock --nonblock 9 || { echo "Another deployment is running." >&2; exit 1; }

services=(identity-service content-service contact-service)
step() { printf '\n[%s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
sync_roles() {
  docker compose exec -T -u postgres postgres sh /docker-entrypoint-initdb.d/01-roles.sh
}
previous_tag=$(sed -n 's/^TAG=//p' .env 2> /dev/null || true)

step "Images ${TAG} (previous: ${previous_tag:-none})"
docker compose pull --quiet --ignore-buildable "${services[@]}"

step "Postgres"
docker compose up -d --wait --wait-timeout 120 postgres

step "Backup before migrating"
bash scripts/backup.sh

step "Roles and passwords"
sync_roles

step "Migrations"
for job in identity-migrate content-migrate contact-migrate; do
  docker compose --profile ops run --rm --quiet-pull "$job"
done
# Grants on the tables the migrations created.
sync_roles

step "Services"
docker compose up -d --wait --wait-timeout 180 --remove-orphans

step "Nginx"
bash scripts/reload-nginx.sh

# Deployed version, kept for later compose commands (other keys are managed by Ansible).
env_file=$(mktemp .env.XXXXXX)
grep -v '^TAG=' .env > "$env_file" 2> /dev/null || true
echo "TAG=$TAG" >> "$env_file"
chmod 640 "$env_file"
mv "$env_file" .env

step "Deployment ${TAG} complete (rollback: TAG=${previous_tag:-<sha>} bash scripts/deploy.sh)."

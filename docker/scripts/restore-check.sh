#!/usr/bin/env bash
# Restore test: restores a backup (default: the latest) into a throwaway Postgres container without
# network, then checks that every service schema has its migration history and tables. The production
# database is never touched. Run weekly by the portfolio-restore-check systemd timer, or by hand:
#   bash scripts/restore-check.sh [/srv/backups/portfolio-<date>.dump]
# Encrypted backups (.dump.age) need the private key: BACKUP_AGE_IDENTITY=<key file> (operator machine).
set -euo pipefail
cd "$(dirname "$0")/.."
export COMPOSE_FILE="${COMPOSE_FILE:-compose.prod.yml}"
if [ -f backup.env ]; then
  # shellcheck source=/dev/null
  . ./backup.env
fi
backup_dir="${BACKUP_DIR:-/srv/backups}"

file="${1:-$(find "$backup_dir" -maxdepth 1 -type f -name 'portfolio-*.dump*' | sort | tail -n 1)}"
[ -n "$file" ] && [ -f "$file" ] || { echo "No backup found in $backup_dir" >&2; exit 1; }
case "$file" in
  *.age)
    [ -n "${BACKUP_AGE_IDENTITY:-}" ] || {
      echo "Encrypted backup $file: set BACKUP_AGE_IDENTITY to test it (skipped)."
      exit 0
    }
    read_backup() { age --decrypt --identity "$BACKUP_AGE_IDENTITY" "$file"; } ;;
  *) read_backup() { cat "$file"; } ;;
esac

# Same Postgres image as production.
image=$(docker compose config --images postgres)
name="portfolio-restore-check-$$"
trap 'docker rm -f "$name" > /dev/null 2>&1 || true' EXIT
docker run -d --rm --name "$name" --network none \
  -e POSTGRES_PASSWORD=restore-check -e POSTGRES_DB=portfolio \
  --tmpfs /var/lib/postgresql/data "$image" > /dev/null

# Ready on TCP only once initialisation is over (the init server listens on the socket only).
for _ in $(seq 1 60); do
  docker exec "$name" pg_isready -q -h 127.0.0.1 -U postgres && break
  sleep 1
done
docker exec "$name" pg_isready -q -h 127.0.0.1 -U postgres

read_backup | docker exec -i "$name" \
  pg_restore --username postgres --dbname portfolio --no-owner --no-privileges --exit-on-error

status=0
for ctx in content contact identity; do
  counts=$(docker exec "$name" psql -U postgres -d portfolio -XAtq -c \
    "SELECT (SELECT count(*) FROM ${ctx}.__migrations) || ' migrations, ' ||
            (SELECT count(*) FROM pg_tables WHERE schemaname = '${ctx}') || ' tables'") || counts=''
  if [ -z "$counts" ] || [ "${counts%% *}" = "0" ]; then
    echo "  $ctx: missing or empty migration history" >&2
    status=1
  else
    echo "  $ctx: $counts"
  fi
done
[ "$status" -eq 0 ] && echo "Restore check passed: $file" || echo "Restore check FAILED: $file" >&2
exit "$status"

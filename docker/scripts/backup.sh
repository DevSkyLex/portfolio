#!/usr/bin/env bash
# Database backup: pg_dump custom format (compressed), checked with pg_restore --list, then kept
# BACKUP_RETENTION_DAYS days. Run daily by the portfolio-backup systemd timer and by scripts/deploy.sh.
#   bash scripts/backup.sh
# Settings (backup.env next to compose.prod.yml, written by Ansible; or the environment):
#   BACKUP_DIR (/srv/backups), BACKUP_RETENTION_DAYS (14),
#   BACKUP_AGE_RECIPIENT (age public key: the dump is stored encrypted as .dump.age; optional).
# Nothing to back up yet (no Postgres container, or a database never migrated): exit 0 with a message.
# Any other problem (Postgres stopped, dump or check failed): non-zero exit.
# Restore and restore test: docs/operations/deployment.md, scripts/restore-check.sh.
set -euo pipefail
cd "$(dirname "$0")/.."
export COMPOSE_FILE="${COMPOSE_FILE:-compose.prod.yml}"
if [ -f backup.env ]; then
  # shellcheck source=/dev/null
  . ./backup.env
fi
backup_dir="${BACKUP_DIR:-/srv/backups}"
retention_days="${BACKUP_RETENTION_DAYS:-14}"
age_recipient="${BACKUP_AGE_RECIPIENT:-}"

if [ -z "$(docker compose ps --all --quiet postgres)" ]; then
  echo "No Postgres container yet: nothing to back up."
  exit 0
fi
psql() { docker compose exec -T -u postgres postgres psql --no-psqlrc -XAtq -d portfolio "$@"; }
migrated=$(psql -c "SELECT count(*) FROM pg_class WHERE relname = '__migrations'")
if [ "$migrated" = "0" ]; then
  echo "Database never migrated: nothing to back up."
  exit 0
fi

umask 077
mkdir -p "$backup_dir"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
partial="$backup_dir/.portfolio-$stamp.partial"
trap 'rm -f "$partial" "$partial.age"' EXIT

docker compose exec -T -u postgres postgres \
  pg_dump --format custom --compress 6 --dbname portfolio > "$partial"
[ -s "$partial" ] || { echo "Empty dump" >&2; exit 1; }
# Readable archive (table of contents of every entry) before it counts as a backup.
docker compose exec -T -u postgres postgres pg_restore --list < "$partial" > /dev/null

if [ -n "$age_recipient" ]; then
  age --encrypt --recipient "$age_recipient" --output "$partial.age" "$partial"
  file="$backup_dir/portfolio-$stamp.dump.age"
  mv "$partial.age" "$file"
else
  file="$backup_dir/portfolio-$stamp.dump"
  mv "$partial" "$file"
fi
echo "Backup: $file ($(du -h "$file" | cut -f1))"

# Retention, only after a successful backup (the newest one is never old enough to be removed).
find "$backup_dir" -maxdepth 1 -type f -name 'portfolio-*.dump*' -mtime +"$retention_days" -print -delete

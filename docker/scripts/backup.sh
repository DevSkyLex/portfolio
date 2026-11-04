#!/usr/bin/env bash
# Database and media backup: pg_dump custom format (compressed), checked with pg_restore --list, then a
# tar.gz of the uploaded images (D40), checked with tar --list; both kept BACKUP_RETENTION_DAYS days.
# Run daily by the portfolio-backup systemd timer and by scripts/deploy.sh.
#   bash scripts/backup.sh
# Settings (backup.env next to compose.prod.yml, written by Ansible; or the environment):
#   BACKUP_DIR (/srv/apps/portfolio/production/backups), BACKUP_RETENTION_DAYS (14),
#   BACKUP_MEDIA_DIR (media directory, default ./media next to compose.prod.yml; absent: database only),
#   BACKUP_AGE_RECIPIENT (age public key: files stored encrypted as .dump.age / .media.tar.gz.age; optional).
# Files of one run share a stamp: portfolio-<stamp>.dump[.age] and portfolio-<stamp>.media.tar.gz[.age].
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
backup_dir="${BACKUP_DIR:-/srv/apps/portfolio/production/backups}"
retention_days="${BACKUP_RETENTION_DAYS:-14}"
age_recipient="${BACKUP_AGE_RECIPIENT:-}"
media_dir="${BACKUP_MEDIA_DIR:-$PWD/media}"

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
media_partial="$backup_dir/.portfolio-$stamp.media.partial"
trap 'rm -f "$partial" "$partial.age" "$media_partial" "$media_partial.age"' EXIT

# Stores a checked partial file under its final name (encrypted when a recipient is set), prints the name.
store() {
  local source=$1 target=$2
  if [ -n "$age_recipient" ]; then
    age --encrypt --recipient "$age_recipient" --output "$source.age" "$source"
    mv "$source.age" "$target.age"
    echo "$target.age"
  else
    mv "$source" "$target"
    echo "$target"
  fi
}

docker compose exec -T -u postgres postgres \
  pg_dump --format custom --compress 6 --dbname portfolio > "$partial"
[ -s "$partial" ] || { echo "Empty dump" >&2; exit 1; }
# Readable archive (table of contents of every entry) before it counts as a backup.
docker compose exec -T -u postgres postgres pg_restore --list < "$partial" > /dev/null

file=$(store "$partial" "$backup_dir/portfolio-$stamp.dump")
echo "Backup: $file ($(du -h "$file" | cut -f1))"

# Media after the dump: every image the dump references already exists (files are written under a
# temporary name, then renamed; the purge only removes unreferenced images). Temporary files are left out.
if [ -d "$media_dir" ]; then
  status=0
  # Exit status 1: a file changed or vanished while read (purge, new upload); the archive stays valid.
  tar --create --gzip --file "$media_partial" --directory "$media_dir" --exclude='*.tmp' \
    --warning=no-file-changed --warning=no-file-removed . || status=$?
  [ "$status" -le 1 ] || { echo "Media archive failed (tar exit $status)" >&2; exit 1; }
  tar --list --gzip --file "$media_partial" > /dev/null
  media_file=$(store "$media_partial" "$backup_dir/portfolio-$stamp.media.tar.gz")
  echo "Media: $media_file ($(du -h "$media_file" | cut -f1))"
else
  echo "No media directory ($media_dir): database only."
fi

# Retention, only after a successful backup (the newest one is never old enough to be removed).
find "$backup_dir" -maxdepth 1 -type f \( -name 'portfolio-*.dump*' -o -name 'portfolio-*.media.tar.gz*' \) \
  -mtime +"$retention_days" -print -delete

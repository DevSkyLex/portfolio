#!/usr/bin/env bash
# Restore test: restores a backup (default: the latest) into a throwaway Postgres container without
# network, then checks that every service schema has its migration history and tables. The media archive
# of the same run (portfolio-<stamp>.media.tar.gz[.age]) must list only image names (D40) and hold every
# image recorded in the restored content.media table. The production database and media directory are
# never touched. Run weekly by the portfolio-restore-check systemd timer, or by hand:
#   bash scripts/restore-check.sh [/srv/apps/portfolio/production/backups/portfolio-<date>.dump]
# Encrypted backups (.dump.age) need the private key: BACKUP_AGE_IDENTITY=<key file> (operator machine).
# A backup without media archive passes only when there is no media directory (BACKUP_MEDIA_DIR, default
# ./media), as for backups taken before D40 on a machine without uploads.
set -euo pipefail
cd "$(dirname "$0")/.."
export COMPOSE_FILE="${COMPOSE_FILE:-compose.prod.yml}"
if [ -f backup.env ]; then
  # shellcheck source=/dev/null
  . ./backup.env
fi
backup_dir="${BACKUP_DIR:-/srv/apps/portfolio/production/backups}"
media_dir="${BACKUP_MEDIA_DIR:-$PWD/media}"

file="${1:-$(find "$backup_dir" -maxdepth 1 -type f -name 'portfolio-*.dump*' | sort | tail -n 1)}"
[ -n "$file" ] && [ -f "$file" ] || { echo "No backup found in $backup_dir" >&2; exit 1; }
case "$file" in
  *.age)
    [ -n "${BACKUP_AGE_IDENTITY:-}" ] || {
      echo "Encrypted backup $file: set BACKUP_AGE_IDENTITY to test it (skipped)."
      exit 0
    }
    read_backup() { age --decrypt --identity "$BACKUP_AGE_IDENTITY" "$file"; }
    media="${file%.dump.age}.media.tar.gz.age"
    read_media() { age --decrypt --identity "$BACKUP_AGE_IDENTITY" "$media"; } ;;
  *)
    read_backup() { cat "$file"; }
    media="${file%.dump}.media.tar.gz"
    read_media() { cat "$media"; } ;;
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

# Media: a readable archive of fixed names only, holding every image the restored database records.
if [ -f "$media" ]; then
  entries=$(read_media | tar --list --gzip) || entries=''
  unexpected=$(printf '%s\n' "$entries" | grep -Ev '^(\./)?$|^(\./)?[0-9a-f-]{36}(-960)?\.webp$' || true)
  recorded=$(docker exec "$name" psql -U postgres -d portfolio -XAtq -c \
    "SELECT id FROM content.media" 2> /dev/null) || recorded=''
  missing=0
  for id in $recorded; do
    printf '%s\n' "$entries" | grep -Eq "^(\./)?$id\.webp$" || missing=$((missing + 1))
  done
  if [ -z "$entries" ]; then
    echo "  media: unreadable archive $media" >&2
    status=1
  elif [ -n "$unexpected" ]; then
    echo "  media: unexpected entries in $media:" >&2
    printf '    %s\n' "$unexpected" >&2
    status=1
  elif [ "$missing" -gt 0 ]; then
    echo "  media: $missing recorded image(s) missing from $media" >&2
    status=1
  else
    echo "  media: $(printf '%s\n' "$entries" | grep -c '\.webp$') files, $(printf '%s\n' "$recorded" | grep -c .) recorded images"
  fi
elif [ -d "$media_dir" ]; then
  echo "  media: no archive $media for this backup" >&2
  status=1
else
  echo "  media: no archive and no media directory (skipped)"
fi

[ "$status" -eq 0 ] && echo "Restore check passed: $file" || echo "Restore check FAILED: $file" >&2
exit "$status"

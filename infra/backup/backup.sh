#!/usr/bin/env sh
# pg_dump + copy LOCAL_MEDIA_DIR. Dry-run with --dry-run.
set -eu

DRY=0
if [ "${1:-}" = "--dry-run" ]; then
  DRY=1
fi

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT="${BACKUP_DIR:-./data/backups}/$STAMP"
echo "backup target: $OUT"

if [ "$DRY" = "1" ]; then
  echo "dry-run: would mkdir $OUT"
  echo "dry-run: would pg_dump or copy sqlite"
  echo "dry-run: would sync media"
  exit 0
fi

mkdir -p "$OUT"

if [ -n "${DATABASE_URL:-}" ] && echo "$DATABASE_URL" | grep -q "postgresql"; then
  pg_dump "$DATABASE_URL" > "$OUT/db.sql"
elif [ -f ./data/northstar.db ]; then
  cp ./data/northstar.db "$OUT/northstar.db"
fi

if [ -d "${LOCAL_MEDIA_DIR:-./data/media}" ]; then
  cp -R "${LOCAL_MEDIA_DIR:-./data/media}" "$OUT/media"
fi

echo "backup complete: $OUT"

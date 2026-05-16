#!/bin/sh
# NucleAI SQLite backup script.
# Copies the wren-ui db.sqlite3 to a versioned snapshot and prunes old ones.
# Run periodically inside the backup service (loop) or via host cron.
set -eu

SOURCE="${SOURCE:-/data/db.sqlite3}"
DEST_DIR="${DEST_DIR:-/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"

if [ ! -f "$SOURCE" ]; then
  echo "[backup] source $SOURCE not found, skipping"
  exit 0
fi

mkdir -p "$DEST_DIR"

TIMESTAMP=$(date -u +%Y%m%d-%H%M%S)
TARGET="$DEST_DIR/db-${TIMESTAMP}.sqlite3"

# Use the sqlite .backup command if available — it produces a consistent
# snapshot under concurrent writes. Fall back to plain cp otherwise.
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$SOURCE" ".backup '$TARGET'"
else
  cp "$SOURCE" "$TARGET"
fi

# Compress so 14 days of snapshots stay small.
gzip "$TARGET"

# Drop snapshots older than KEEP_DAYS.
find "$DEST_DIR" -type f -name 'db-*.sqlite3.gz' -mtime "+${KEEP_DAYS}" -delete

echo "[backup] saved ${TARGET}.gz"

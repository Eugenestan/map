#!/usr/bin/env bash
# PostgreSQL backup script
# Usage: ./backup.sh
# Cron (daily at 3:00 AM): 0 3 * * * /opt/nhatrang-map/deploy/backup.sh >> /var/log/nhatrang-backup.log 2>&1

set -euo pipefail

BACKUP_DIR="/var/backups/nhatrang-map"
CONTAINER_NAME="nhatrang-map-db-1"   # adjust if your compose project name differs
DB_NAME="${POSTGRES_DB:-nhatrang_map}"
DB_USER="${POSTGRES_USER:-postgres}"
KEEP_DAYS=14

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/nhatrang_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting backup → $BACKUP_FILE"

docker exec "$CONTAINER_NAME" \
  pg_dump -U "$DB_USER" "$DB_NAME" \
  | gzip > "$BACKUP_FILE"

echo "[$(date)] Backup done: $(du -sh "$BACKUP_FILE" | cut -f1)"

# Remove backups older than KEEP_DAYS days
find "$BACKUP_DIR" -name "nhatrang_*.sql.gz" -mtime +"$KEEP_DAYS" -delete
echo "[$(date)] Old backups cleaned (kept last $KEEP_DAYS days)"

#!/bin/bash
set -e

TARGET_TYPE=$1
TARGET_HOST=$2
TARGET_PORT=$3
TARGET_DB=$4
TARGET_USER=$5
TARGET_PASSWORD=$6

# Configuration
BACKUP_DIR="/home/ubuntu/backups"
BACKUP_FILENAME="db_backup.dump"
LOCAL_BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILENAME"
CONTAINER_BACKUP_PATH="/tmp/$BACKUP_FILENAME"

# Restore
echo "🔁 Restoring to $TARGET_TYPE..."

if [ ! -f "$LOCAL_BACKUP_PATH" ]; then
  echo "❌ Backup file not found at $LOCAL_BACKUP_PATH"
  exit 1
fi

if [ "$TARGET_TYPE" = "docker" ]; then
  docker cp "$LOCAL_BACKUP_PATH" "$TARGET_HOST:$CONTAINER_BACKUP_PATH"

  docker exec "$TARGET_HOST" pg_restore \
    --no-owner --no-acl \
    -U "$TARGET_USER" \
    -d "$TARGET_DB" \
    -c "$CONTAINER_BACKUP_PATH"

elif [ "$TARGET_TYPE" = "rds" ]; then
  echo "🔁 Restoring to RDS..."
  export PGPASSWORD="$TARGET_PASSWORD"

  if ! psql "host=$TARGET_HOST port=$TARGET_PORT user=$TARGET_USER password=$TARGET_PASSWORD dbname=$TARGET_DB sslmode=require" -c '\q'; then
    echo "❌ Could not connect to target RDS."
    exit 1
  fi

  pg_restore \
    --no-owner --no-acl \
    --no-password \
    -h "$TARGET_HOST" \
    -p "$TARGET_PORT" \
    -U "$TARGET_USER" \
    -d "$TARGET_DB" \
    -c "$LOCAL_BACKUP_PATH"
else
  echo "❌ Invalid target type: $TARGET_TYPE"
  exit 1
fi

# Cleanup container files
if [ "$TARGET_TYPE" = "docker" ]; then
  docker exec "$TARGET_HOST" rm -f "$CONTAINER_BACKUP_PATH" || true
fi

echo "✅ Restore complete."
exit 0

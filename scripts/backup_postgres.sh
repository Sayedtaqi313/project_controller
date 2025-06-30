#!/bin/bash
set -e

SOURCE_TYPE=$1
SOURCE_HOST=$2
SOURCE_PORT=$3
SOURCE_DB=$4
SOURCE_USER=$5
SOURCE_PASSWORD=$6

# Configuration
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p "$BACKUP_DIR"
chmod 777 "$BACKUP_DIR"

# File paths
BACKUP_FILENAME="db_backup.dump"
LOCAL_BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILENAME"
CONTAINER_BACKUP_PATH="/tmp/$BACKUP_FILENAME"

# Backup
echo "📦 Backing up from $SOURCE_TYPE..."

if [ "$SOURCE_TYPE" = "docker" ]; then
  echo "📦 Backing up from Docker..."

  docker exec "$SOURCE_HOST" rm -f "$CONTAINER_BACKUP_PATH" || true

  docker exec "$SOURCE_HOST" pg_dump \
    --no-owner --no-acl \
    -U "$SOURCE_USER" \
    -F c \
    -d "$SOURCE_DB" \
    -f "$CONTAINER_BACKUP_PATH"

  docker cp "$SOURCE_HOST:$CONTAINER_BACKUP_PATH" "$LOCAL_BACKUP_PATH"

  if [ ! -f "$LOCAL_BACKUP_PATH" ]; then
    echo "❌ Failed to create backup file at $LOCAL_BACKUP_PATH"
    exit 1
  fi

elif [ "$SOURCE_TYPE" = "rds" ]; then
  echo "🐘 Backing up from RDS..."
  export PGPASSWORD="$SOURCE_PASSWORD"

  pg_dump \
    --no-owner --no-acl \
    -h "$SOURCE_HOST" \
    -p "$SOURCE_PORT" \
    -U "$SOURCE_USER" \
    -F c \
    -d "$SOURCE_DB" \
    -f "$LOCAL_BACKUP_PATH"
else
  echo "❌ Invalid source type: $SOURCE_TYPE"
  exit 1
fi

echo "✅ Backup complete. File saved to $LOCAL_BACKUP_PATH"
exit 0

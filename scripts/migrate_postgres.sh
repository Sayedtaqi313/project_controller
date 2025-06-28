#!/bin/bash
set -e

SOURCE_TYPE=$1
TARGET_TYPE=$2
SOURCE_HOST=$3
SOURCE_PORT=$4
SOURCE_DB=$5
SOURCE_USER=$6
SOURCE_PASSWORD=$7
TARGET_HOST=$8
TARGET_PORT=$9
TARGET_DB=${10}
TARGET_USER=${11}
TARGET_PASSWORD=${12}

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
  
  # Cleanup any existing backup in container
  docker exec $SOURCE_HOST rm -f "$CONTAINER_BACKUP_PATH" || true
  
  # Create dump inside container
  docker exec $SOURCE_HOST pg_dump \
    --no-owner --no-acl \
    -U "$SOURCE_USER" \
    -F c \
    -d "$SOURCE_DB" \
    -f "$CONTAINER_BACKUP_PATH"
  
  # Copy from container to host
  docker cp "$SOURCE_HOST:$CONTAINER_BACKUP_PATH" "$LOCAL_BACKUP_PATH"
  
  # Verify backup was created
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

# Restore
echo "🔁 Restoring to $TARGET_TYPE..."
if [ "$TARGET_TYPE" = "docker" ]; then
  # Copy to container
  docker cp "$LOCAL_BACKUP_PATH" "$TARGET_HOST:$CONTAINER_BACKUP_PATH"
  
  # Restore from backup
  docker exec "$TARGET_HOST" pg_restore \
    --no-owner --no-acl \
    -U "$TARGET_USER" \
    -d "$TARGET_DB" \
    -c "$CONTAINER_BACKUP_PATH"

elif [ "$TARGET_TYPE" = "rds" ]; then
  echo "🔁 Restoring to RDS..."
  export PGPASSWORD="$TARGET_PASSWORD"
  # Connection test
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

# Cleanup
rm -f "$LOCAL_BACKUP_PATH"
if [ "$SOURCE_TYPE" = "docker" ]; then
  docker exec "$SOURCE_HOST" rm -f "$CONTAINER_BACKUP_PATH" || true
fi
if [ "$TARGET_TYPE" = "docker" ]; then
  docker exec "$TARGET_HOST" rm -f "$CONTAINER_BACKUP_PATH" || true
fi

echo "✅ Migration complete."
exit 0
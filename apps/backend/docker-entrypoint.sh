#!/bin/sh
set -e

SCHEMA="prisma/schema.prisma"
STORAGE_DIR="/app/apps/backend/storage"

# Fix storage permissions (handles Docker volume mounts that override image ownership)
echo "=== Fixing storage permissions ==="
mkdir -p "$STORAGE_DIR/logos" "$STORAGE_DIR/chat" "$STORAGE_DIR/website-images" 2>/dev/null || true
mkdir -p /app/apps/backend/uploads /app/apps/backend/logs 2>/dev/null || true
chown -R appuser:appgroup "$STORAGE_DIR" /app/apps/backend/uploads /app/apps/backend/logs 2>/dev/null || true

# Verify write permissions as appuser
if gosu appuser touch "$STORAGE_DIR/.write-test" 2>/dev/null; then
  rm -f "$STORAGE_DIR/.write-test"
  echo "Storage permissions OK"
else
  echo "WARNING: Storage directory $STORAGE_DIR is not writable by appuser! File uploads will fail."
fi

echo "=== Running database migrations ==="
npx prisma migrate deploy --schema "$SCHEMA"

echo "=== Running database seed (idempotent) ==="
node prisma/seed.js

echo "=== Starting server as appuser ==="
exec gosu appuser node apps/backend/server.js

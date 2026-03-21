#!/bin/sh
set -e

SCHEMA="prisma/schema.prisma"

echo "=== Running database migrations ==="
npx prisma migrate deploy --schema "$SCHEMA"

echo "=== Running database seed (idempotent) ==="
node prisma/seed.js

echo "=== Starting server ==="
exec node apps/backend/server.js

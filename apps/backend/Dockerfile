FROM node:24.18.0-slim AS base
RUN apt-get update -y && apt-get install -y openssl gosu && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy root workspace + backend package manifests
COPY package.json package-lock.json ./
COPY apps/admin/package.json apps/admin/
COPY apps/backend/package.json apps/backend/
COPY apps/client-portal/package.json apps/client-portal/
COPY apps/frontend/package.json apps/frontend/
COPY apps/website/package.json apps/website/
COPY prisma.config.ts ./
COPY prisma ./prisma/

# Install all workspace dependencies (production only)
RUN npm ci --workspace apps/backend --include-workspace-root

# Generate Prisma client
RUN npx prisma generate --schema prisma/schema.prisma

# Keep only runtime dependencies in the final layer.
RUN npm prune --omit=dev --workspace apps/backend --include-workspace-root

# Copy backend source (exclude stale lock file)
COPY apps/backend apps/backend/
RUN rm -f apps/backend/package-lock.json

# Create writable directories with all expected subdirectories
RUN mkdir -p /app/apps/backend/storage/logos \
             /app/apps/backend/storage/chat \
             /app/apps/backend/storage/website-images \
             /app/apps/backend/uploads \
             /app/apps/backend/logs

# Copy entrypoint script
COPY apps/backend/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Create non-root user and set initial ownership
RUN groupadd -g 1001 appgroup && useradd -u 1001 -g appgroup -s /bin/sh appuser
RUN chmod -R a+rX /app/apps/backend \
    && chown -R appuser:appgroup /app/apps/backend/storage /app/apps/backend/uploads /app/apps/backend/logs

# Fail the build if source permissions would prevent the runtime user from loading the app.
RUN gosu appuser node -e "require('./apps/backend/src/lib/redis')"

# Entrypoint runs as root to fix volume permissions, then drops to appuser
EXPOSE 5000

CMD ["/app/docker-entrypoint.sh"]

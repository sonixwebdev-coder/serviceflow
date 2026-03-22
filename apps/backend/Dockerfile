FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl gosu && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy root workspace + backend package manifests
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY prisma ./prisma/

# Install all workspace dependencies (production only)
RUN npm ci --omit=dev

# Generate Prisma client
RUN npx prisma generate --schema prisma/schema.prisma

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
RUN chown -R appuser:appgroup /app/apps/backend/storage /app/apps/backend/uploads /app/apps/backend/logs

# Entrypoint runs as root to fix volume permissions, then drops to appuser
EXPOSE 3000

CMD ["/app/docker-entrypoint.sh"]

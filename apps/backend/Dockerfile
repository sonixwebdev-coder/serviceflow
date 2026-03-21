FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
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

# Create writable directories (storage, uploads, logs)
RUN mkdir -p /app/apps/backend/storage /app/apps/backend/uploads /app/apps/backend/logs

# Copy entrypoint script
COPY apps/backend/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Non-root user
RUN groupadd -g 1001 appgroup && useradd -u 1001 -g appgroup -s /bin/sh appuser
RUN chown -R appuser:appgroup /app/apps/backend/storage /app/apps/backend/uploads /app/apps/backend/logs
USER appuser

EXPOSE 3000

CMD ["/app/docker-entrypoint.sh"]
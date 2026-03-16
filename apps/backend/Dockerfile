FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Copy backend package.json
COPY apps/backend/package.json apps/backend/

# Install production dependencies only
RUN npm ci --workspace apps/backend --include-workspace-root --omit=dev

# Generate Prisma client
RUN npx prisma generate --schema prisma/schema.prisma

# Copy backend source
COPY apps/backend apps/backend/

# Create storage directories
RUN mkdir -p /app/apps/backend/storage /app/apps/backend/uploads

# Non-root user
RUN groupadd -g 1001 appgroup && useradd -u 1001 -g appgroup -s /bin/sh appuser
RUN chown -R appuser:appgroup /app/apps/backend/storage /app/apps/backend/uploads
USER appuser

EXPOSE 3000

CMD ["node", "apps/backend/server.js"]

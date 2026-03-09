FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Copy backend package.json
COPY apps/backend/package.json apps/backend/

# Install dependencies
RUN npm ci --workspace apps/backend --include-workspace-root

# Generate Prisma client
RUN npx prisma generate --schema prisma/schema.prisma

# Copy backend source
COPY apps/backend apps/backend/

EXPOSE 5000

CMD ["node", "apps/backend/server.js"]

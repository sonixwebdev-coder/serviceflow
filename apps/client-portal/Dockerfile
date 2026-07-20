FROM node:24.18.0-slim AS build
WORKDIR /app

ARG VITE_API_URL=http://localhost:5000/api
ARG VITE_WS_URL=http://localhost:5000
ARG VITE_FRONTEND_URL=http://localhost:5173
ARG VITE_WEBSITE_BASE_URL=http://localhost:5175
ARG VITE_PLATFORM_NAME=ServiceFlow
ARG VITE_PLATFORM_URL=http://localhost:5173
ARG VITE_PLATFORM_CONTACT_EMAIL=contact@example.com
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL
ENV VITE_WEBSITE_BASE_URL=$VITE_WEBSITE_BASE_URL
ENV VITE_PLATFORM_NAME=$VITE_PLATFORM_NAME
ENV VITE_PLATFORM_URL=$VITE_PLATFORM_URL
ENV VITE_PLATFORM_CONTACT_EMAIL=$VITE_PLATFORM_CONTACT_EMAIL

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/admin/package.json apps/admin/
COPY apps/client-portal/package.json apps/client-portal/
COPY apps/frontend/package.json apps/frontend/
COPY apps/website/package.json apps/website/
COPY packages/runtime-config packages/runtime-config/
RUN npm ci --workspace apps/client-portal --include-workspace-root

COPY apps/client-portal apps/client-portal/
RUN npm run build --workspace apps/client-portal

FROM nginxinc/nginx-unprivileged:alpine
COPY --chown=101:101 apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --chown=101:101 --chmod=755 docker/runtime-config.sh /docker-entrypoint.d/40-serviceflow-config.sh
COPY --chown=101:101 --from=build /app/apps/client-portal/dist /usr/share/nginx/html
EXPOSE 8080

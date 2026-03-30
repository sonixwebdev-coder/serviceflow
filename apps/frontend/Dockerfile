FROM node:20-slim AS build
WORKDIR /app

ARG VITE_API_URL=https://api.forja.it.com/api
ARG VITE_SOCKET_URL=wss://api.forja.it.com
ARG VITE_CLIENT_PORTAL_URL=https://portal.forja.it.com
ARG VITE_WEBSITE_BASE_URL=https://site.forja.it.com
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_CLIENT_PORTAL_URL=$VITE_CLIENT_PORTAL_URL
ENV VITE_WEBSITE_BASE_URL=$VITE_WEBSITE_BASE_URL

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/
RUN npm ci --workspace apps/frontend --include-workspace-root

COPY apps/frontend apps/frontend/
RUN npm run build --workspace apps/frontend

FROM nginx:alpine
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80

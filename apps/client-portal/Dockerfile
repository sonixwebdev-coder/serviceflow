FROM node:20-slim AS build
WORKDIR /app

ARG VITE_API_URL=https://api.forja.it.com/api
ARG VITE_WS_URL=wss://api.forja.it.com
ARG VITE_FRONTEND_URL=https://app.forja.it.com
ARG VITE_WEBSITE_BASE_URL=https://site.forja.it.com
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL
ENV VITE_WEBSITE_BASE_URL=$VITE_WEBSITE_BASE_URL

COPY package.json package-lock.json ./
COPY apps/client-portal/package.json apps/client-portal/
RUN npm ci --workspace apps/client-portal --include-workspace-root

COPY apps/client-portal apps/client-portal/
RUN npm run build --workspace apps/client-portal

FROM nginx:alpine
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/client-portal/dist /usr/share/nginx/html
EXPOSE 80

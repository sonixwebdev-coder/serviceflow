FROM node:20-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/client-portal/package.json apps/client-portal/
RUN npm ci --workspace apps/client-portal --include-workspace-root

COPY apps/client-portal apps/client-portal/
RUN npm run build --workspace apps/client-portal

FROM nginx:alpine
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/client-portal/dist /usr/share/nginx/html
EXPOSE 80

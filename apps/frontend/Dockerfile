FROM node:20-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/
RUN npm ci --workspace apps/frontend --include-workspace-root

COPY apps/frontend apps/frontend/
RUN npm run build --workspace apps/frontend

FROM nginx:alpine
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80

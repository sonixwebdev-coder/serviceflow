FROM node:20-slim AS build
WORKDIR /app

ARG VITE_API_URL=https://api.forja.it.com
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json ./
COPY apps/admin/package.json apps/admin/
RUN npm ci --workspace apps/admin --include-workspace-root

COPY apps/admin apps/admin/
RUN npm run build --workspace apps/admin

FROM nginx:alpine
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
EXPOSE 80

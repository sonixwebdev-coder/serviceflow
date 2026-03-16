FROM node:20-slim AS build
WORKDIR /app

ARG VITE_API_URL=https://api.forja.it.com/api
ENV VITE_API_URL=$VITE_API_URL

# Website is not in root workspaces — install independently
COPY apps/website/package.json apps/website/package-lock.json* apps/website/
RUN cd apps/website && npm ci

COPY apps/website apps/website/
RUN cd apps/website && npm run build

FROM nginx:alpine
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/website/dist /usr/share/nginx/html
EXPOSE 80

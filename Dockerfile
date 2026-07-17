# Stage 1: build Vue SPA
FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY index.html ./
COPY public ./public
COPY src ./src
COPY vite.config.js jsconfig.json ./

# Baked into the client bundle at build time
ARG VITE_PUSHER_APP_KEY=
ARG VITE_PUSHER_APP_CLUSTER=ap3
ENV VITE_PUSHER_APP_KEY=$VITE_PUSHER_APP_KEY \
    VITE_PUSHER_APP_CLUSTER=$VITE_PUSHER_APP_CLUSTER

RUN pnpm build

# Stage 2: nginx static + reverse proxy /api → Hono (BACKEND_HOST)
FROM nginx:1.27-alpine

# Official image runs envsubst on /etc/nginx/templates/*.template → conf.d/
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

# envsubst only touches BACKEND_* so nginx $host / $uri stay intact
# Default: service alias on shared network boontar-live-dashboard
ENV BACKEND_HOST=backend:3000 \
    NGINX_ENVSUBST_FILTER=BACKEND

EXPOSE 80

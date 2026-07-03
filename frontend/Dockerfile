# syntax=docker/dockerfile:1

# ── Builder stage ────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Install dependencies first (cached unless package*.json change)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

# Copy source and build the production bundle
COPY . .

# Build-time environment variables for the SPA.
# Override at build time with: --build-arg VITE_API_BASE_URL=https://api.example.com/api/v1
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_APP_NAME=Klynt
ARG VITE_APP_DOMAIN=lvh.me
ARG VITE_APP_PROTOCOL=http
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_APP_NAME=${VITE_APP_NAME}
ENV VITE_APP_DOMAIN=${VITE_APP_DOMAIN}
ENV VITE_APP_PROTOCOL=${VITE_APP_PROTOCOL}

RUN bun run build

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM nginxinc/nginx-unprivileged:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built static assets
COPY --from=builder /app/dist /usr/share/nginx/html

# i18n locales are already bundled into dist/locales by the Vite build
EXPOSE 8080

USER 101

CMD ["nginx", "-g", "daemon off;"]

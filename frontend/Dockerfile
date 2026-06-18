# syntax=docker/dockerfile:1

# ── Builder stage ────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies first (cached unless package*.json change)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source and build the production bundle
COPY . .

# Build-time environment variable for the API base URL.
# Override at build time with: --build-arg VITE_API_BASE_URL=https://api.example.com/api/v1
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_APP_NAME=Klynt
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_APP_NAME=${VITE_APP_NAME}

RUN npm run build

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built static assets
COPY --from=builder /app/dist /usr/share/nginx/html

# i18n locales are already bundled into dist/locales by the Vite build
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

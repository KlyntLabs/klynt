# syntax=docker/dockerfile:1

# ── Builder stage ────────────────────────────────────────────────────────────
FROM rust:1-bookworm AS builder

WORKDIR /usr/src/klynt

# Install system dependencies (if needed in the future, e.g. libssl-dev, pkg-config)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace manifests first for better layer caching.
# Each crate manifest is copied individually so Docker preserves the directory
# structure and cargo can resolve the workspace dependency graph.
COPY Cargo.toml Cargo.lock ./
COPY crates/base/Cargo.toml crates/base/
COPY crates/shared/domain/Cargo.toml crates/shared/domain/
COPY crates/infra/config/Cargo.toml crates/infra/config/
COPY crates/infra/persistence/Cargo.toml crates/infra/persistence/
COPY crates/infra/observability/Cargo.toml crates/infra/observability/
COPY crates/services/auth_service/Cargo.toml crates/services/auth_service/
COPY crates/services/session_service/Cargo.toml crates/services/session_service/
COPY crates/services/user_service/Cargo.toml crates/services/user_service/
COPY crates/gateways/Cargo.toml crates/gateways/
COPY crates/server/Cargo.toml crates/server/

# Create stub source files so cargo can build the dependency graph and cache deps
RUN mkdir -p \
    crates/base/src \
    crates/shared/domain/src \
    crates/infra/config/src \
    crates/infra/persistence/src \
    crates/infra/observability/src \
    crates/services/auth_service/src \
    crates/services/session_service/src \
    crates/services/user_service/src \
    crates/gateways/src \
    crates/server/src && \
    echo 'fn main() {}' > crates/server/src/main.rs && \
    echo '' > crates/base/src/lib.rs && \
    echo '' > crates/shared/domain/src/lib.rs && \
    echo '' > crates/infra/config/src/lib.rs && \
    echo '' > crates/infra/persistence/src/lib.rs && \
    echo '' > crates/infra/observability/src/lib.rs && \
    echo '' > crates/services/auth_service/src/lib.rs && \
    echo '' > crates/services/session_service/src/lib.rs && \
    echo '' > crates/services/user_service/src/lib.rs && \
    echo '' > crates/gateways/src/lib.rs && \
    echo '' > crates/server/src/lib.rs

# Build dependencies (this layer is cached unless Cargo manifests change)
RUN cargo build --release --bin server

# Now copy the real source code, config, and migrations
COPY crates ./crates
COPY config ./config
COPY migrations ./migrations

# Force Cargo to re-evaluate all local source files (Docker COPY preserves
# original mtimes, so without this the stub library crates may stay cached).
RUN find crates -type f -exec touch {} +

# Build the release binary
RUN cargo build --release --bin server

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime certs and healthcheck tooling (kept for future HTTPS/outbound calls)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the compiled binary and default config
COPY --from=builder /usr/src/klynt/target/release/server ./server
COPY --from=builder /usr/src/klynt/config ./config

# The backend must bind to all interfaces inside the container
ENV KLYNT_API_HOST=0.0.0.0
ENV KLYNT_API_PORT=3001

EXPOSE 3001

USER nobody

CMD ["./server"]

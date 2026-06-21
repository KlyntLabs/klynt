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
COPY crates/klynt-domain/Cargo.toml crates/klynt-domain/
COPY crates/klynt-application/Cargo.toml crates/klynt-application/
COPY crates/klynt-infrastructure/Cargo.toml crates/klynt-infrastructure/
COPY crates/klynt-api/Cargo.toml crates/klynt-api/
COPY crates/klynt-server/Cargo.toml crates/klynt-server/

# Create stub source files so cargo can build the dependency graph and cache deps
RUN mkdir -p crates/klynt-domain/src crates/klynt-application/src \
    crates/klynt-infrastructure/src crates/klynt-api/src crates/klynt-server/src && \
    echo 'fn main() {}' > crates/klynt-server/src/main.rs && \
    echo '' > crates/klynt-domain/src/lib.rs && \
    echo '' > crates/klynt-application/src/lib.rs && \
    echo '' > crates/klynt-infrastructure/src/lib.rs && \
    echo '' > crates/klynt-api/src/lib.rs && \
    echo '' > crates/klynt-server/src/lib.rs

# Build dependencies (this layer is cached unless Cargo manifests change)
RUN cargo build --release --bin klynt-server

# Now copy the real source code, config, and migrations
COPY crates ./crates
COPY config ./config
COPY migrations ./migrations

# Force Cargo to re-evaluate all local source files (Docker COPY preserves
# original mtimes, so without this the stub library crates may stay cached).
RUN find crates -type f -exec touch {} +

# Build the release binary
RUN cargo build --release --bin klynt-server

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime certs and healthcheck tooling (kept for future HTTPS/outbound calls)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the compiled binary and default config
COPY --from=builder /usr/src/klynt/target/release/klynt-server ./klynt-server
COPY --from=builder /usr/src/klynt/config ./config

# The backend must bind to all interfaces inside the container
ENV KLYNT_API_HOST=0.0.0.0
ENV KLYNT_API_PORT=3001

EXPOSE 3001

USER nobody

CMD ["./klynt-server"]

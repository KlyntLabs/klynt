# server — Binary Entry Point

## Overview

Minimal binary entry point for the Klynt backend server. Loads configuration, wires dependencies, and starts the HTTP server.

## Structure

```
server/
├── src/
│   └── main.rs              # Entry point
└── Cargo.toml
```

## Responsibilities

### 1. Configuration Loading

Load from environment and config files:

```rust
let config = Config::from_env()?;
```

### 2. Dependency Initialization

Initialize database pool, Redis, and services:

```rust
let pool = PgPool::connect(&config.database.url).await?;
let redis_client = RedisClient::open(&config.redis_url)?;
let services = build_services(&config, pool, redis_client).await?;
```

### 3. Server Startup

Configure and start Axum server:

```rust
let app = Router::new()
    .nest("/api/v1", api_routes())
    .layer(middleware...)
    .with_state(services);

let listener = TcpListener::bind(&config.api.bind_address).await?;
axum::serve(listener, app).await?;
```

## When to Modify This Crate

**DO** modify when:
- Changing server startup configuration
- Adding global middleware (tracing, etc.)
- Modifying bind address/host configuration

**DON'T** modify when:
- Adding route handlers (belongs in gateways)
- Changing business logic (belongs in services)
- Modifying dependency wiring (belongs in gateways)

## Environment Variables

Required variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Postgres connection | `postgresql://klynt:klynt@localhost:5432/klynt` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |

Optional variables (with defaults):

| Variable | Description | Default |
|----------|-------------|---------|
| `KLYNT_API__HOST` | Bind host | `127.0.0.1` |
| `KLYNT_API__PORT` | Bind port | `3000` |
| `KLYNT_API__BASE_URL` | Base URL for links | `https://klynt.edu` |
| `RUST_LOG` | Log level | `info` |

## Running the Server

```bash
# Development
cargo run --bin server

# Production
cargo build --release --bin server
./target/release/server

# With custom port
KLYNT_API__PORT=8080 cargo run --bin server
```

## Binary Configuration

Cargo.toml configuration:

```toml
[[bin]]
name = "server"
path = "src/main.rs"

[package]
name = "server"
version.workspace = true
edition.workspace = true
```

## Dependencies

- `gateways` — HTTP handlers and wiring
- `tokio` — Async runtime
- `dotenvy` — Environment variable loading
- `anyhow` — Error handling in main

## Graceful Shutdown

The server handles graceful shutdown via Tokio signals:

```rust
axum::serve(listener, app)
    .with_graceful_shutdown(shutdown_signal())
    .await?;
```

## Related Documentation

- [Backend AGENTS.md](../../AGENTS.md) — Overall architecture
- [gateways AGENTS.md](../gateways/AGENTS.md) — HTTP gateway details

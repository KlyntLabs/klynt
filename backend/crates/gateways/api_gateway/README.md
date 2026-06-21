# API Gateway

HTTP entry point for the Klynt platform.

## Design

The gateway is a **deep module**: a single public function, `run(config, services)`,
starts the entire HTTP server. All HTTP concerns—routing, middleware, request/response
formatting, CORS, security headers, and request IDs—live inside this crate.

The gateway contains **no business logic**. All business rules are delegated to
services (currently `auth_service`), which are injected via [`state::Services`].

## Structure

```
api_gateway/
├── src/
│   ├── lib.rs              # Public interface: run() and create_router()
│   ├── state/
│   │   ├── mod.rs          # Gateway Config
│   │   └── services.rs     # Composition root: wires auth_service adapters
│   ├── routes/
│   │   ├── mod.rs          # Router assembly
│   │   ├── auth.rs         # Auth HTTP handlers
│   │   ├── health.rs       # Health check
│   │   └── openapi.rs      # OpenAPI spec endpoint
│   ├── middleware/
│   │   ├── mod.rs
│   │   ├── auth.rs         # Authentication middleware
│   │   ├── cors.rs         # CORS layer
│   │   ├── request_id.rs   # Request ID injection
│   │   ├── error_handler.rs # Error response handling
│   │   └── security_headers.rs # Security response headers
│   ├── error.rs            # Gateway error types
│   └── response.rs         # Response helpers
└── openapi.yaml            # OpenAPI specification
```

## Usage

```rust
use api_gateway::{run, Config, Services};

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    dotenvy::dotenv().ok();
    let config = Config::from_env()?;
    let services = Services::from_config(&config).await?;
    run(config, services).await?;
    Ok(())
}
```

## Testing

```bash
cargo test -p api_gateway
cargo clippy -p api_gateway --tests -- -D warnings
```

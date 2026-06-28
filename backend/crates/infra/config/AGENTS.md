# config — Configuration Loading

## Overview

Infrastructure crate for loading and validating application configuration from files and environment variables.

## Structure

```
config/
├── src/
│   ├── lib.rs              # Config loading and types
│   ├── api.rs              # API configuration
│   ├── database.rs         # Database configuration
│   └── redis.rs            # Redis configuration
└── Cargo.toml
```

## Configuration Hierarchy

Configuration is loaded in this order (later overrides earlier):

1. Default values in code
2. Configuration file (`config/settings.{toml,yaml,json}`)
3. Environment variables

## Config Structure

```rust
pub struct Config {
    pub api: ApiConfig,
    pub database: DatabaseConfig,
    pub redis: Option<RedisConfig>,
    pub telemetry: TelemetryConfig,
}
```

### API Configuration

| Field | Description | Default |
|-------|-------------|---------|
| `host` | Bind address | `127.0.0.1` |
| `port` | Bind port | `3000` |
| `base_url` | Base URL for email links | Required |
| `cors_origins` | Allowed CORS origins | `[]` |

### Database Configuration

| Field | Description | Default |
|-------|-------------|---------|
| `url` | Connection string | Required |
| `max_connections` | Pool max size | `10` |
| `min_connections` | Pool min size | `1` |

### Redis Configuration

| Field | Description | Default |
|-------|-------------|---------|
| `url` | Connection string | Optional |
| `max_connections` | Pool max size | `10` |

## When to Use This Crate

**DO** use when:
- Bootstrapping the application
- Need configuration values
- Validating environment setup

**DON'T** use when:
- Writing service logic (pass config as values, not the crate)
- Need runtime config reloading (not supported)

## Usage

```rust
use config::load_config;

let config = load_config()?;
let pool = PgPool::connect(&config.database.url).await?;
```

## Environment Variables

Config can be overridden via environment variables using the `__` separator:

```bash
export KLYNT_API__PORT=8080
export KLYNT_DATABASE__URL=postgresql://...
export KLYNT_REDIS__URL=redis://localhost:6379
```

## Validation

Configuration is validated at load time:

```rust
impl Config {
    pub fn validate(&self) -> Result<(), ConfigError> {
        if self.api.base_url.is_empty() {
            return Err(ConfigError::MissingField("api.base_url"));
        }
        // ... other validations
    }
}
```

## Dependencies

- `config` — Configuration file parsing
- `serde` — Serialization/deserialization
- `thiserror` — Error types

## Related Documentation

- [Backend AGENTS.md](../../../AGENTS.md) — Overall architecture
- [Backend README](../../../README.md) — Environment variable reference

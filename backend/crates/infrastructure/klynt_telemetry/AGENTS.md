# klynt_telemetry — Tracing, Audit, Metrics, Health

## Overview

Infrastructure crate providing **observability primitives**: tracing setup, audit logging, metrics, and health-check implementations of `klynt_base` ports.

## Structure

```
klynt_telemetry/
├── src/
│   ├── tracing.rs          # Tracing subscriber setup
│   ├── audit.rs            # AuditLogger implementation
│   ├── health.rs           # Health check port implementations
│   ├── metrics.rs          # Metrics collection
│   └── lib.rs
└── Cargo.toml
```

## Responsibilities

### 1. Tracing Setup

Configures `tracing-subscriber` with:
- Structured logging (JSON or pretty)
- Error chain tracking via `tracing-error`
- OpenTelemetry integration (future)

### 2. Audit Logging

Implements `AuditLogger` port:

```rust
#[async_trait]
impl AuditLogger for PgAuditLogger {
    async fn log_event(&self, event: AuditEvent) -> Result<(), AuditError> {
        // Write to audit_events table
    }
}
```

**Audit Events Tracked:**
- User registration
- Login attempts (success/failure)
- Email verification
- Password reset requests
- Profile changes
- Permission escalations

### 3. Health Checks

Implements health-check ports for:
- Database connectivity
- Redis connectivity
- Application status

### 4. Metrics

Collects:
- Request latency histograms
- Request counts by endpoint
- Error rates
- Active sessions gauge

## When to Use This Crate

**DO** use when:
- Wiring observability in the gateway
- Adding audit logging to a service
- Implementing health checks
- Adding metrics/tracing to infrastructure

**DON'T** use when:
- Writing service unit tests (use testkit fakes)
- Need domain logic (belongs in domain/services)

## AuditEvent Structure

```rust
pub struct AuditEvent {
    pub id: Uuid,
    pub actor: Option<UserId>,
    pub action: String,
    pub resource_type: String,
    pub resource_id: Option<String>,
    pub timestamp: DateTime<Utc>,
    pub metadata: serde_json::Value,
}
```

## Initialization

In gateway composition root:

```rust
use klynt_telemetry::{init_tracing, PgAuditLogger};

fn init_telemetry(config: &Config) -> Result<AuditLogger> {
    init_tracing(&config.service_name, &config.log_level);
    Ok(Arc::new(PgAuditLogger::new(db_pool)))
}
```

## Health Check Pattern

```rust
use klynt_base::ports::HealthCheck;

pub struct DbHealthCheck {
    pool: PgPool,
}

impl HealthCheck for DbHealthCheck {
    async fn check(&self) -> Result<(), HealthError> {
        self.pool.acquire().await?;
        Ok(())
    }
}
```

## Dependencies

- `klynt_base` — Port interfaces
- `klynt_domain` — Domain types
- `tracing` / `tracing-subscriber` — Tracing framework
- `tracing-error` — Error chain tracking
- `sqlx` — Database access (for audit log)
- `uuid` — IDs
- `chrono` — Timestamps
- `serde_json` — Metadata serialization

## Related Documentation

- [Backend AGENTS.md](../../../AGENTS.md) — Overall architecture
- [klynt_base AGENTS.md](../../klynt_base/AGENTS.md) — Port definitions

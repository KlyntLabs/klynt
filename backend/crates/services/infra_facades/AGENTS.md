# infra_facades — Persistence & Infrastructure Facades

## Overview

Thin aggregate types that group related port adapters so the composition root
can hand services a single object instead of many individual dependencies.

## Public Types

| Type | Purpose |
|------|---------|
| `PersistenceFacade` | Groups repository, store, and audit adapters (`UserRepository`, `SessionStore`, `AuditLogger`, etc.) |
| `InfraFacade` | Groups infrastructure adapters (`PasswordHasher`, `EmailSender`, `Clock`) |

## Structure

```
infra_facades/
├── src/
│   ├── lib.rs              # Re-exports `PersistenceFacade` and `InfraFacade`
│   ├── persistence.rs      # `PersistenceFacade` definition
│   └── infrastructure.rs   # `InfraFacade` definition
├── Cargo.toml
└── AGENTS.md
```

## Design Notes

- Depends **only** on `base` (port definitions). It intentionally knows nothing
  about concrete adapters or service logic.
- Adapters are exposed as **public fields** so the composition root stays simple
  and services can take only what they need. Consumers should not reach through
  a facade into unrelated adapters.

## Dependencies

- `base` — Port interfaces

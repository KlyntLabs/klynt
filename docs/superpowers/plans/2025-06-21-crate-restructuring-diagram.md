# Crate Restructuring Visual

## Before: 13 Crates (Split & Confused)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          GATEWAY LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│  klynt-server  │  gateways                                          │
│  (binary)      │  (HTTP + composition)                              │
└─────────────────────────────────────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SERVICES LAYER                              │
├─────────────────────────────────────────────────────────────────────┤
│  auth_service           │  user_service                            │
│  (auth deep module)      │  (user deep module)                      │
└─────────────────────────────────────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      INFRASTRUCTURE LAYER                            │
│                        (SPLIT SYSTEM)                               │
├──────────────────────────────┬──────────────────────────────────────┤
│  NEW INFRASTRUCTURE          │  OLD INFRASTRUCTURE                  │
├──────────────────────────────┼──────────────────────────────────────┤
│  klynt_storage               │  klynt-infrastructure                │
│  klynt_audit                 │  (repositories, config, email,       │
│  klynt_tracing               │   rate_limiter, password_policy)     │
│  klynt_messaging ❌          │                                      │
│  (UNUSED!)                   │                                      │
└──────────────────────────────┴──────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SHARED LAYER                                 │
│                      (3 CONFUSED CRATES)                            │
├─────────────────────────────────────────────────────────────────────┤
│  klynt_domain     │  klynt_contracts  │  klynt_utils               │
│  (errors? types?) │  (DTOs?)          │  (which utils?)           │
└─────────────────────────────────────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          CORE LAYER                                 │
├─────────────────────────────────────────────────────────────────────┤
│  klynt_core                                                          │
│  (core of what?)                                                     │
└─────────────────────────────────────────────────────────────────────┘

PROBLEMS:
  ❌ 13 crates - too many
  ❌ Infrastructure split between old/new
  ❌ 3 shared crates with unclear boundaries
  ❌ Unused klynt_messaging
  ❌ Names are ambiguous ("core of what?")
```

---

## After: 8 Crates (Clear & Simple)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          GATEWAY LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│  klynt-server                                                        │
│  (binary entry point)                                               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  gateways                                                   │  │
│  │  - HTTP routes                                              │  │
│  │  - Middleware composition                                    │  │
│  │  - Service wiring (composition root)                        │  │
│  │  - Uses: klynt_telemetry.init()                             │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SERVICES LAYER                              │
│                   (Deep Modules, Small Interfaces)                   │
├─────────────────────────────────────────────────────────────────────┤
│  auth_service              │  user_service                           │
│  - 6 public methods        │  - 5 public methods                      │
│  - 29 files inside         │  - 24 files inside                      │
│  - Uses: base, common,     │  - Uses: base, common,                  │
│         persistence,        │         persistence,                   │
│         telemetry, config   │         telemetry, config              │
└─────────────────────────────────────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      INFRASTRUCTURE LAYER                            │
│                    (Clear Purpose, 3 Crates)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ klynt_persistence│  │ klynt_telemetry  │  │ klynt_config     │ │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤ │
│  │ Storage ports    │  │ Tracing setup    │  │ Config loading   │ │
│  │ Repositories    │  │ Audit logging    │  │ Env parsing      │ │
│  │ Session store    │  │ Health checks    │  │ Validation       │ │
│  │ Rate limiting    │  │ Metrics          │  │                  │ │
│  │ Database access  │  │ Observability    │  │                  │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SHARED LAYER                                 │
│                      (1 Clear Crate)                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  klynt_common                                                │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  domain/     - Email, Pagination, PhoneNumber, etc           │  │
│  │  contracts/  - DTOs for service boundaries                   │  │
│  │  errors/     - All error types                               │  │
│  │  ids/        - UserId, SessionId, etc                        │  │
│  │  crypto/     - Crypto utilities                              │  │
│  │  time/       - Time utilities                                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          BASE LAYER                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  klynt_base                                                  │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  - ExecutionContext (caller info)                           │  │
│  │  - RequestContext (HTTP context)                            │  │
│  │  - Base trait implementations                                │  │
│  │  - Foundation types for all services                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

IMPROVEMENTS:
  ✅ 8 crates (38% reduction)
  ✅ Clear single-purpose infrastructure crates
  ✅ One shared crate (not three confused ones)
  ✅ No unused code
  ✅ Clear names (persistence, telemetry, config, base, common)
```

---

## Dependency Flow

```
                    ┌─────────────┐
                    │ klynt-server│
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  gateways   │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐    ┌─────▼─────┐    ┌─────▼─────┐
    │   auth_   │    │   user_   │    │ (future)  │
    │  service  │    │  service  │    │  services │
    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐    ┌─────▼─────┐    ┌─────▼─────┐
    │persistence│    │ telemetry │    │  config   │
    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐    ┌─────▼─────┐            
    │  common   │    │   base   │            
    └───────────┘    └──────────┘            
```

**Key Points**:
- Clear downward dependency flow (no cycles)
- Services depend on infrastructure, not vice versa
- Infrastructure depends on base/common
- Gateway composes everything together

---

## Crate Purposes (One-Liner Summary)

| Crate | Purpose | Public Size |
|-------|---------|-------------|
| `klynt-server` | Binary entry point | 1 function |
| `gateways` | HTTP gateway + composition root | 2 functions |
| `auth_service` | Authentication deep module | 6 methods |
| `user_service` | User management deep module | 5 methods |
| `klynt_persistence` | Data access & storage | ~10 items |
| `klynt_telemetry` | Observability & tracing | ~5 items |
| `klynt_config` | Configuration loading | ~5 items |
| `klynt_common` | All shared types | ~25 items |
| `klynt_base` | Foundation types & context | ~10 items |

---

**File**: `docs/superpowers/plans/2025-06-21-crate-restructuring-diagram.md`

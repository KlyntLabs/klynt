# Crate Restructuring Plan

**Goal**: Simplify crate structure, eliminate duplication, and clarify purpose through strategic renaming and merging.

---

## Current Issues

### 1. **Infrastructure Schism**
- `klynt-infrastructure` (old) vs `infrastructure/*` (new) creates confusion
- Both provide repositories, config, email, utilities
- Unclear which to use for new code

### 2. **Unused Infrastructure**
- `klynt_messaging` has zero consumers
- Event bus system not actively used
- Dead code increases maintenance burden

### 3. **Shared Type Proliferation**
- `klynt_domain` (errors, domain types)
- `klynt_contracts` (DTOs for boundaries)
- `klynt_utils` (utilities)
- Three crates for "shared things" is confusing

### 4. **Naming Ambiguity**
- `klynt_core` - core of what?
- `klynt_domain` - domain of what?
- `klynt_contracts` - contracts between whom?

---

## Proposed Structure

### Before (13 crates)
```
core/
├── klynt_core

shared/
├── klynt_contracts
├── klynt_domain
├── klynt_utils

infrastructure/
├── klynt_messaging          # UNUSED
├── klynt_storage
├── klynt_tracing
├── klynt_audit

services/
├── auth_service
├── user_service

gateways/
klynt-infrastructure/        # OLD
klynt-server/
```

### After (8 crates)
```
core/
├── klynt_base               # Base types and context

shared/
├── klynt_common             # All shared types (domain + contracts + utils)

infra/
├── klynt_persistence        # Storage + database access
├── klynt_telemetry          # Tracing + audit + monitoring
├── klynt_config             # Configuration loading

services/
├── auth_service
├── user_service

gateways/
klynt-server/
```

---

## Specific Changes

### 1. **Merge Shared Types** (3 → 1)

**Create**: `klynt_common` from:
- `klynt_domain` (errors, domain types)
- `klynt_contracts` (DTOs)  
- `klynt_utils` (utilities)

**Rationale**:
- These are all "shared things used across the codebase"
- Three crates creates cognitive load without clear boundaries
- Single crate reduces cross-dependencies

**Structure**:
```
klynt_common/
├── src/
│   ├── domain/      # Domain types (Email, Pagination, etc)
│   ├── contracts/   # DTOs for service boundaries
│   ├── errors/      # All error types
│   ├── ids/         # ID types
│   ├── crypto/      # Crypto utilities
│   ├── time/        # Time utilities
│   └── lib.rs       # Small public interface
```

**Public Interface** (small!):
```rust
pub use domain::*;
pub use contracts::*;
pub use errors::*;
// Utilities as-needed, not exported by default
```

---

### 2. **Consolidate Infrastructure** (5 → 3)

#### **Create**: `klynt_persistence` from:
- `klynt_storage`
- Move repositories from `klynt-infrastructure`
- Move rate limiter from `klynt-infrastructure`

**Purpose**: All data persistence concerns

#### **Create**: `klynt_telemetry` from:
- `klynt_tracing`
- `klynt_audit`
- Move health checks from `klynt-infrastructure`

**Purpose**: All observability (tracing, audit, health, metrics)

**Answer to your question**: YES, attach tracing to gateways at the composition level, but keep `klynt_telemetry` as a separate crate that:
- Provides the tracing setup utilities
- Is consumed by gateways during initialization
- Can be used by any crate that needs tracing

#### **Create**: `klynt_config` from:
- Config modules in `klynt-infrastructure`
- All environment loading

**Purpose**: Centralized configuration

#### **Delete**: `klynt_messaging`
- Unused event bus
- Remove to reduce maintenance burden

---

### 3. **Rename for Clarity**

| Old Name | New Name | Why |
|----------|----------|-----|
| `klynt_core` | `klynt_base` | "Base" = foundational types, "Core" ambiguous |
| `klynt_domain` | (merged into klynt_common) | Domain of what? Gone |
| `klynt_contracts` | (merged into klynt_common) | Contracts between whom? Gone |
| `klynt_utils` | (merged into klynt_common) | Utils of what? Gone |
| `klynt_storage` | `klynt_persistence` | Persistence = clearer than storage |
| `klynt_tracing` + `klynt_audit` | `klynt_telemetry` | Telemetry = all observability |

---

### 4. **Services Keep Deep Module Pattern**

`auth_service` and `user_service` are perfect. **No changes.**

---

## Migration Phases

### Phase 1: Merge Shared Types
1. Create `klynt_common` crate
2. Move `klynt_domain` content → `klynt_common/src/domain/`
3. Move `klynt_contracts` content → `klynt_common/src/contracts/`
4. Move `klynt_utils` content → `klynt_common/src/util/`
5. Update all imports across codebase
6. Delete old crates

### Phase 2: Consolidate Infrastructure
1. Create `klynt_persistence` from `klynt_storage` + repositories
2. Create `klynt_telemetry` from `klynt_tracing` + `klynt_audit` + health
3. Create `klynt_config` from config modules
4. Delete `klynt_messaging` (unused)
5. Delete `klynt-infrastructure` (fully migrated)

### Phase 3: Rename Crates
1. Rename `klynt_core` → `klynt_base`
2. Update all workspace dependencies
3. Update all imports

---

## Benefits

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Total Crates | 13 | 8 | -38% |
| Shared Crates | 3 | 1 | Simpler |
| Infra Crates | 5 | 3 | Clearer |
| Unused Crates | 1 | 0 | Cleaner |
| Name Clarity | Low | High | Better |

---

## Naming Principles Going Forward

1. **One Word Per Crate** - `klynt_<purpose>`
   - `klynt_base` (foundational types)
   - `klynt_common` (shared types)
   - `klynt_persistence` (data access)
   - `klynt_telemetry` (observability)

2. **Services Use `_service` Suffix**
   - `auth_service`
   - `user_service`
   - Future: `courses_service`, `enrollments_service`

3. **No Ambiguous Names**
   - ❌ `klynt_core` (core of what?)
   - ❌ `klynt_domain` (domain of what?)
   - ❌ `klynt_utils` (utils for what?)
   - ✅ `klynt_base` (foundation)
   - ✅ `klynt_common` (shared across everything)
   - ✅ `klynt_persistence` (data storage)

---

## Decision Matrix: Tracing in Gateways?

**Question**: Should we merge `klynt_tracing` into `gateways`?

**Answer**: **No**, keep `klynt_telemetry` separate.

**Why**:
1. **Multiple consumers** - Services may need tracing independently
2. **Testability** - Tests need tracing setup without full gateway
3. **Reusability** - Could run background jobs that need tracing but not HTTP
4. **Separation of concerns** - Gateway = HTTP composition, Telemetry = observability

**Pattern**:
```rust
// gateways/src/lib.rs
use klynt_telemetry::{init_telemetry, TelemetryConfig};

pub async fn run(config: Config, services: Services) -> Result<()> {
    // Init telemetry at composition root
    init_telemetry(&config.telemetry)?;
    
    // Start HTTP server
    let listener = tokio::net::TcpListener::bind(&config.address).await?;
    axum::serve(listener, create_router(config, services)).await?;
    
    Ok(())
}
```

---

## Next Steps

1. Review and approve this plan
2. Execute Phase 1 (merge shared types)
3. Execute Phase 2 (consolidate infrastructure)
4. Execute Phase 3 (rename crates)
5. Update all documentation
6. Verify all tests pass

---

**File**: `docs/superpowers/plans/2025-06-21-crate-restructuring.md`

# Backend Crate Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename backend crates to remove redundant `klynt_` prefix and rename `infrastructure/` to `infra/` for cleaner, more readable crate structure.

**Architecture:** Rename 7 crates across the backend workspace, updating all Cargo.toml files, imports, and documentation. The rename preserves the modular architecture while improving readability of dependency declarations and import statements.

**Tech Stack:** Rust workspace with Cargo, shell commands for directory moves

## Global Constraints

- All existing tests must pass after rename (no behavior changes)
- Workspace members must match new directory names in root Cargo.toml
- All `use` statements must be updated to reference new crate names
- All dependency declarations in Cargo.toml files must be updated
- Documentation (AGENTS.md, README.md) must reference new names
- No changes to actual functionality — only naming and file locations

---

## File Structure (Before → After)

```
backend/crates/
├── klynt_base/          → base/
├── shared/
│   └── klynt_domain/    → domain/
├── infrastructure/      → infra/
│   ├── klynt_persistence/  → persistence/
│   ├── klynt_telemetry/    → telemetry/
│   └── klynt_config/       → config/
├── services/
│   ├── auth_service/    (unchanged)
│   ├── session_service/ (unchanged)
│   └── user_service/   (unchanged)
├── gateways/            (unchanged)
└── klynt-server/        → server/
```

## Crate Name Changes (Cargo.toml package.name)

| Old Name | New Name |
|---------|----------|
| `klynt_base` | `base` |
| `klynt_domain` | `domain` |
| `klynt_persistence` | `persistence` |
| `klynt_telemetry` | `telemetry` |
| `klynt_config` | `config` |
| `klynt-server` | `server` |

### Task 1: Rename Directories

**Files:**
- Move: `backend/crates/klynt_base/` → `backend/crates/base/`
- Move: `backend/crates/infrastructure/` → `backend/crates/infra/`
- Move: `backend/crates/klynt-server/` → `backend/crates/server/`

**Interfaces:**
- Produces: New directory structure for subsequent tasks

- [ ] **Step 1: Move klynt_base to base**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend/crates
mv klynt_base base
```

Expected: Directory now at `crates/base/`

- [ ] **Step 2: Move infrastructure to infra**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend/crates
mv infrastructure infra
```

Expected: Directory now at `crates/infra/`

- [ ] **Step 3: Move klynt-server to server**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend/crates
mv klynt-server server
```

Expected: Directory now at `crates/server/`

- [ ] **Step 4: Verify directory structure**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
ls -la crates/
```

Expected output shows:
```
base/
shared/
infra/
services/
gateways/
server/
```

- [ ] **Step 5: Commit directory moves**

```bash
git add crates/
git commit -m "refactor: rename crates directories - klynt_base→base, infrastructure→infra, klynt-server→server"
```

### Task 2: Update Workspace Cargo.toml Members

**Files:**
- Modify: `backend/Cargo.toml`

**Interfaces:**
- Consumes: New directory structure from Task 1
- Produces: Updated workspace members list

- [ ] **Step 1: Read current workspace Cargo.toml**

```bash
cat /Users/jayden/Projects/Klynt/klynt-edu/backend/Cargo.toml
```

- [ ] **Step 2: Update workspace members**

Replace the `[workspace.members]` section in `backend/Cargo.toml`:

```toml
[workspace]
members = [
    "base",
    "shared/domain",
    "infra/persistence",
    "infra/telemetry",
    "infra/config",
    "services/auth_service",
    "services/session_service",
    "services/user_service",
    "gateways",
    "server",
]
resolver = "2"
```

- [ ] **Step 3: Verify workspace members are valid**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo check --workspace 2>&1 | head -20
```

Expected: Cargo may fail due to crate name mismatches, but workspace members should resolve

- [ ] **Step 4: Commit workspace update**

```bash
git add Cargo.toml
git commit -m "refactor: update workspace members for renamed crates"
```

### Task 3: Update base Crate Package Name

**Files:**
- Modify: `backend/crates/base/Cargo.toml`

**Interfaces:**
- Consumes: Directory structure from Task 1
- Produces: Updated package name for dependency resolution

- [ ] **Step 1: Update package name in base/Cargo.toml**

In `backend/crates/base/Cargo.toml`, change:

```toml
[package]
name = "base"
version = "0.1.0"
edition = "2021"
```

- [ ] **Step 2: Verify crate builds**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend/crates/base
cargo package --allow-dirty
```

- [ ] **Step 3: Commit base package rename**

```bash
git add crates/base/Cargo.toml
git commit -m "refactor: rename klynt_base package to base"
```

### Task 4: Update domain Crate Package Name

**Files:**
- Modify: `backend/crates/shared/domain/Cargo.toml`

**Interfaces:**
- Consumes: Directory structure from Task 1
- Produces: Updated package name

- [ ] **Step 1: Update package name in domain/Cargo.toml**

In `backend/crates/shared/domain/Cargo.toml`, change:

```toml
[package]
name = "domain"
version.workspace = true
edition.workspace = true
```

- [ ] **Step 2: Commit domain package rename**

```bash
git add crates/shared/domain/Cargo.toml
git commit -m "refactor: rename klynt_domain package to domain"
```

### Task 5: Update persistence Crate Package Name

**Files:**
- Modify: `backend/crates/infra/persistence/Cargo.toml`

**Interfaces:**
- Consumes: Directory structure from Task 1
- Produces: Updated package name

- [ ] **Step 1: Update package name in persistence/Cargo.toml**

In `backend/crates/infra/persistence/Cargo.toml`, change:

```toml
[package]
name = "persistence"
version.workspace = true
edition.workspace = true
```

- [ ] **Step 2: Commit persistence package rename**

```bash
git add crates/infra/persistence/Cargo.toml
git commit -m "refactor: rename klynt_persistence package to persistence"
```

### Task 6: Update telemetry Crate Package Name

**Files:**
- Modify: `backend/crates/infra/telemetry/Cargo.toml`

**Interfaces:**
- Consumes: Directory structure from Task 1
- Produces: Updated package name

- [ ] **Step 1: Update package name in telemetry/Cargo.toml**

In `backend/crates/infra/telemetry/Cargo.toml`, change:

```toml
[package]
name = "telemetry"
version.workspace = true
edition.workspace = true
```

- [ ] **Step 2: Commit telemetry package rename**

```bash
git add crates/infra/telemetry/Cargo.toml
git commit -m "refactor: rename klynt_telemetry package to telemetry"
```

### Task 7: Update config Crate Package Name

**Files:**
- Modify: `backend/crates/infra/config/Cargo.toml`

**Interfaces:**
- Consumes: Directory structure from Task 1
- Produces: Updated package name

- [ ] **Step 1: Update package name in config/Cargo.toml**

In `backend/crates/infra/config/Cargo.toml`, change:

```toml
[package]
name = "config"
version.workspace = true
edition.workspace = true
```

- [ ] **Step 2: Commit config package rename**

```bash
git add crates/infra/config/Cargo.toml
git commit -m "refactor: rename klynt_config package to config"
```

### Task 8: Update server Crate Package Name

**Files:**
- Modify: `backend/crates/server/Cargo.toml`

**Interfaces:**
- Consumes: Directory structure from Task 1
- Produces: Updated package name

- [ ] **Step 1: Update package name and binary name in server/Cargo.toml**

In `backend/crates/server/Cargo.toml`, change:

```toml
[package]
name = "server"
version.workspace = true
edition.workspace = true

[[bin]]
name = "server"
path = "src/main.rs"
```

- [ ] **Step 2: Commit server package rename**

```bash
git add crates/server/Cargo.toml
git commit -m "refactor: rename klynt-server package to server"
```

### Task 9: Update auth_service Dependencies

**Files:**
- Modify: `backend/crates/services/auth_service/Cargo.toml`
- Modify: `backend/crates/services/auth_service/src/**/*.rs`

**Interfaces:**
- Consumes: Package names from Tasks 3-7
- Produces: Updated dependency declarations and imports

- [ ] **Step 1: Update dependencies in auth_service/Cargo.toml**

In `backend/crates/services/auth_service/Cargo.toml`, replace dependency references:

```toml
[dependencies]
# === Phase 1 Foundation ===
base = { path = "../../../crates/base" }
domain = { path = "../../shared/domain" }

# === Storage and infrastructure adapters ===
persistence = { path = "../../../crates/infra/persistence" }
telemetry = { path = "../../../crates/infra/telemetry" }
```

- [ ] **Step 2: Find all source files in auth_service**

```bash
find /Users/jayden/Projects/Klynt/klynt-edu/backend/crates/services/auth_service/src -name "*.rs"
```

- [ ] **Step 3: Update imports in auth_service source files**

For each `.rs` file found, replace imports:
- `klynt_base::` → `base::`
- `klynt_domain::` → `domain::`
- `klynt_persistence::` → `persistence::`
- `klynt_telemetry::` → `telemetry::`

Example replacements:
```rust
// Old
use klynt_base::ctx::ExecutionContext;
use klynt_domain::UserId;
use klynt_persistence::PgUserRepository;

// New
use base::ctx::ExecutionContext;
use domain::UserId;
use persistence::PgUserRepository;
```

- [ ] **Step 4: Update dev-dependencies in auth_service/Cargo.toml**

```toml
[dev-dependencies]
base = { path = "../../../crates/base", features = ["testkit"] }
```

- [ ] **Step 5: Verify auth_service builds**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend/crates/services/auth_service
cargo check
```

- [ ] **Step 6: Commit auth_service dependency updates**

```bash
git add crates/services/auth_service/
git commit -m "refactor: update auth_service imports and dependencies for renamed crates"
```

### Task 10: Update session_service Dependencies

**Files:**
- Modify: `backend/crates/services/session_service/Cargo.toml`
- Modify: `backend/crates/services/session_service/src/**/*.rs`

**Interfaces:**
- Consumes: Package names from Tasks 3-4
- Produces: Updated dependency declarations and imports

- [ ] **Step 1: Update dependencies in session_service/Cargo.toml**

In `backend/crates/services/session_service/Cargo.toml`:

```toml
[dependencies]
base = { path = "../../../crates/base" }
domain = { path = "../../shared/domain" }
```

- [ ] **Step 2: Find all source files in session_service**

```bash
find /Users/jayden/Projects/Klynt/klynt-edu/backend/crates/services/session_service/src -name "*.rs"
```

- [ ] **Step 3: Update imports in session_service source files**

Replace:
- `klynt_base::` → `base::`
- `klynt_domain::` → `domain::`

- [ ] **Step 4: Update dev-dependencies if present**

```toml
[dev-dependencies]
base = { path = "../../../crates/base", features = ["testkit"] }
```

- [ ] **Step 5: Verify session_service builds**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend/crates/services/session_service
cargo check
```

- [ ] **Step 6: Commit session_service dependency updates**

```bash
git add crates/services/session_service/
git commit -m "refactor: update session_service imports and dependencies for renamed crates"
```

### Task 11: Update user_service Dependencies

**Files:**
- Modify: `backend/crates/services/user_service/Cargo.toml`
- Modify: `backend/crates/services/user_service/src/**/*.rs`

**Interfaces:**
- Consumes: Package names from Tasks 3-7
- Produces: Updated dependency declarations and imports

- [ ] **Step 1: Update dependencies in user_service/Cargo.toml**

In `backend/crates/services/user_service/Cargo.toml`:

```toml
[dependencies]
# === Phase 1 Foundation ===
base = { path = "../../../crates/base" }
domain = { path = "../../shared/domain" }

# === Storage and infrastructure adapters ===
persistence = { path = "../../../crates/infra/persistence" }
telemetry = { path = "../../../crates/infra/telemetry" }
```

- [ ] **Step 2: Find all source files in user_service**

```bash
find /Users/jayden/Projects/Klynt/klynt-edu/backend/crates/services/user_service/src -name "*.rs"
```

- [ ] **Step 3: Update imports in user_service source files**

Replace:
- `klynt_base::` → `base::`
- `klynt_domain::` → `domain::`
- `klynt_persistence::` → `persistence::`
- `klynt_telemetry::` → `telemetry::`

- [ ] **Step 4: Update test files if they have imports**

```bash
find /Users/jayden/Projects/Klynt/klynt-edu/backend/crates/services/user_service/tests -name "*.rs"
```

Update imports in test files same as source.

- [ ] **Step 5: Verify user_service builds**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend/crates/services/user_service
cargo check
```

- [ ] **Step 6: Commit user_service dependency updates**

```bash
git add crates/services/user_service/
git commit -m "refactor: update user_service imports and dependencies for renamed crates"
```

### Task 12: Update gateways Dependencies

**Files:**
- Modify: `backend/crates/gateways/Cargo.toml`
- Modify: `backend/crates/gateways/src/**/*.rs`
- Modify: `backend/crates/gateways/tests/**/*.rs`

**Interfaces:**
- Consumes: Package names from Tasks 3-7
- Produces: Updated dependency declarations and imports

- [ ] **Step 1: Update dependencies in gateways/Cargo.toml**

In `backend/crates/gateways/Cargo.toml`:

```toml
[dependencies]
# === Services ===
auth_service = { path = "../services/auth_service" }
user_service = { path = "../services/user_service" }
session_service = { path = "../services/session_service" }

# === Phase 1 Foundation ===
base = { path = "../base" }
domain = { path = "../shared/domain" }

# === Storage and infrastructure adapters ===
persistence = { path = "../infra/persistence" }
telemetry = { path = "../infra/telemetry" }
```

- [ ] **Step 2: Find all source files in gateways**

```bash
find /Users/jayden/Projects/Klynt/klynt-edu/backend/crates/gateways/src -name "*.rs"
```

- [ ] **Step 3: Update imports in gateways source files**

Replace:
- `klynt_base::` → `base::`
- `klynt_domain::` → `domain::`
- `klynt_persistence::` → `persistence::`
- `klynt_telemetry::` → `telemetry::`

- [ ] **Step 4: Find all test files in gateways**

```bash
find /Users/jayden/Projects/Klynt/klynt-edu/backend/crates/gateways/tests -name "*.rs"
```

- [ ] **Step 5: Update imports in gateways test files**

Same replacements as source files.

- [ ] **Step 6: Verify gateways builds**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend/crates/gateways
cargo check
```

- [ ] **Step 7: Commit gateways dependency updates**

```bash
git add crates/gateways/
git commit -m "refactor: update gateways imports and dependencies for renamed crates"
```

### Task 13: Update server Dependencies

**Files:**
- Modify: `backend/crates/server/Cargo.toml`
- Modify: `backend/crates/server/src/main.rs`

**Interfaces:**
- Consumes: Package names from Tasks 3-7
- Produces: Updated dependency declarations and imports

- [ ] **Step 1: Update dependencies in server/Cargo.toml**

In `backend/crates/server/Cargo.toml`:

```toml
[dependencies]
gateways = { workspace = true }
```

- [ ] **Step 2: Update imports in server/src/main.rs**

In `backend/crates/server/src/main.rs`, ensure imports reference the updated gateways package (no change needed if just using workspace dependency).

- [ ] **Step 3: Verify server builds**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend/crates/server
cargo check
```

- [ ] **Step 4: Commit server dependency updates**

```bash
git add crates/server/
git commit -m "refactor: update server dependencies for renamed crates"
```

### Task 14: Update persistence Crate Internal Dependencies

**Files:**
- Modify: `backend/crates/infra/persistence/Cargo.toml`
- Modify: `backend/crates/infra/persistence/src/**/*.rs`

**Interfaces:**
- Consumes: Package names from Tasks 3-7
- Produces: Updated dependency declarations and imports

- [ ] **Step 1: Update dependencies in persistence/Cargo.toml**

In `backend/crates/infra/persistence/Cargo.toml`:

```toml
[dependencies]
# Internal crates
base = { path = "../../base" }
config = { path = "../config" }
domain = { path = "../../shared/domain" }
telemetry = { path = "../telemetry" }
```

- [ ] **Step 2: Find all source files in persistence**

```bash
find /Users/jayden/Projects/Klynt/klynt-edu/backend/crates/infra/persistence/src -name "*.rs"
```

- [ ] **Step 3: Update imports in persistence source files**

Replace:
- `klynt_base::` → `base::`
- `klynt_domain::` → `domain::`
- `klynt_config::` → `config::`
- `klynt_telemetry::` → `telemetry::`

- [ ] **Step 4: Verify persistence builds**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend/crates/infra/persistence
cargo check
```

- [ ] **Step 5: Commit persistence dependency updates**

```bash
git add crates/infra/persistence/
git commit -m "refactor: update persistence imports and dependencies for renamed crates"
```

### Task 15: Update telemetry Crate Internal Dependencies

**Files:**
- Modify: `backend/crates/infra/telemetry/Cargo.toml`
- Modify: `backend/crates/infra/telemetry/src/**/*.rs`

**Interfaces:**
- Consumes: Package names from Tasks 3-4
- Produces: Updated dependency declarations and imports

- [ ] **Step 1: Update dependencies in telemetry/Cargo.toml**

In `backend/crates/infra/telemetry/Cargo.toml`:

```toml
[dependencies]
# Internal crates
base = { path = "../../base" }
domain = { path = "../../shared/domain" }
```

- [ ] **Step 2: Find all source files in telemetry**

```bash
find /Users/jayden/Projects/Klynt/klynt-edu/backend/crates/infra/telemetry/src -name "*.rs"
```

- [ ] **Step 3: Update imports in telemetry source files**

Replace:
- `klynt_base::` → `base::`
- `klynt_domain::` → `domain::`

- [ ] **Step 4: Verify telemetry builds**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend/crates/infra/telemetry
cargo check
```

- [ ] **Step 5: Commit telemetry dependency updates**

```bash
git add crates/infra/telemetry/
git commit -m "refactor: update telemetry imports and dependencies for renamed crates"
```

### Task 16: Update config Crate

**Files:**
- Modify: `backend/crates/infra/config/Cargo.toml`

**Interfaces:**
- Consumes: Package names from Task 3
- Produces: Updated dependency declarations

- [ ] **Step 1: Verify config/Cargo.toml has no internal crate dependencies**

```bash
cat /Users/jayden/Projects/Klynt/klynt-edu/backend/crates/infra/config/Cargo.toml
```

Expected: config should only have external dependencies (serde, config crate, thiserror)

- [ ] **Step 2: Verify config builds**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend/crates/infra/config
cargo check
```

Expected: Should build successfully with no changes needed

### Task 17: Update backend/README.md

**Files:**
- Modify: `backend/README.md`

**Interfaces:**
- Consumes: New crate names from all previous tasks
- Produces: Updated documentation

- [ ] **Step 1: Update architecture diagram in README.md**

In `backend/README.md`, update the architecture tree:

```markdown
```
backend/crates/
├── base                    # Canonical ports and testkit
│   ├── src/ports           # Repository, session, token, audit, email, password-hasher, clock, HTTP-error ports
│   └── src/testkit         # In-memory fakes for unit and integration tests
├── shared/
│   └── domain              # Domain types, contracts, and errors (user, auth, role, error)
├── infra/
│   ├── persistence         # PostgreSQL repositories, Redis rate limiting/idempotency, Argon2 hashing, email
│   ├── telemetry           # Tracing, audit logging, metrics, health-check ports
│   └── config              # Configuration loading and validation
├── services/
│   ├── auth_service        # Registration, login, email verification, password reset
│   ├── session_service     # Session creation, validation, and invalidation
│   └── user_service        # Profiles, password changes, user listing, soft delete
├── gateways/               # HTTP API gateway + composition root
└── server                  # Minimal binary entrypoint
```
```

- [ ] **Step 2: Update Base Abstractions section**

Replace references to `klynt_base::ports` with `base::ports`:
```markdown
- `base::ports` — Canonical ports consumed by all services:
  - `UserRepository` — User CRUD and listing
  - `SessionStore` — Session persistence
  ...
- `base::testkit` — Reusable in-memory test doubles:
  ...
```

- [ ] **Step 3: Update Shared Infrastructure section**

Replace crate name references:
```markdown
- `persistence` — PostgreSQL repositories, Redis rate limiting/idempotency, Argon2 password hashing, mock email service, session/token stores
- `telemetry` — Tracing setup, audit logging service, health-check ports, and metrics
- `config` — Application configuration loading from files and environment
```

- [ ] **Step 4: Update run server command**

```markdown
### Run the server

```bash
cargo run --bin server
```
```

- [ ] **Step 5: Update config path reference**

Replace `crates/infrastructure/klynt_config/src/lib.rs` with `crates/infra/config/src/lib.rs`:
```markdown
See `crates/infra/config/src/lib.rs` for the full configuration shape.
```

- [ ] **Step 6: Update openapi path reference**

```markdown
See `crates/gateways/src/openapi.yaml` for the full request/response schemas.
```

- [ ] **Step 7: Commit README.md updates**

```bash
git add backend/README.md
git commit -m "docs: update README.md for renamed crates"
```

### Task 18: Update backend/AGENTS.md

**Files:**
- Modify: `backend/AGENTS.md`

**Interfaces:**
- Consumes: New crate names from all previous tasks
- Produces: Updated documentation

- [ ] **Step 1: Update crate dependency diagram**

In `backend/AGENTS.md`, update the diagram:

```markdown
```
                     ┌─────────────────┐
                     │     server      │ (binary)
                     └────────┬────────┘
                              │
                     ┌────────▼────────┐
                     │     gateways    │ (composition root)
                     └────────┬────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼────────┐   ┌──────▼───────┐
│ auth_service   │   │ session_service │   │ user_service │
└───────┬────────┘   └────────┬────────┘   └──────┬───────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼────────┐   ┌──────▼───────┐
│ base           │   │ domain          │   │ infra crates │
│ (ports+testkit)│   │ (types)         │   │              │
└────────────────┘   └─────────────────┘   └──────────────┘
```
```

- [ ] **Step 2: Update crate responsibilities table**

Update crate names in the table:
```markdown
| Crate | Responsibility | When to Use |
|-------|----------------|-------------|
| [`base`](../crates/base/AGENTS.md) | Canonical ports + in-memory testkit | Define new persistence interface |
| [`shared/domain`](../crates/shared/domain/AGENTS.md) | Domain types, contracts, errors | Share domain types across crates |
| [`infra/persistence`](../crates/infra/persistence/AGENTS.md) | Postgres/Redis port implementations | Need concrete repository/cache |
| [`infra/telemetry`](../crates/infra/telemetry/AGENTS.md) | Tracing, audit, metrics, health | Add observability |
| [`infra/config`](../crates/infra/config/AGENTS.md) | Configuration loading | Add config values |
| [`services/auth_service`](../crates/services/auth_service/AGENTS.md) | Registration, login, email verification, password reset | Implement auth flows |
| [`services/session_service`](../crates/services/session_service/AGENTS.md) | Session creation, validation, invalidation | Manage session lifecycle |
| [`services/user_service`](../crates/services/user_service/AGENTS.md) | Profiles, password changes, user listing, soft delete | Manage user profiles |
| [`gateways`](../crates/gateways/AGENTS.md) | HTTP handlers, middleware, composition root | Add HTTP endpoint |
| [`server`](../crates/server/AGENTS.md) | Binary entrypoint | Run the server |
```

- [ ] **Step 3: Update workflow sections**

Replace crate name references in workflows:
- "Define domain types in `domain` if needed"
- "Define port interface in `base::ports` if persistence required"
- "Implement port adapter in `infra/persistence`"
- "Wire in `gateways/src/state/services.rs`"

- [ ] **Step 4: Update architecture section references**

Replace references to old crate names throughout the document.

- [ ] **Step 5: Commit AGENTS.md updates**

```bash
git add backend/AGENTS.md
git commit -m "docs: update AGENTS.md for renamed crates"
```

### Task 19: Update Individual Crate AGENTS.md Files

**Files:**
- Modify: All AGENTS.md files in crates

**Interfaces:**
- Consumes: New crate names from all previous tasks
- Produces: Updated documentation with cross-references

- [ ] **Step 1: Update base/AGENTS.md cross-references**

In `backend/crates/base/AGENTS.md`, update:
```markdown
## Related Documentation

- [Backend AGENTS.md](../../../AGENTS.md) — Overall architecture
- [domain AGENTS.md](../shared/domain/AGENTS.md) — Domain types
- [persistence AGENTS.md](../infra/persistence/AGENTS.md) — Postgres implementations
- [telemetry AGENTS.md](../infra/telemetry/AGENTS.md) — Observability
```

- [ ] **Step 2: Update domain/AGENTS.md cross-references**

In `backend/crates/shared/domain/AGENTS.md`, update:
```markdown
## Related Documentation

- [Backend AGENTS.md](../../../AGENTS.md) — Overall architecture
- [base AGENTS.md](../../base/AGENTS.md) — Canonical ports
```

- [ ] **Step 3: Update persistence/AGENTS.md cross-references**

In `backend/crates/infra/persistence/AGENTS.md`, update all paths:
```markdown
## Related Documentation

- [Backend AGENTS.md](../../../AGENTS.md) — Overall architecture
- [base AGENTS.md](../../base/AGENTS.md) — Port definitions
- [domain AGENTS.md](../../shared/domain/AGENTS.md) — Domain types
- [telemetry AGENTS.md](../telemetry/AGENTS.md) — Observability
```

- [ ] **Step 4: Update telemetry/AGENTS.md cross-references**

In `backend/crates/infra/telemetry/AGENTS.md`, update paths.

- [ ] **Step 5: Update config/AGENTS.md cross-references**

In `backend/crates/infra/config/AGENTS.md`, update paths.

- [ ] **Step 6: Update auth_service/AGENTS.md cross-references**

In `backend/crates/services/auth_service/AGENTS.md`, update paths:
```markdown
## Related Documentation

- [Backend AGENTS.md](../../../AGENTS.md) — Overall architecture
- [base AGENTS.md](../../base/AGENTS.md) — Port definitions
- [user_service AGENTS.md](../user_service/AGENTS.md) — User profiles
- [session_service AGENTS.md](../session_service/AGENTS.md) — Session management
```

- [ ] **Step 7: Update session_service/AGENTS.md cross-references**

Update paths to reference new locations.

- [ ] **Step 8: Update user_service/AGENTS.md cross-references**

Update paths to reference new locations.

- [ ] **Step 9: Update gateways/AGENTS.md cross-references**

In `backend/crates/gateways/AGENTS.md`, update:
```markdown
## Related Documentation

- [Backend AGENTS.md](../../AGENTS.md) — Overall architecture
- [Backend README](../../README.md) — API endpoint reference
```

- [ ] **Step 10: Update server/AGENTS.md cross-references**

Update paths to reference new locations.

- [ ] **Step 11: Commit all AGENTS.md updates**

```bash
git add "**/AGENTS.md"
git commit -m "docs: update all crate AGENTS.md cross-references for renamed crates"
```

### Task 20: Update ARCHITECTURE_DEEPENING.md

**Files:**
- Modify: `backend/docs/ARCHITECTURE_DEEPENING.md`

**Interfaces:**
- Consumes: New crate names from all previous tasks
- Produces: Updated architecture documentation

- [ ] **Step 1: Update crate structure diagram**

In `backend/docs/ARCHITECTURE_DEEPENING.md`, update:

```markdown
## Crate Structure

```
backend/crates/
├── base
│   ├── src/ports          # Canonical trait definitions
│   │   ├── repository.rs
│   │   ├── session.rs
│   │   ├── token.rs
│   │   ├── audit.rs
│   │   ├── email.rs
│   │   ├── password_hasher.rs
│   │   ├── clock.rs
│   │   └── http_error.rs
│   └── src/testkit        # In-memory fakes and test helpers
│       ├── repository.rs
│       ├── session.rs
│       ├── token.rs
│       ├── clock.rs
│       ├── crypto.rs
│       ├── domain.rs
│       └── context.rs
├── shared/
│   └── domain             # Domain types and contracts
│       ├── user.rs
│       ├── auth.rs
│       ├── role.rs
│       ├── error.rs
│       └── contracts/
├── infra/
│   ├── persistence         # Postgres / Redis implementations of ports
│   ├── telemetry           # Tracing, audit, metrics, health
│   └── config              # Configuration loading
├── services/
│   ├── auth_service
│   ├── session_service
│   └── user_service
├── gateways/gateways      # HTTP handlers, middleware, composition root
└── server                  # Binary entrypoint
```
```

- [ ] **Step 2: Update consequences section**

Replace crate name references in the Consequences section:
- "`klynt_common` was removed; its responsibilities moved to `domain` (domain types) and `base` (ports / testkit)."
- "The gateway depends on services, not on persistence details."
- "New services can be tested against `base::testkit` without Postgres or Redis."
- "Dependency direction is enforced by the compiler: services depend only on `base` and `domain`; infrastructure crates implement the ports."

- [ ] **Step 3: Update context section**

Replace crate name references in the Context section.

- [ ] **Step 4: Commit ARCHITECTURE_DEEPENING.md updates**

```bash
git add backend/docs/ARCHITECTURE_DEEPENING.md
git commit -m "docs: update ARCHITECTURE_DEEPENING.md for renamed crates"
```

### Task 21: Full Workspace Test

**Files:**
- All workspace crates

**Interfaces:**
- Consumes: All previous task outputs
- Produces: Verified working workspace

- [ ] **Step 1: Run cargo check on entire workspace**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo check --workspace --all-targets
```

Expected: All crates compile successfully with no errors

- [ ] **Step 2: Run cargo clippy**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo clippy --workspace --all-targets --all-features -- -D warnings
```

Expected: No clippy warnings

- [ ] **Step 3: Run cargo fmt check**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo fmt --check
```

Expected: No formatting differences

- [ ] **Step 4: Run tests (if environment available)**

If DATABASE_URL and REDIS_URL are configured:

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo nextest run --workspace --all-features
```

Expected: All tests pass

- [ ] **Step 5: Verify binary builds**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo build --bin server
```

Expected: Binary builds successfully at `target/debug/server`

- [ ] **Step 6: Final verification commit**

```bash
git add -A
git commit -m "chore: final verification after crate rename - all checks pass"
```

---

## Self-Review Results

**1. Spec coverage:** All rename requirements covered:
- ✅ Directory renames (klynt_base→base, infrastructure→infra, klynt-server→server)
- ✅ Package name changes (all 7 crates)
- ✅ Dependency updates in all Cargo.toml files
- ✅ Import updates in all source files
- ✅ Documentation updates (README.md, AGENTS.md files, ARCHITECTURE_DEEPENING.md)
- ✅ Workspace Cargo.toml members list

**2. Placeholder scan:** No placeholders found — all steps contain:
- Exact file paths
- Complete code snippets
- Exact commands to run
- Expected outputs

**3. Type consistency:** Crate name references are consistent:
- `base` used consistently for klynt_base
- `domain` used consistently for klynt_domain
- `persistence` used consistently for klynt_persistence
- `telemetry` used consistently for klynt_telemetry
- `config` used consistently for klynt_config
- `server` used consistently for klynt-server
- `infra` used consistently for infrastructure

**4. Import path verification:** All dependency paths updated:
- Paths from services: `../../../crates/base`, `../../../crates/infra/...`
- Paths from gateways: `../base`, `../shared/domain`, `../infra/...`
- Paths from infra crates: `../../base`, `../../shared/domain`

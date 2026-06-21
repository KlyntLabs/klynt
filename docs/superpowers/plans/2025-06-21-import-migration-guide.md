# Import Migration Quick Reference

**Purpose**: Quick lookup for replacing klynt_domain imports during migration.

---

## Import Migration Map

| Old Import | New Import | Notes |
|------------|------------|-------|
| `klynt_domain::models::UserId` | `klynt_utils::UserId` | Direct replacement |
| `klynt_domain::models::Email` | `klynt_utils::Email` | Direct replacement |
| `klynt_domain::models::Role` | `klynt_utils::Role` | Direct replacement |
| `klynt_domain::models::GlobalRole` | `klynt_utils::GlobalRole` | Direct replacement |
| `klynt_domain::models::UserStatus` | `klynt_utils::UserStatus` | Direct replacement |
| `klynt_domain::models::User` | `DELETE` | Services own their user types |
| `klynt_domain::models::UserDto` | `DELETE` | Use service DTOs |
| `klynt_domain::session::SessionToken` | `klynt_storage::session::SessionToken` | |
| `klynt_domain::session::Session` | `klynt_storage::session::Session` | |
| `klynt_domain::session::SessionStore` | `klynt_storage::session::SessionStore` | |
| `klynt_domain::tokens::TokenKind` | `klynt_storage::tokens::TokenKind` | |
| `klynt_domain::tokens::Token` | `klynt_storage::tokens::Token` | |
| `klynt_domain::ports::HealthCheck` | `klynt_storage::ports::HealthCheck` | |
| `klynt_domain::ports::IdempotencyStore` | `klynt_storage::ports::IdempotencyStore` | |
| `klynt_domain::ports::RateLimiter` | `klynt_storage::ports::RateLimiter` | |
| `klynt_domain::ports::RateLimitDecision` | `klynt_storage::ports::RateLimitDecision` | |
| `klynt_domain::ports::EmailService` | `klynt_storage::ports::EmailService` | |
| `klynt_domain::ports::SharedEmailService` | `klynt_storage::ports::SharedEmailService` | |
| `klynt_domain::ports::PasswordHasher` | `klynt_storage::ports::PasswordHasher` | |
| `klynt_domain::ports::HashedPassword` | `klynt_storage::ports::HashedPassword` | |
| `klynt_domain::ctx::Ctx` | `klynt_core::Ctx` | |
| `klynt_domain::config::AppConfig` | `klynt_infrastructure::config::AppConfig` | |
| `klynt_domain::config::ApiConfig` | `klynt_infrastructure::config::ApiConfig` | |
| `klynt_domain::config::RateLimiterConfig` | `klynt_infrastructure::config::RateLimiterConfig` | |
| `klynt_domain::errors::DomainError` | `klynt_shared_domain::EnhancedDomainError` | Or use service-specific errors |
| `klynt_domain::errors::EmailError` | `klynt_utils::EmailError` | |
| `klynt_domain::errors::RoleError` | `klynt_utils::RoleError` | |
| `klynt_domain::errors::TokenError` | `klynt_shared_domain::TokenError` | |
| `klynt_domain::audit::AuditEvent` | `klynt_audit::AuditEvent` | |
| `klynt_domain::audit::AuditAction` | `klynt_audit::AuditAction` | |
| `klynt_domain::email_content::EmailContent` | `klynt_infrastructure::email::EmailContent` | |
| `klynt_domain::email_content::VerificationEmail` | `klynt_infrastructure::email::VerificationEmail` | |
| `klynt_domain::password_policy::PasswordPolicy` | `klynt_infrastructure::password_policy::PasswordPolicy` | |
| `klynt_domain::repositories::UserRepository` | `DELETE` | Use service repositories |
| `klynt_domain::repositories::TokenStore` | `DELETE` | Use service repositories |
| `klynt_domain::repositories::AuditEventRepository` | `DELETE` | Use klynt_audit |

---

## Use Statement Examples

### Before (using klynt_domain)
```rust
use klynt_domain::models::{UserId, Email, Role};
use klynt_domain::session::{SessionToken, SessionStore};
use klynt_domain::tokens::TokenKind;
use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
```

### After (migrated)
```rust
use klynt_utils::{UserId, Email, Role};
use klynt_storage::session::{SessionToken, SessionStore};
use klynt_storage::tokens::TokenKind;
use klynt_core::Ctx;
use klynt_shared_domain::EnhancedDomainError;
```

---

## File-by-File Migration Guide

### Gateway Files

**`gateways/src/state/services.rs`**
- `klynt_domain::session::SessionStore` → `klynt_storage::session::SessionStore`
- Remove: `klynt_domain::ports::SharedEmailService` (use service-specific)

**`gateways/tests/support/mod.rs`**
- `klynt_domain::session::SessionStore` → `klynt_storage::session::SessionStore`
- `klynt_domain::session::SessionToken` → `klynt_storage::session::SessionToken`
- `klynt_domain::session::Session` → `klynt_storage::session::Session`
- `klynt_domain::ctx::Ctx` → `klynt_core::Ctx`

### Infrastructure Files

**`klynt-infrastructure/src/email.rs`**
- `klynt_domain::email_content` → `klynt_infrastructure::email::content`
- `klynt_domain::models::Email` → `klynt_utils::Email`

**`klynt-infrastructure/src/repositories/pg_user.rs`**
- `klynt_domain::ctx::Ctx` → `klynt_core::Ctx`
- `klynt_domain::models::{Email, UserId, ...}` → `klynt_utils::{Email, UserId, ...}`
- `klynt_domain::ports::HashedPassword` → `klynt_storage::ports::HashedPassword`
- `klynt_domain::repositories::UserRepository` → DELETE (implement locally)

**`klynt-infrastructure/src/repositories/pg_session.rs`**
- `klynt_domain::ctx::Ctx` → `klynt_core::Ctx`
- `klynt_domain::session::SessionStore` → `klynt_storage::session::SessionStore`

**`klynt-infrastructure/src/repositories/sqlx_token_repo.rs`**
- `klynt_domain::ctx::Ctx` → `klynt_core::Ctx`
- `klynt_domain::models::UserId` → `klynt_utils::UserId`
- `klynt_domain::tokens::TokenKind` → `klynt_storage::tokens::TokenKind`
- `klynt_domain::repositories::TokenStore` → DELETE (implement locally)

**`klynt-infrastructure/src/password_hasher.rs`**
- `klynt_domain::ports::{HashedPassword, PasswordHasher}` → `klynt_storage::ports::{HashedPassword, PasswordHasher}`

**`klynt-infrastructure/src/rate_limiter_redis.rs`**
- `klynt_domain::config::RateLimiterConfig` → `klynt_infrastructure::config::RateLimiterConfig`
- `klynt_domain::errors::DomainError` → `klynt_shared_domain::EnhancedDomainError`
- `klynt_domain::ports::{RateLimiter, RateLimitDecision}` → `klynt_storage::ports::{RateLimiter, RateLimitDecision}`

---

## Search and Replace Commands

### UserId
```bash
find . -name "*.rs" -type f -exec sed -i '' 's/klynt_domain::models::UserId/klynt_utils::UserId/g' {} +
```

### Email
```bash
find . -name "*.rs" -type f -exec sed -i '' 's/klynt_domain::models::Email/klynt_utils::Email/g' {} +
```

### Session
```bash
find . -name "*.rs" -type f -exec sed -i '' 's/klynt_domain::session::/klynt_storage::session::/g' {} +
```

### Tokens
```bash
find . -name "*.rs" -type f -exec sed -i '' 's/klynt_domain::tokens::/klynt_storage::tokens::/g' {} +
```

### Context
```bash
find . -name "*.rs" -type f -exec sed -i '' 's/klynt_domain::ctx::/klynt_core::/g' {} +
```

### Ports
```bash
find . -name "*.rs" -type f -exec sed -i '' 's/klynt_domain::ports::/klynt_storage::ports::/g' {} +
```

---

## Verification Steps

After completing imports migration:

```bash
# 1. Check no remaining klynt_domain imports
grep -r "klynt_domain::" backend/crates/*/src --include="*.rs"

# 2. Build check
cargo build --workspace

# 3. Test check
cargo test --workspace

# 4. Clippy check
cargo clippy --workspace --all-targets
```

---

## Notes

- User and UserDto are deleted - services own their user types
- Repository traits are deleted - each service has its own repository interface
- Some files may need both import changes AND implementation changes
- Tests may need updating for new paths

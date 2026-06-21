# klynt-domain Migration Visual Guide

---

## Before Migration (Current State)

```
backend/crates/
├── klynt-domain/                    ❌ MONOLITHIC - TO BE ELIMINATED
│   └── src/
│       ├── audit.rs                # AuditEvent, AuditAction
│       ├── config/                 # All configuration
│       │   ├── api.rs
│       │   ├── app.rs
│       │   └── rate_limiter.rs
│       ├── ctx.rs                  # Ctx
│       ├── email_content.rs        # Email templates
│       ├── errors.rs               # All errors
│       ├── lib.rs
│       ├── models.rs               # UserId, Email, Role, User...
│       ├── password_policy.rs      # PasswordPolicy
│       ├── ports/                  # Some ports
│       │   ├── email.rs
│       │   └── password_hasher.rs
│       ├── ports.rs                # HealthCheck, IdempotencyStore, RateLimiter
│       ├── repositories.rs         # UserRepository, TokenStore
│       ├── session.rs              # Session, SessionStore
│       └── tokens.rs               # Token, TokenKind
│
├── gateways/
│   └── api_gateway/                ❌ NESTED - TO BE FLATTENED
│       ├── Cargo.toml
│       ├── src/
│       └── tests/
│
├── shared/
│   ├── klynt_contracts/
│   ├── klynt_domain/               # Already has some types
│   │   └── src/
│   │       ├── error.rs
│   │       └── types.rs            # Email (duplicate), UserRole, UserStatus
│   └── klynt_utils/                # Already has Id<T>
│       └── src/
│           └── id.rs              # Has UserId = Id<UserIdMarker>
│
└── [other crates...]
```

---

## After Migration (Target State)

```
backend/crates/
├── core/
│   └── klynt_core/                 ✅ NOW HAS: Ctx
│       └── src/
│           └── ctx.rs
│
├── shared/
│   ├── klynt_contracts/            # Unchanged
│   ├── klynt_domain/               ✅ NOW HAS: Enhanced errors
│   │   └── src/
│   │       ├── error.rs            # EmailError, RoleError, TokenError, EnhancedDomainError
│   │       └── types.rs            # Existing: UserRole, UserStatus, Pagination...
│   └── klynt_utils/                ✅ NOW HAS: Primitive types
│       └── src/
│           ├── crypto.rs
│           ├── email.rs            # NEW: Email, EmailError
│           ├── id.rs               # CHANGED: UserId (simplified)
│           ├── role.rs             # NEW: Role, GlobalRole, UserStatus, RoleError
│           └── time.rs
│
├── infrastructure/
│   ├── klynt_audit/                ✅ NOW HAS: Audit types
│   │   └── src/
│   │       ├── audit_service.rs
│   │       └── types.rs            # NEW: AuditEvent, AuditAction, ResourceType
│   ├── klynt_messaging/            # Unchanged
│   ├── klynt_storage/              ✅ NOW HAS: Storage types & ports
│   │   └── src/
│   │       ├── ports.rs            # HealthCheck, IdempotencyStore, RateLimiter
│   │       ├── ports/
│   │       │   ├── email.rs        # EmailService, SharedEmailService
│   │       │   └── password_hasher.rs  # PasswordHasher, HashedPassword
│   │       ├── session.rs          # NEW: Session, SessionToken, SessionStore
│   │       └── tokens.rs           # NEW: Token, TokenKind
│   ├── klynt_tracing/              # Unchanged
│   └── klynt-infrastructure/       ✅ NOW HAS: Config & email templates
│       └── src/
│           ├── config/             # NEW: All config from klynt-domain
│           │   ├── api.rs
│           │   ├── app.rs
│           │   ├── mod.rs
│           │   └── rate_limiter.rs
│           ├── email/
│           │   ├── content.rs      # NEW: EmailContent, VerificationEmail, PasswordResetEmail
│           │   └── mod.rs
│           ├── password_policy.rs  # NEW: PasswordPolicy from klynt-domain
│           └── [existing...]
│
├── gateways/                       ✅ FLATTENED
│   ├── Cargo.toml                  # Was: api_gateway/Cargo.toml
│   ├── src/                        # Was: api_gateway/src/
│   └── tests/                      # Was: api_gateway/tests/
│
├── services/
│   ├── auth_service/               # Unchanged
│   └── user_service/               # Unchanged
│
└── klynt-domain/                   ✅ DELETED
```

---

## Module Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BEFORE: klynt-domain (monolith)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   models.rs  │  │  session.rs  │  │  tokens.rs   │  │   errors.rs  │   │
│  │ UserId Email │◄─┤  Session     │◄─┤  Token       │◄─┤  DomainError │   │
│  │ Role User    │  │  SessionStore│  │  TokenKind   │  │  EmailError  │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│         │                  ▲                  ▲                  ▲          │
│         └──────────────────┴──────────────────┴──────────────────┘          │
│                                     │                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   config.rs  │  │   ctx.rs     │  │  ports.rs    │  │ repositories │   │
│  │ AppConfig    │  │  Ctx         │  │  HealthCheck │  │  UserRepo    │   │
│  │ ApiConfig    │  │              │  │  EmailSvc    │  │  TokenStore  │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼ MIGRATION
                                          │
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AFTER: Distributed by Concern                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                    klynt_utils (primitives)                             │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────────────────┐   │ │
│  │  │  UserId  │  │  Email   │  │  Role  │ GlobalRole │ UserStatus   │   │ │
│  │  └──────────┘  └──────────┘  └──────────────────────────────────┘   │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                    ▲                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                    klynt_storage (storage types)                       │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │  Session │ SessionToken │ SessionStore │ Token │ TokenKind       │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │  HealthCheck │ RateLimiter │ EmailService │ PasswordHasher     │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                    ▲                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                    klynt_infrastructure (config)                       │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────────┐     │ │
│  │  │AppConfig │  │ApiConfig │  │RateLimiterCfg│  │PasswordPolicy│     │ │
│  │  └──────────┘  └──────────┘  └──────────────┘  └──────────────┘     │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │  EmailContent │ VerificationEmail │ PasswordResetEmail          │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                    ▲                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                    klynt_core (context)                               │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │  Ctx                                                             │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                    ▲                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                    klynt_audit (audit types)                           │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │  AuditEvent │ AuditAction │ ResourceType                         │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                    ▲                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                    klynt_shared_domain (errors)                       │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │  EnhancedDomainError │ EmailError │ RoleError │ TokenError       │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Dependency Graph Changes

### Before: Tight Coupling to klynt-domain
```
┌─────────────────┐
│  klynt-domain   │
│  (monolith)      │
└────────┬────────┘
         │
    ┌────┴─────┬───────────────┬─────────────────┐
    │          │               │                 │
    ▼          ▼               ▼                 ▼
┌─────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────────┐
│ gateway │ │services  │ │infrastructure│ │  klynt-server│
└─────────┘ └──────────┘ └──────────────┘ └──────────────┘
```

### After: Distributed by Concern
```
┌───────────────┐     ┌───────────────┐     ┌────────────────┐
│  klynt_utils  │     │ klynt_storage │     │klynt_infra     │
│  (primitives) │     │ (storage)     │     │ (config)       │
└───────┬───────┘     └───────┬───────┘     └────────┬───────┘
        │                     │                      │
        └──────────┬──────────┴──────────┬───────────┘
                   │                     │
                   ▼                     ▼
            ┌──────────────┐     ┌──────────────┐
            │   services   │     │   gateway    │
            └──────────────┘     └──────────────┘
```

---

## Gateway Structure Change

### Before: Nested
```
gateways/
└── api_gateway/           ❌ Extra nesting level
    ├── Cargo.toml
    ├── src/
    │   ├── lib.rs
    │   ├── routes/
    │   ├── middleware/
    │   └── state/
    └── tests/
```

### After: Flat
```
gateways/                  ✅ Direct structure
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── routes/
│   ├── middleware/
│   └── state/
└── tests/
```

---

## Type Migration Quick Reference

| Type Category | Before (klynt-domain) | After (new crate) |
|--------------|----------------------|-------------------|
| **Primitives** | `models.rs` | `klynt_utils/` |
| **Storage** | `session.rs`, `tokens.rs` | `klynt_storage/` |
| **Ports** | `ports.rs`, `ports/` | `klynt_storage/ports/` |
| **Config** | `config/` | `klynt_infrastructure/config/` |
| **Context** | `ctx.rs` | `klynt_core/ctx.rs` |
| **Errors** | `errors.rs` | `klynt_shared_domain/error.rs` |
| **Audit** | `audit.rs` | `klynt_audit/types.rs` |
| **Email** | `email_content.rs` | `klynt_infrastructure/email/` |
| **Password** | `password_policy.rs` | `klynt_infrastructure/` |

---

## Verification Checklist

Use this diagram to verify your migration is complete:

- [ ] `klynt-domain/` directory deleted
- [ ] `gateways/src/` exists (not `gateways/api_gateway/src/`)
- [ ] `klynt_utils/` has: `UserId`, `Email`, `Role`, `GlobalRole`, `UserStatus`
- [ ] `klynt_storage/` has: `session.rs`, `tokens.rs`, `ports.rs`
- [ ] `klynt_core/` has: `ctx.rs`
- [ ] `klynt_infrastructure/config/` exists
- [ ] `klynt_audit/types.rs` has audit types
- [ ] No `klynt_domain::` imports remain
- [ ] All tests pass

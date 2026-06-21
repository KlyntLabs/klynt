# Multi-Tenant Authentication System — Implementation Roadmap

> **For agentic workers:** This is a **roadmap plan** covering all 5 phases of the multi-tenant authentication system. Each phase will have a detailed execution plan created before implementation. Use this roadmap to understand the full scope, dependencies, and sequence.

**Goal:** Build a production-grade multi-tenant authentication system for Klynt Education Platform with cross-tenant SSO, 3-tier permissions, and audit compliance.

**Architecture:** Integrated backend (Rust + Axum) following clean architecture—domain, application, infrastructure, API layers. Session store: Postgres-authoritative with Redis read-through cache.

**Tech Stack:** Rust, Axum, SQLx, PostgreSQL, Redis, Argon2, OpenAPI

---

## Roadmap Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Phase 1: Core Auth Foundation (2-3 weeks)                         │
│ ├─ Database migrations + schema                                  │
│ ├─ User registration + email verification                           │
│ ├─ Enhanced login (session rotation)                              │
│ ├─ Password reset (hashed tokens)                                  │
│ ├─ Audit logging infrastructure                                     │
│ └─ Rate limiting (Redis-backed)                                    │
├─────────────────────────────────────────────────────────────────┤
│ Phase 2: Multi-Tenancy Core (2-3 weeks)                            │
│ ├─ Tenant entities + migrations                                    │
│ ├─ User-tenant memberships                                         │
│ ├─ Tenant ownership limits (atomic)                                │
│ ├─ Session store consistency (Redis + Postgres)                    │
│ └─ Data retention cleanup jobs                                     │
├─────────────────────────────────────────────────────────────────┤
│ Phase 3: Permissions & Roles (2-3 weeks)                           │
│ ├─ 3-tier permission model                                         │
│ ├─ Platform vs tenant trust boundaries                             │
│ ├─ Tenant roles (Owner, Admin, Member, Guest)                      │
│ ├─ Custom role creation                                            │
│ └─ Permission checking with re-verification                         │
├─────────────────────────────────────────────────────────────────┤
│ Phase 4: Member Management (1-2 weeks)                              │
│ ├─ Tenant invitations                                              │
│ ├─ Member role updates                                             │
│ ├─ Member removal                                                  │
│ └─ Owner transfer with delete restriction                           │
├─────────────────────────────────────────────────────────────────┤
│ Phase 5: Enhanced Features (Future, TBD)                            │
│ ├─ OAuth provider integration                                      │
│ ├─ Magic link authentication                                      │
│ ├─ 2FA/TOTP support                                                │
│ └─ Session management UI                                            │
└─────────────────────────────────────────────────────────────────┘
```

**Total Estimated Effort:** 9-11 weeks for Phases 1-4 (Phase 5 is future work)

---

## Phase 1: Core Auth Foundation

**Duration:** 2-3 weeks  
**Dependencies:** None  
**Prerequisites:** PostgreSQL, Redis running locally/CI

### Objectives

1. Establish database migration infrastructure
2. Implement user registration with email verification
3. Enhance login with session fixation prevention
4. Implement secure password reset (hashed tokens)
5. Build audit logging infrastructure (compliance)
6. Enhance rate limiting with Redis backend

### Deliverables

- ✅ Migration infrastructure (sqlx-cli, migrations directory)
- ✅ Database schema (users, sessions, email_verification_tokens, password_reset_tokens, audit_events)
- ✅ Registration use case with email verification
- ✅ Enhanced login with session ID rotation
- ✅ Password reset with SHA-256 hashed tokens
- ✅ Audit logging service and infrastructure
- ✅ Redis-backed rate limiter
- ✅ Unit + integration tests (≥84% coverage)
- ✅ OpenAPI spec for auth endpoints

### Acceptance Criteria

**Given** a new user registers with valid email/password  
**When** they complete registration  
**Then** a verification email is sent and account is in pending state

**Given** a pending user clicks the verification link  
**When** the token is valid and unused  
**Then** the account is activated and user can log in

**Given** a user logs in with valid credentials  
**When** authentication succeeds  
**Then** a NEW session ID is created (not reused) and cookie is set

**Given** a user requests password reset  
**When** they submit the form  
**Then** a reset email is sent with a hashed token (not verbatim)

**Given** an auth endpoint receives requests  
**When** rate limit is exceeded  
**Then** 429 status is returned and request is blocked

**Given** any security-relevant mutation occurs  
**When** the action completes  
**Then** an audit event is logged immutably

### File Structure Changes

```
backend/
├── migrations/
│   ├── 0001_initial_schema.sql          ← NEW
│   ├── 0002_add_audit_table.sql         ← NEW
│   └── ...
├── crates/
│   ├── klynt-domain/
│   │   ├── src/
│   │   │   ├── models.rs                  ← MODIFY (add User::global_role, email_verified)
│   │   │   ├── tokens.rs                  ← NEW (email verification, password reset)
│   │   │   ├── audit.rs                   ← NEW (audit event entity)
│   │   │   └── repositories.rs            ← MODIFY (add token repos)
│   │   └── tests/
│   │       └── test_tokens.rs             ← NEW
│   ├── klynt-application/
│   │   ├── src/
│   │   │   ├── auth.rs                    ← MODIFY (add registration, verify-email, reset-password)
│   │   │   ├── audit.rs                   ← NEW (audit logging use case)
│   │   │   └── rate_limit.rs              ← NEW (rate limiting use case)
│   │   └── tests/
│   │       ├── test_auth.rs               ← MODIFY (add tests)
│   │       └── test_audit.rs              ← NEW
│   ├── klynt-infrastructure/
│   │   ├── src/
│   │   │   ├── repositories/
│   │   │   │   ├── sqlx_user_repo.rs       ← MODIFY (add email_verified, global_role)
│   │   │   │   ├── sqlx_session_repo.rs   ← MODIFY (implement Postgres backing)
│   │   │   │   ├── sqlx_token_repo.rs     ← NEW (email verification, password reset)
│   │   │   │   └── sqlx_audit_repo.rs     ← NEW (audit event storage)
│   │   │   ├── email.rs                    ← NEW (email sending service)
│   │   │   ├── token_generator.rs           ← NEW (CSPRNG token generation)
│   │   │   └── redis_rate_limiter.rs        ← MODIFY (enhance with Redis)
│   │   └── tests/
│   │       └── test_rate_limiter.rs        ← MODIFY
│   └── klynt-api/
│       ├── src/
│       │   ├── v1/
│       │   │   └── auth.rs                  ← NEW (registration, verify-email, reset-password routes)
│       │   └── openapi.yaml                 ← NEW (OpenAPI spec)
│       └── tests/
│           └── test_auth_integration.rs      ← NEW (cross-subdomain SSO tests)
```

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Migration tool** | sqlx-cli | Rust-native, compile-time verified queries |
| **Email verification** | SHA-256 hashed tokens, 24hr expiry | Security, replay prevention |
| **Password reset** | SHA-256 hashed tokens, 15-60min expiry | Security, compliance |
| **Session rotation** | Always create new ID on login | Prevent fixation |
| **Audit storage** | Append-only Postgres table | Immutable, queryable |
| **Rate limiting** | Redis with sliding window | Fast, distributed, auto-expiry |

### Risk Areas

| Risk | Mitigation |
|------|------------|
| Email delivery failures | Mock email service for tests, configurable provider |
| Token replay attacks | Atomic `UPDATE ... WHERE used_at IS NULL` |
| Session fixation | Mandatory session ID rotation, regression tests |
| Rate limiter Redis failure | Fallback to Postgres, degraded but functional |
| Audit log writes failing | Async logging with retry, don't block auth flow |
| Migration failures | Forward-only with rollback steps, test in staging |

---

## Phase 2: Multi-Tenancy Core

**Duration:** 2-3 weeks  
**Dependencies:** Phase 1 complete  
**Prerequisites:** User auth working, migrations established

### Objectives

1. Implement tenant entities and database schema
2. Create user-tenant membership system
3. Enforce tenant ownership limits atomically
4. Establish session store consistency model
5. Implement data retention cleanup jobs

### Deliverables

- ✅ Tenant entity and migrations (tenants, user_tenant_memberships)
- ✅ Tenant ownership enforcement (database trigger)
- ✅ Session store consistency (Postgres-authoritative, Redis cache)
- ✅ Session invalidation on permission changes
- ✅ Data retention cleanup job
- ✅ Unit + integration tests

### Acceptance Criteria

**Given** a user with <2 owned tenants  
**When** they create a new tenant  
**Then** the tenant is created and they become Owner

**Given** a user with 2 owned tenants  
**When** they attempt to create a third  
**Then** creation fails with TENANT_LIMIT_REACHED

**Given** concurrent tenant creation requests  
**When** both would exceed the limit  
**Then** only one succeeds (atomic enforcement)

**Given** a user's role changes in Postgres  
**When** they make a subsequent request  
**Then** their session is re-verified or invalidated

**Given** expired sessions/tokens exist  
**When** cleanup job runs  
**Then** expired data is purged per retention policy

### File Structure Changes

```
backend/
├── migrations/
│   ├── 0003_add_tenants.sql             ← NEW
│   └── 0004_add_memberships.sql          ← NEW
├── crates/
│   ├── klynt-domain/
│   │   ├── src/
│   │   │   ├── tenant.rs                 ← NEW (Tenant entity, ownership limits)
│   │   │   ├── membership.rs             ← NEW (User-tenant membership)
│   │   │   └── repositories.rs            ← MODIFY (add TenantRepo, MembershipRepo)
│   │   └── tests/
│   │       └── test_tenant.rs            ← NEW
│   ├── klynt-application/
│   │   ├── src/
│   │   │   ├── tenants.rs                 ← NEW (tenant CRUD use cases)
│   │   │   └── cleanup.rs                 ← NEW (data retention cleanup job)
│   │   └── tests/
│   │       └── test_tenants.rs            ← NEW
│   ├── klynt-infrastructure/
│   │   ├── src/
│   │   │   ├── repositories/
│   │   │   │   ├── sqlx_tenant_repo.rs     ← NEW
│   │   │   │   └── sqlx_membership_repo.rs ← NEW
│   │   │   └── session_cache.rs            ← NEW (Redis cache consistency)
│   │   └── tests/
│   │       └── test_session_cache.rs       ← NEW
│   └── klynt-api/
│       └── src/
│           └── v1/
│               └── tenants.rs               ← NEW (tenant HTTP endpoints)
```

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Ownership limit** | Database trigger + serializable fallback | Atomic, prevents race conditions |
| **Session authority** | Postgres-authoritative | Survives Redis failures, audit trail |
| **Cache invalidation** | Delete pattern on permission changes | Simple, eventually consistent |
| **Cleanup method** | Scheduled job + lazy cleanup | Balance storage costs with freshness |

---

## Phase 3: Permissions & Roles

**Duration:** 2-3 weeks  
**Dependencies:** Phase 2 complete  
**Prerequisites:** Tenants and memberships working

### Objectives

1. Implement 3-tier permission model
2. Define platform vs tenant trust boundaries
3. Create tenant role system (Owner, Admin, Member, Guest)
4. Build custom role creation
5. Implement permission checking with re-verification

### Deliverables

- ✅ Permission entity and migrations (permissions, tenant_roles, role_permissions)
- ✅ 3-tier permission model enforcement
- ✅ Platform-tenant isolation checks
- ✅ Custom role creation use cases
- ✅ Permission checking middleware
- ✅ Unit + integration tests

### Acceptance Criteria

**Given** a Global Admin attempts to view tenant content  
**When** they are not a tenant member  
**Then** access is denied (platform-tenant isolation)

**Given** a Tenant Owner  
**When** they manage their tenant settings  
**Then** access is granted (tenant-level permissions)

**Given** a Tenant Owner creates a custom role  
**When** they assign permissions  
**Then** the role is created with those permissions

**Given** a user's permissions change  
**When** they make a privileged request  
**Then** permissions are re-verified against Postgres

### File Structure Changes

```
backend/
├── migrations/
│   ├── 0005_add_permissions.sql          ← NEW
│   └── 0006_add_tenant_roles.sql         ← NEW
├── crates/
│   ├── klynt-domain/
│   │   ├── src/
│   │   │   ├── permission.rs              ← NEW (Permission entity)
│   │   │   ├── role.rs                    ← NEW (TenantRole entity)
│   │   │   └── repositories.rs            ← MODIFY (add PermissionRepo, RoleRepo)
│   │   └── tests/
│   │       └── test_permissions.rs         ← NEW
│   ├── klynt-application/
│   │   ├── src/
│   │   │   ├── permissions.rs              ← NEW (permission checking use cases)
│   │   │   └── roles.rs                   ← NEW (role CRUD use cases)
│   │   └── tests/
│   │       └── test_permissions.rs         ← NEW
│   ├── klynt-infrastructure/
│   │   ├── src/
│   │   │   └── repositories/
│   │   │       ├── sqlx_permission_repo.rs ← NEW
│   │   │       └── sqlx_role_repo.rs        ← NEW
│   └── klynt-api/
│       └── src/
│           ├── middleware/
│           │   └── auth.rs                   ← NEW (permission checking middleware)
│           └── v1/
│               └── roles.rs                 ← NEW (role HTTP endpoints)
```

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Permission storage** | Postgres + cached in session | Fast checks, audit trail |
| **Re-verification** | On privileged operations, hit Postgres | Balance speed and consistency |
| **Custom roles** | Per-tenant, JSONB metadata | Flexible, tenant-controlled |
| **Platform isolation** | Explicit membership required | Privacy boundary for education |

---

## Phase 4: Member Management

**Duration:** 1-2 weeks  
**Dependencies:** Phase 3 complete  
**Prerequisites:** Permissions and roles working

### Objectives

1. Implement tenant invitation system
2. Build member role management
3. Create member removal flow
4. Implement owner transfer with delete restriction

### Deliverables

- ✅ Tenant invitation entity and migrations
- ✅ Invitation creation and acceptance flows
- ✅ Member role update use cases
- ✅ Member removal with cleanup
- ✅ Owner transfer with ON DELETE RESTRICT enforcement
- ✅ Unit + integration tests

### Acceptance Criteria

**Given** a Tenant Owner  
**When** they invite a member  
**Then** an email is sent with invite token

**Given** a user with invite token  
**When** they accept the invitation  
**Then** they become a tenant member with specified role

**Given** a Tenant Owner  
**When** they update a member's role  
**Then** the member's permissions are updated

**Given** a user attempts to delete themselves while owning tenants  
**When** deletion is attempted  
**Then** deletion fails with clear error message

### File Structure Changes

```
backend/
├── migrations/
│   └── 0007_add_invites.sql               ← NEW
├── crates/
│   ├── klynt-domain/
│   │   ├── src/
│   │   │   ├── invite.rs                  ← NEW (Invite entity)
│   │   │   └── repositories.rs            ← MODIFY (add InviteRepo)
│   │   └── tests/
│   │       └── test_invites.rs           ← NEW
│   ├── klynt-application/
│   │   ├── src/
│   │   │   └── members.rs                ← NEW (invitation, role update, removal)
│   │   └── tests/
│   │       └── test_members.rs           ← NEW
│   ├── klynt-infrastructure/
│   │   ├── src/
│   │   │   └── repositories/
│   │   │       └── sqlx_invite_repo.rs   ← NEW
│   └── klynt-api/
│       └── src/
│           └── v1/
│               └── members.rs               ← NEW (member HTTP endpoints)
```

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Invite expiry** | 7 days | Balance convenience and security |
| **Invite tokens** | CSPRNG, stored hashed | Security |
| **Owner transfer** | Two-step process | Prevent accidental loss |
| **User deletion** | ON DELETE RESTRICT on owner_id | Safety, explicit action required |

---

## Phase 5: Enhanced Features (Future)

**Duration:** TBD  
**Dependencies:** Phases 1-4 complete

### Objectives

1. OAuth provider integration (Google, GitHub)
2. Magic link authentication
3. 2FA/TOTP support
4. Session management UI

**Note:** This phase is out of scope for initial implementation. Will be planned after Phases 1-4 are complete and production-tested.

---

## Cross-Cutting Concerns

### Testing Strategy

**Unit Tests (≥84% aggregate coverage):**
- Domain: ≥90% (entities, value objects)
- Application: ≥85% (use cases)
- Infrastructure: ≥80% (repositories, external services)
- API: ≥80% (handlers, middleware)

**Integration Tests:**
- Full auth flows (register → verify → login → create tenant → logout)
- Cross-subdomain SSO (login.klynt.dev → tenant.klynt.dev)
- Rate limiting (trigger limits, verify 429)
- Session consistency (Redis failover, Postgres fallback)
- Permission isolation (platform vs tenant boundaries)

**CI Test Commands:**
```bash
# Unit tests
cargo nextest run --workspace backend

# Integration tests (with Docker services)
docker compose -f docker-compose.test.yml up --build
cargo nextest run --workspace backend --features integration

# Coverage
cargo nextest run --workspace backend --nocapture
grcov ./target/debug/... --output-path ./lcov.info
genhtml lcov.info -o ./coverage/
```

### Security Checklist

- [ ] All passwords hashed with Argon2id (memory-hard)
- [ ] All tokens stored as SHA-256 hashes only
- [ ] Session ID rotation on every login
- [ ] Rate limiting on all auth endpoints
- [ ] CORS uses dynamic origin validation (no wildcards with credentials)
- [ ] Security headers (HSTS, CSP, X-Frame-Options, etc.)
- [ ] Audit logging for all security-relevant mutations
- [ ] Input validation on all endpoints
- [ ] Atomic enforcement of business limits (tenant ownership)
- [ ] Platform-tenant isolation enforced

### Deployment Checklist

- [ ] Migrations tested in staging
- [ ] Rollback plan documented
- [ ] Health endpoints functional
- [ ] Metrics endpoints configured
- [ ] Redis/Postgres connectivity verified
- [ ] Email provider configured
- [ ] Rate limiter Redis connection tested
- [ ] Audit log writes verified
- [ ] Cross-subdomain cookies tested in staging
- [ ] Rollback procedure tested

### Migration Rollback Plan

**Pre-deployment:**
1. Backup database
2. Run migrations in staging
3. Verify rollback

**Deployment:**
1. Deploy new version alongside old
2. Run migrations
3. Switch traffic

**Rollback if:**
- Health endpoint returns 503
- Session lookup latency > 1s (p95)
- Audit log writes failing
- Migration errors

**Rollback steps:**
```bash
# Rollback migrations
sqlx migrate revert --source migrations

# Revert deployment
git revert <deployment-commit>
git push
```

---

## Success Metrics

### Functional Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Registration flow success rate | >95% | Successful verifies / registrations |
| Login success rate | >90% | Successful logins / attempts |
| Cross-subdomain SSO working | 100% | Session valid across all subdomains |
| Tenant ownership limit | 0 violations | No user owns >2 tenants |
| Permission checks accuracy | 100% | No false positives/negatives in tests |

### Non-Functional Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| API response time (p95) | <200ms | All auth endpoints |
| Session lookup (p95) | <10ms | Redis cache hit |
| Auth uptime | 99.9% | 30-day rolling window |
| Test coverage | ≥84% | `cargo-llvm-cov` |
| Audit log completeness | 100% | All mutations logged |

---

## Next Steps

1. **Review this roadmap** — Ensure alignment with requirements and timeline
2. **Approve Phase 1 start** — Confirm readiness to begin
3. **Create detailed Phase 1 execution plan** — Write step-by-step implementation plan
4. **Execute Phase 1** — Implement with subagent-driven-development
5. **Review and adjust** — Learn from Phase 1 before planning Phase 2

---

## Appendix: Existing Infrastructure

**Already Implemented:**
- ✅ Clean architecture (domain/application/infrastructure/api layers)
- ✅ Basic auth service (login, session creation)
- ✅ Argon2 password hasher
- ✅ Session store trait
- ✅ Domain errors and models
- ✅ Basic rate limiter infrastructure

**To Be Built:**
- ❌ Email verification system
- ❌ Password reset (secure, hashed)
- ❌ Audit logging infrastructure
- ❌ Multi-tenancy entities
- ❌ Permission system
- ❌ Member management
- ❌ Enhanced rate limiting
- ❌ Migration infrastructure

---

**Document Version:** 1.0  
**Last Updated:** 2024-06-20  
**Status:** Ready for Review

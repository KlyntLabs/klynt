# Multi-Tenant Authentication System Design

**Date:** 2024-06-20
**Status:** Approved
**Author:** Design Document
**Version:** 1.0

## Executive Summary

This document describes the design for a production-grade multi-tenant authentication system for Klynt Education Platform. The system enables cross-tenant single sign-on (SSO) where a user logs in once at `login.klynt.dev` and can access any tenant (`klynt.dev`, `jayden.klynt.dev`, `bob.klynt.dev`) without re-authentication.

### Key Features
- **Cross-tenant SSO** — One login works across all subdomains
- **Multi-tenant ownership** — Users can own multiple tenants (limit: 2 for POC, each with Owner role)
- **3-tier permissions** — Platform, Tenant, and Tenant-Internal role levels
- **Email/password authentication** — Foundation for future OAuth/magic links
- **Session management** — View/revoke active sessions, "remember me" support
- **Production-grade security** — Rate limiting, input validation, secure headers, comprehensive audit logging

### Technology Stack
- **Backend:** Rust + Axum (integrated into existing backend)
- **Database:** PostgreSQL (sqlx with migrations)
- **Session Store:** Redis
- **API:** REST with OpenAPI specification
- **Versioning:** URL-based (`/api/v1/`)

---

## System Architecture

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                     │
│  klynt.dev │ jayden.klynt.dev │ bob.klynt.dev │ login.klynt.dev              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         KLYNT BACKEND (Rust + Axum)                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                          API LAYER (klynt-api)                           │ │
│  │  Auth Routes │ Tenant Routes │ Member Routes │ Role Routes               │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    APPLICATION LAYER (klynt-application)                 │ │
│  │  Register Use Case │ Login Use Case │ Tenant Create Use Case            │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                      DOMAIN LAYER (klynt-domain)                         │ │
│  │  User │ Tenant │ Role │ Permission │ Session │ Token Entities           │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                  INFRASTRUCTURE LAYER (klynt-infrastructure)             │ │
│  │  Postgres Repo │ Redis Session Store │ Email Service │ Password Hasher │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
        ┌───────────────────────┐       ┌───────────────────────┐
        │   PostgreSQL          │       │      Redis             │
        │   - Users             │       │   - Sessions           │
        │   - Tenants           │       │   - Rate Limiters      │
        │   - Roles/Permissions │       │   - Cache              │
        └───────────────────────┘       └───────────────────────┘
```

### Architecture Principles
1. **Integrated Backend** — Auth modules within `klynt-api`, sharing Axum server
2. **Clean Architecture** — Each layer has single responsibility, dependencies point inward
3. **Session Store** — Redis for fast session lookup, Postgres for durable data
4. **Domain-Driven** — Entities capture business rules
5. **Testability** — Each layer tested in isolation

### Request Flow Example: Login
```
1. Client POST /api/v1/auth/login → API Layer
2. API Layer → Application Layer (LoginUseCase)
3. LoginUseCase → Domain (User.authenticate())
4. Domain → Infrastructure (PostgresRepo.find_user_by_email())
5. PostgresRepo returns User
6. User.authenticate(password) → PasswordHasher.verify()
7. If valid → Create Session → RedisSessionStore.save()
8. Return session token → API Layer
9. API Layer sets cookie: session_token=.klynt.dev → Client
```

---

## Database Schema

### Core Identity Tables

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    global_role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_id_cached UUID NOT NULL,
    email_cached VARCHAR(255) NOT NULL,
    tenant_memberships JSONB NOT NULL DEFAULT '[]',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Email verification tokens (secure)
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,  -- SHA-256(token)
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_tokens_hash ON email_verification_tokens(token_hash);
CREATE INDEX idx_email_tokens_user ON email_verification_tokens(user_id);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX idx_password_tokens_token ON password_reset_tokens(token);
```

### Multi-Tenancy Tables

```sql
-- Tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    max_members INTEGER NOT NULL DEFAULT 100,
    max_owners INTEGER NOT NULL DEFAULT 1,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_owner ON tenants(owner_id);

-- User-tenant memberships
CREATE TABLE user_tenant_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tenant_role_id UUID NOT NULL REFERENCES tenant_roles(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, tenant_id)
);

CREATE INDEX idx_memberships_user ON user_tenant_memberships(user_id);
CREATE INDEX idx_memberships_tenant ON user_tenant_memberships(tenant_id);
CREATE INDEX idx_memberships_status ON user_tenant_memberships(status);

-- Tenant invitations
CREATE TABLE tenant_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    tenant_role_id UUID NOT NULL REFERENCES tenant_roles(id),
    invited_by UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    token VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invites_tenant ON tenant_invites(tenant_id);
CREATE INDEX idx_invites_email ON tenant_invites(email);
CREATE INDEX idx_invites_token ON tenant_invites(token);
```

### Roles & Permissions Tables

```sql
-- System-wide permissions
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_permissions_name ON permissions(name);
CREATE INDEX idx_permissions_category ON permissions(category);

-- Tenant-specific roles
CREATE TABLE tenant_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_custom BOOLEAN NOT NULL DEFAULT TRUE,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_tenant_roles_tenant ON tenant_roles(tenant_id);

-- Role permissions mapping
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES tenant_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
```

### Session JSONB Structure

```json
{
  "version": 1,
  "tenant_memberships": [
    {
      "tenant_id": "uuid",
      "tenant_slug": "jayden",
      "role_id": "uuid",
      "role_name": "Owner",
      "permissions": ["tenant.view", "tenant.manage_settings"]
    }
  ]
}
```

**Versioning Strategy:**
- `version` field indicates schema version
- On schema change, increment version and invalidate old sessions
- Migration: Rehydrate sessions from Postgres on version mismatch
- Forward compatibility: New fields optional, old clients ignore unknown fields

---

## API Design

### API Structure

```
/api/v1/
├── /auth
│   ├── POST   /register
│   ├── POST   /verify-email
│   ├── POST   /login
│   ├── POST   /logout
│   ├── POST   /forgot-password
│   ├── POST   /reset-password
│   ├── GET    /me
│   ├── GET    /sessions
│   └── DELETE /sessions/:id
│
├── /tenants
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PUT    /:id
│   └── DELETE /:id
│
├── /tenants/:tenant_id/members
│   ├── GET    /
│   ├── POST   /
│   ├── PUT    /:user_id
│   └── DELETE /:user_id
│
└── /tenants/:tenant_id/roles
    ├── GET    /
    ├── POST   /
    ├── GET    /:id
    ├── PUT    /:id
    └── DELETE /:id
```

### Key Endpoints

#### POST /api/v1/auth/register
Register a new account and send verification email.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "username": "johndoe"
}
```

**Response 201:**
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "johndoe",
      "email_verified": false,
      "global_role": "user",
      "created_at": "2024-01-01T00:00:00Z"
    }
  },
  "message": "Registration successful. Please check your email to verify your account."
}
```

#### POST /api/v1/auth/login
Authenticate and create session.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response 200:**
```
Set-Cookie: session_token=opaque-token; Domain=.klynt.dev; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=604800
```
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "johndoe"
    },
    "session": {
      "expires_at": "2024-01-08T00:00:00Z"
    }
  },
  "message": "Login successful"
}
```

#### POST /api/v1/tenants
Create a new tenant.

**Request:**
```json
{
  "slug": "mycourse",
  "name": "My Awesome Course"
}
```

**Response 201:**
```json
{
  "data": {
    "tenant": {
      "id": "uuid",
      "slug": "mycourse",
      "name": "My Awesome Course",
      "owner_id": "uuid",
      "max_members": 100
    }
  },
  "message": "Tenant created successfully"
}
```

### Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid input data |
| `INVALID_CREDENTIALS` | Wrong email/password |
| `EMAIL_NOT_VERIFIED` | Email verification required |
| `EMAIL_ALREADY_EXISTS` | Email already registered |
| `INVALID_TOKEN` | Token expired or invalid |
| `TENANT_LIMIT_REACHED` | Max tenants owned |
| `SLUG_ALREADY_EXISTS` | Tenant slug taken |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permission |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `NOT_FOUND` | Resource not found |

---

## Security Design

### Rate Limiting (Redis-based)

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /auth/register | 5 requests | per hour / IP |
| POST /auth/login | 10 requests | per 5 min / IP |
| POST /auth/forgot-password | 3 requests | per hour / email |
| General API | 100 requests | per min / user |
| Global | 1000 requests | per min |

### Security Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=()
```

### Cookie Configuration

```
session_token=.klynt.dev;
  Secure;          → Only HTTPS
  HttpOnly;        → Not accessible via JavaScript
  SameSite=Lax;    → CSRF protection
  Domain=.klynt.dev; → SSO across subdomains
  Path=/;          → Available site-wide
  Max-Age=604800    → 7 days
```

### Password Security

- **Hashing:** Argon2id (memory-hard, GPU-resistant)
  - Memory cost: 19456 (24 MB)
  - Time cost: 2 iterations
  - Parallelism: 1 lane
- **Requirements:**
  - Minimum 8 characters
  - At least 1 uppercase, 1 lowercase, 1 number
- **Forbidden:** Common passwords, user data (email, username)

### Password Reset Token Security

**Critical:** Reset tokens must be stored securely to prevent account takeover via database breach.

- **Generation:** CSPRNG with ≥256 bits of entropy
- **Storage:** Store only SHA-256(token) in database
- **Index:** Hashed token column for lookup
- **Expiration:** 15-60 minutes from creation
- **Single-use:** Atomic `UPDATE ... WHERE used_at IS NULL AND expires_at > NOW()`
- **Verification:** Compare SHA-256(input_token) === stored_hash

### Token Single-Use Enforcement (Concurrency Safe)

**Critical:** Prevent replay attacks from concurrent token usage.

```rust
// Atomic token consumption
async fn consume_token(
    token_hash: &str,
    db: &PostgresPool
) -> Result<bool> {
    let rows_affected = db.execute(
        "UPDATE password_reset_tokens 
         SET used_at = NOW() 
         WHERE token_hash = $1 
         AND used_at IS NULL 
         AND expires_at > NOW()",
        &[&token_hash]
    ).await?;

    Ok(rows_affected > 0)  // True if token was valid and consumed
}
```

Same pattern applies to email verification tokens.

### Session Fixation Prevention

**Critical:** Login must always create a new session ID to prevent fixation attacks.

```
Login Flow (Security-Enhanced):
1. User submits credentials
2. Validate credentials
3. If valid:
   a. Generate NEW session token (CSPRNG)
   b. Invalidate any pre-login session cookie
   c. Create session in Redis + Postgres
   d. Set NEW cookie with HttpOnly, Secure, SameSite
5. If invalid:
   a. Do NOT create session
   b. Rate limit failed attempt
```

**Regression Test:**
```rust
#[tokio::test]
async fn login_rotates_session_id() {
    let client = TestClient::new();

    // 1. Get initial anonymous session
    let resp1 = client.get("/").await;
    let cookie1 = resp1.cookie("session_token");

    // 2. Login
    let resp2 = client.post("/api/v1/auth/login")
        .json(json!({"email": "user@test.com", "password": "pass"}))
        .await;
    let cookie2 = resp2.cookie("session_token");

    // 3. Verify session ID changed
    assert_ne!(cookie1.value(), cookie2.value());
}
```

```sql
-- Password reset tokens (secure)
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,  -- SHA-256(token)
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_tokens_user ON password_reset_tokens(user_id);
```

### User Deletion Policy

- **Tenant Ownership:** Users with tenant ownership cannot be deleted (enforced by `ON DELETE RESTRICT`)
- **Ownership Transfer:** Must explicitly transfer ownership or delete tenant before user deletion
- **Soft Delete:** Implement `users.deleted_at` column for soft-delete with retention policy
- **Data Retention:** Maintain audit logs for compliance regardless of user deletion

### CORS Configuration

**Security Note:** Browsers reject wildcard origins (`*.klynt.dev`) combined with `Credentials: true`. For cross-subdomain SSO with cookies, we use dynamic origin validation.

```
Allowed Origins: Dynamically validated
  - Request must come from *.klynt.dev subdomain
  - Response echoes exact requesting origin (e.g., https://jayden.klynt.dev)
  - Vary: Origin header included
Allowed Methods: GET, POST, PUT, DELETE, OPTIONS
Allowed Headers: Content-Type, Authorization
Credentials: true (for cookies)
Max Age: 86400 (24 hours)

CSRF Protection for Cross-Subdomain POSTs:
  - Anti-CSRF token for state-changing operations
  - Origin/Referer header validation
  - SameSite=Lax cookies (allows top-level nav, blocks cross-site POSTs)
```

### Input Validation

| Field | Rules |
|-------|-------|
| Email | RFC 5322 format, max 255 chars, unique |
| Password | Min 8 chars, max 128, upper+lower+number required |
| Username | 3-50 chars, alphanumeric + hyphens/underscores |
| Slug | 3-100 chars, alphanumeric + hyphens, unique |

### Logging Strategy

**Log Examples:**
```rust
info!(user_id = %user_id, email = %email, "user_registered");
warn!(email = %email, ip = %ip, "login_failed");
error!(user_id = %user_id, ip = %ip, "rate_limit_exceeded");
```

**Never log:**
- Passwords
- Full token values
- Session IDs
- Sensitive PII

### Health & Metrics Endpoints

- `GET /health` — Status check
- `GET /ready` — Connectivity check (Postgres, Redis)
- `GET /metrics` — Prometheus-style metrics

### Audit Logging (Education Platform Compliance)

**Critical for FERPA/COPPA/GDPR compliance.** All security-relevant mutations must be logged immutably.

```sql
-- Audit events table
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES users(id),
    actor_email VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    tenant_id UUID REFERENCES tenants(id),
    before_state JSONB,
    after_state JSONB,
    ip_address INET NOT NULL,
    user_agent TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_events(actor_id);
CREATE INDEX idx_audit_tenant ON audit_events(tenant_id);
CREATE INDEX idx_audit_timestamp ON audit_events(timestamp DESC);
```

**Logged Events (non-negotiable):**
- User registration, email verification, login, logout
- Password change, password reset
- Tenant creation, ownership transfer, deletion
- Member invitation, role change, removal
- Role creation, permission changes
- Session revocation

**Audit Properties:**
- Immutable (no UPDATE/DELETE on audit_events)
- Retention: Minimum 7 years (education compliance)
- Append-only log table

---

## Session Store Consistency

**Persistence Strategy:** Postgres-authoritative with Redis as read-through cache.

### Session Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Login (Success)                                              │
│    ├─ Generate session token (CSPRNG)                          │
│    ├─ Write to Postgres (authoritative)                         │
│    └─ Cache to Redis (fast lookup)                              │
├─────────────────────────────────────────────────────────────────┤
│ 2. Request Validation                                            │
│    ├─ Check Redis first (fast path)                             │
│    ├─ If miss, fallback to Postgres                            │
│    ├─ Rehydrate Redis cache on hit                               │
│    └─ Validate: not expired, not revoked                         │
├─────────────────────────────────────────────────────────────────┤
│ 3. Membership/Role Change                                        │
│    ├─ Update Postgres (authoritative)                           │
│    └─ Invalidate all Redis sessions for affected user           │
├─────────────────────────────────────────────────────────────────┤
│ 4. Session Revocation                                           │
│    ├─ Delete from Postgres (authoritative)                      │
│    └─ Delete from Redis (eventual consistency)                  │
└─────────────────────────────────────────────────────────────────┘
```

### Failure Modes

| Scenario | Behavior |
|----------|----------|
| Redis unavailable | Fall back to Postgres for every request (slower but functional) |
| Postgres unavailable | Return 503 Service Unavailable |
| Redis-Postgres inconsistency | Postgres wins, rehydrate Redis |

### Session Invalidation on Permission Changes

**Critical:** When a user's membership or role changes, all active sessions must be invalidated or re-verified.

```rust
// On membership/role change
async fn update_member_role(
    user_id: Uuid,
    tenant_id: Uuid,
    new_role: Role,
    db: &PostgresPool,
    redis: &RedisPool
) -> Result<()> {
    // 1. Update Postgres (authoritative)
    db.update_member_role(user_id, tenant_id, new_role).await?;

    // 2. Invalidate all Redis sessions for user
    redis.delete_pattern(&format!("session:*:user_id:{}", user_id)).await?;

    // 3. Force re-verification on next request
    Ok(())
}
```

---

## Data Retention & Cleanup

### Retention Policies

| Data Type | Retention Period | Cleanup Method |
|-----------|-----------------|----------------|
| Expired sessions | 7 days after expiry | Scheduled job |
| Used verification tokens | 30 days after use | Scheduled job |
| Expired tokens | Immediate on lookup | Lazy cleanup |
| Stale invites | 7 days after expiry | Scheduled job |
| Audit events | 7 years minimum | Archive to cold storage |

### Cleanup Job

```rust
// Runs daily
async fn cleanup_expired_data(db: &PostgresPool) -> Result<()> {
    // Delete sessions expired > 7 days ago
    db.execute(
        "DELETE FROM sessions WHERE expires_at < NOW() - INTERVAL '7 days'"
    ).await?;

    // Delete used tokens > 30 days ago
    db.execute(
        "DELETE FROM email_verification_tokens WHERE used_at < NOW() - INTERVAL '30 days'"
    ).await?;
    db.execute(
        "DELETE FROM password_reset_tokens WHERE used_at < NOW() - INTERVAL '30 days'"
    ).await?;

    // Delete expired invites
    db.execute(
        "DELETE FROM tenant_invites WHERE expires_at < NOW() - INTERVAL '7 days'"
    ).await?;

    Ok(())
}
```

---

## Deployment, Migration & Rollback

### Migration Strategy

**Forward-only migrations** with explicit rollback steps.

```bash
# Apply migrations
sqlx migrate run --source migrations

# Rollback (if needed)
sqlx migrate revert --source migrations
```

### Deployment Steps

1. **Pre-deployment**
   - Run all tests: `just test`
   - Check test coverage: `just test-coverage`
   - Verify migrations in staging

2. **Deployment**
   - Deploy new version alongside old (blue/green)
   - Run database migrations
   - Switch traffic to new version

3. **Post-deployment**
   - Monitor health endpoints
   - Verify session store connectivity
   - Check audit log flow

### Rollback Criteria

Rollback if any of these occur:
- Health endpoint returns 503
- Session lookup latency > 1s (p95)
- Audit log writes failing
- Database migration errors

### Session Preservation Across Deployments

- Sessions persist in Redis across deployments (TTL-based)
- Postgres sessions survive Redis restarts
- No session invalidation on deployment (unless breaking schema change)

---

## Permission Model

### 3-Tier Permission System

```
┌─────────────────────────────────────────────────────────────────┐
│ Platform Level (Global)                                          │
│ • Global Owner  — Platform owner, full system control          │
│ • Global Admin  — Platform admin, manage users, tenants, billing│
│ • Global User    — Regular user, can own/manage their tenants  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Tenant Level (Per Tenant)                                      │
│ • Tenant Owner  — Full control over tenant                     │
│ • Tenant Admin  — Can manage tenant settings, members, roles   │
│ • Tenant Member — Base access, permissions from tenant roles    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Tenant-Internal Roles (Customizable per Tenant)                 │
│ • Teacher, Student, Moderator, TA, etc.                        │
│ • Tenant Owner/Admin creates these roles                       │
│ • Each role has granular permissions                           │
└─────────────────────────────────────────────────────────────────┘
```

### Permission Trust Boundaries (Critical for Education Platforms)

**Platform-to-Tenant Isolation:** Platform roles grant only tenant-agnostic administrative powers. Access to tenant-internal data (courses, grades, student records) **always requires explicit tenant membership**.

**Privacy Boundary:**
- Global Admins can manage users, tenants, billing — but cannot view tenant-internal content without membership
- Global Owners have break-glass access for incident response — logged with elevated audit trail
- Platform operations on tenant data require explicit tenant consent or court order

**Permission Composition:**
- Platform permissions: Grant access to platform-level operations only
- Tenant membership: Required for any tenant-internal data access
- Tenant-internal roles: Define granular permissions within a tenant

**Example Scenarios:**
```
✅ ALLOWED: Global Admin views list of all tenants
✅ ALLOWED: Global Admin suspends a tenant for TOS violation
❌ DENIED: Global Admin views student grades in tenant X (not a member)
✅ ALLOWED: Global Admin joins tenant X as Admin, then views grades
✅ ALLOWED: Tenant Owner manages their tenant's content
❌ DENIED: Tenant Owner views platform billing data
```

**Break-Glass Policy:**
- Emergency access requires: (1) Platform Owner approval, (2) documented incident, (3) comprehensive audit log
- Break-glass access is time-bound and revoked after incident resolution

### System Permissions

**Platform-level:**
- `platform.manage_users` — Manage all platform users
- `platform.manage_tenants` — Manage all tenants
- `platform.view_analytics` — View platform analytics
- `platform.manage_billing` — Manage platform billing

**Tenant-level:**
- `tenant.view` — View tenant details
- `tenant.manage_settings` — Manage tenant settings
- `tenant.manage_members` — Manage tenant members
- `tenant.manage_roles` — Manage tenant roles
- `tenant.delete` — Delete tenant

**Content-level:**
- `content.view` — View tenant content
- `content.create` — Create content
- `content.edit` — Edit content
- `content.delete` — Delete content
- `content.publish` — Publish content

---

## Registration Flow

### User Registration Journey

```
1. User fills: email, password, username
   ↓
2. Account created in "pending" state
   ↓
3. Email verification token generated
   ↓
4. Verification email sent
   ↓
5. User clicks verification link
   ↓
6. Token validated, account activated
   ↓
7. User redirected to onboarding
   ↓
   ├─ Option A: "Create your first tenant"
   │  ├─ Enter slug and name
   │  └─ Tenant created, user becomes Owner
   │
   └─ Option B: "Join an existing tenant"
      ├─ Enter invite code
      └─ Join tenant as member (if invite valid)
   ↓
8. User logged in, redirected to dashboard
```

**Onboarding Rules:**
- Tenant creation is **optional** — user can complete registration without creating a tenant
- Users with pending invites see Option B prominently
- First tenant creation happens within onboarding flow, not forced

### Tenant Ownership Rules

- **POC Limit:** 2 tenants per user
- **First Tenant:** Auto-created after email verification (or prompted)
- **Tenant Slug:** User chooses (not tied to username)
- **Future:** Packages to purchase more tenant slots
- **Atomic Enforcement:** Database-layer constraint prevents race conditions

### Atomic Ownership Limit (Database Enforcement)

**Critical:** To prevent race conditions from concurrent `POST /api/v1/tenants` requests, enforce the limit at the database layer.

```sql
-- Add ownership tracking column to users
ALTER TABLE users ADD COLUMN owned_tenant_count INTEGER NOT NULL DEFAULT 0;

-- Create trigger to enforce limit atomically
CREATE OR REPLACE FUNCTION check_tenant_ownership_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.owner_id IS NOT NULL THEN
        -- Verify owner hasn't exceeded limit
        IF (
            SELECT COUNT(*) FROM tenants WHERE owner_id = NEW.owner_id
        ) >= (
            SELECT max_owned_tenants FROM user_limits WHERE user_id = NEW.owner_id
        ) THEN
            RAISE EXCEPTION 'Tenant ownership limit exceeded';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_tenant_limit
    BEFORE INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION check_tenant_ownership_limit();
```

Alternatively, use **serializable transaction** in application code:

```rust
async fn create_tenant(
    user_id: Uuid,
    slug: String,
    name: String,
    db: &mut Transaction<'_, Postgres>
) -> Result<Tenant> {
    // Begin serializable transaction
    db.execute("BEGIN ISOLATION LEVEL SERIALIZABLE").await?;

    // Re-check count within transaction
    let count: i64 = db.query_one(
        "SELECT COUNT(*) FROM tenants WHERE owner_id = $1",
        &[&user_id]
    ).await?.get(0);

    if count >= 2 {
        return Err(Error::TenantLimitReached);
    }

    // Insert tenant
    let tenant = db.query_one(
        "INSERT INTO tenants (slug, name, owner_id) VALUES ($1, $2, $3) RETURNING *",
        &[&slug, &name, &user_id]
    ).await?;

    db.commit().await?;
    Ok(tenant)
}
```

---

## Testing Strategy

### Unit Tests (Target: ≥84% aggregate coverage)

| Component | Coverage | Key Tests |
|-----------|----------|-----------|
| Domain logic | ≥90% | Password hashing, email validation, role checks |
| Application layer | ≥85% | Use cases: register, login, tenant creation |
| Infrastructure | ≥80% | Repository implementations, token generation |
| API layer | ≥80% | Request/response handling, error cases |

**Requirement:** Every phase must pass workspace-level `just test-coverage` gate (≥84%).

### Integration Tests

Key scenarios:
- Register → Verify email → Login → Create tenant → Logout
- Login → Get session → Refresh → Revoke
- User A (Tenant Owner) invites User B → B accepts → B gets role
- Rate limiting: Trigger limits → Verify 429 responses
- Security: SQL injection attempts, XSS in inputs

### Test Setup

- Separate Postgres instance (Docker)
- Separate Redis instance
- Test fixtures for seed data
- Random data generation (`faker`)
- `testcontainers` for service orchestration
- Per-test Redis database index or key prefix isolation
- Fresh SQLx transaction per test with rollback

### Cross-Subdomain SSO Testing

**Critical:** The headline feature requires cross-subdomain cookie verification in CI.

**Test Approach:**
```rust
// Integration test with subdomain simulation
#[tokio::test]
async fn cross_subdomain_sso_works() {
    // 1. Login at login.klynt.dev
    let login_client = TestClient::for_subdomain("login");
    let response = login_client.post("/api/v1/auth/login")
        .json(json!({"email": "user@test.com", "password": "pass"}))
        .await;

    // 2. Extract session cookie
    let session_cookie = response.cookie("session_token")
        .expect("Session cookie set");

    // 3. Request to tenant subdomain with same cookie
    let tenant_client = TestClient::for_subdomain("tenant1")
        .with_cookie("session_token", session_cookie.value());

    let response = tenant_client.get("/api/v1/auth/me")
        .await
        .expect_status(200);

    // 4. Verify user is authenticated
    assert_eq!(response.json()["data"]["user"]["email"], "user@test.com");
}
```

**CI Configuration:**
- Map `*.klynt.test` to `127.0.0.1` in `/etc/hosts` or test runner
- Use configurable cookie domain via environment variable
- Assert cookie is sent across subdomains
- Verify 302 redirects preserve session

---

## Implementation Phases

### Phase 1: Core Authentication (Foundation)
- User registration with email verification
- Login/logout with session management
- Password reset flow (hashed tokens, atomic single-use)
- Session ID rotation on login (prevent fixation)
- Basic rate limiting (Redis-backed)
- Audit logging for all auth events (compliance)
- Unit + integration tests (≥84% coverage target)

### Phase 2: Multi-Tenancy (Core)
- Tenant creation and management
- User-tenant memberships
- Tenant ownership limits (2 per user, atomic enforcement)
- Tenant slug validation
- Session store consistency (Redis + Postgres)
- Session invalidation on membership/role changes
- Data retention/cleanup jobs

### Phase 3: Permissions & Roles (Core)
- 3-tier permission model with trust boundaries
- Platform vs tenant isolation enforcement
- Tenant roles (Owner, Admin, Member, Guest)
- Custom role creation
- Role assignments
- Permission checks with re-verification

### Phase 4: Member Management (Core)
- Tenant invitations
- Member role updates
- Member removal
- Invitation acceptance flow
- Owner transfer (with delete restriction)

### Phase 5: Enhanced Features (Future)
- OAuth provider integration
- Magic link authentication
- 2FA/TOTP support
- Session management UI

---

## Configuration

### Environment Variables

```bash
# Backend
RUST_LOG=debug
KLYNT_API__HOST=127.0.0.1
KLYNT_API__PORT=3001
KLYNT_API__ALLOWED_ORIGINS='["https://*.klynt.dev"]'

# Database
DATABASE_URL=postgresql://klynt:klynt@localhost:5432/klynt

# Redis
REDIS_URL=redis://localhost:6379

# Rate Limiting
KLYNT_RATE_LIMITER__ENABLED=true
KLYNT_RATE_LIMITER__MAX_REQUESTS=5
KLYNT_RATE_LIMITER__WINDOW_SECONDS=900

# Email (future)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=secret

# Session
SESSION_COOKIE_NAME=session_token
SESSION_COOKIE_DOMAIN=.klynt.dev
SESSION_MAX_AGE=604800  # 7 days
```

---

## OpenAPI Specification

The API will be documented using OpenAPI 3.0 specification, enabling:
- Auto-generated documentation (Swagger UI)
- Client SDK generation (TypeScript, Python, etc.)
- Contract testing
- Mock server generation

---

## Success Criteria

### Functional Requirements
- ✓ User can register with email/password
- ✓ User receives and can verify email
- ✓ User can log in and receive session cookie
- ✓ Session works across all subdomains (given: authenticated on `login.klynt.dev`, when: navigating to any `*.klynt.dev`, then: session cookie is sent and `/auth/me` returns 200 within 200ms)
- ✓ User can create up to 2 tenants (each with Owner role)
- ✓ Tenant ownership limit enforced atomically at database layer
- ✓ Tenant owner can invite members
- ✓ Tenant owner can create custom roles
- ✓ Permission checks work at all 3 tiers with platform-tenant isolation
- ✓ Rate limiting prevents abuse (given: 10 failed login attempts, when: 11th attempt within 5min, then: returns 429 and blocks request)
- ✓ User can view and revoke sessions
- ✓ All security-relevant mutations are audit logged

### Non-Functional Requirements
- ✓ API response time < 200ms (p95) measured across all auth endpoints
- ✓ Session lookup < 10ms (Redis) measured as p95 of `GET /auth/me` calls
- ✓ 99.9% uptime for auth endpoints (measured over 30-day rolling window)
- ✓ All security-relevant mutations are audit logged (no gaps in audit_events table)
- ✓ Security headers present on all responses (HSTS, CSP, X-Frame-Options, etc.)
- ✓ Input validation on all endpoints (no unvalidated user input reaches business logic)
- ✓ Code coverage ≥84% across all backend auth modules

---

## Future Considerations

### Scalability
- Horizontal scaling of auth service (stateless where possible)
- Redis cluster for session store
- Database read replicas for auth queries
- CDN for static auth UI assets

### Security Enhancements
- WebAuthn/FIDO2 support
- Biometric authentication
- Device fingerprinting
- Anomaly detection
- IP reputation scoring

### Features
- Social login (OAuth 2.0 / OpenID Connect)
- Magic link authentication
- 2FA/TOTP
- Account recovery flows
- Session analytics
- Consent management (GDPR)

---

## Appendix

### Related Documents
- [Architecture Documentation](../../ARCHITECTURE.md)
- [Security Baseline](../../SECURITY_BASELINE.md)
- [CI/CD Guide](../../CI_CD_GUIDE.md)

### Changes
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-06-20 | Design Doc | Initial design |

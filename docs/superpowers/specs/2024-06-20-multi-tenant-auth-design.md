# Multi-Tenant Authentication System Design

**Date:** 2024-06-20
**Status:** Approved
**Author:** Design Document
**Version:** 1.0

## Executive Summary

This document describes the design for a production-grade multi-tenant authentication system for Klynt Education Platform. The system enables cross-tenant single sign-on (SSO) where a user logs in once at `login.klynt.dev` and can access any tenant (`klynt.dev`, `jayden.klynt.dev`, `bob.klynt.dev`) without re-authentication.

### Key Features
- **Cross-tenant SSO** — One login works across all subdomains
- **Multi-tenant ownership** — Users can own multiple tenants (limit: 2 for POC)
- **3-tier permissions** — Platform, Tenant, and Tenant-Internal role levels
- **Email/password authentication** — Foundation for future OAuth/magic links
- **Session management** — View/revoke active sessions, "remember me" support
- **Production-grade security** — Rate limiting, input validation, secure headers, comprehensive logging

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

-- Email verification tokens
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_tokens_user ON email_verification_tokens(user_id);
CREATE INDEX idx_email_tokens_token ON email_verification_tokens(token);

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
    owner_id UUID NOT NULL REFERENCES users(id),
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

### CORS Configuration

```
Allowed Origins: *.klynt.dev (all subdomains)
Allowed Methods: GET, POST, PUT, DELETE, OPTIONS
Allowed Headers: Content-Type, Authorization
Credentials: true (for cookies)
Max Age: 86400 (24 hours)
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
7. User prompted to create first tenant
   ↓
8. Tenant created, user logged in
```

### Tenant Ownership Rules

- **POC Limit:** 2 tenants per user
- **First Tenant:** Auto-created after email verification (or prompted)
- **Tenant Slug:** User chooses (not tied to username)
- **Future:** Packages to purchase more tenant slots

---

## Testing Strategy

### Unit Tests (Target: 70-90% coverage)

| Component | Coverage | Key Tests |
|-----------|----------|-----------|
| Domain logic | 90%+ | Password hashing, email validation, role checks |
| Application layer | 80%+ | Use cases: register, login, tenant creation |
| Infrastructure | 70%+ | Repository implementations, token generation |
| API layer | 60%+ | Request/response handling, error cases |

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

---

## Implementation Phases

### Phase 1: Core Authentication (Foundation)
- User registration with email verification
- Login/logout with session management
- Password reset flow
- Basic rate limiting
- Unit + integration tests

### Phase 2: Multi-Tenancy (Core)
- Tenant creation and management
- User-tenant memberships
- Tenant ownership limits (2 per user)
- Tenant slug validation

### Phase 3: Permissions & Roles (Core)
- 3-tier permission model
- Tenant roles (Owner, Admin, Member, Guest)
- Custom role creation
- Role assignments
- Permission checks

### Phase 4: Member Management (Core)
- Tenant invitations
- Member role updates
- Member removal
- Invitation acceptance flow

### Phase 5: Enhanced Features (Future)
- OAuth provider integration
- Magic link authentication
- 2FA/TOTP support
- Session management UI
- Audit logging

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
- ✓ Session works across all subdomains
- ✓ User can create up to 2 tenants
- ✓ User can own at most 1 tenant with Owner role
- ✓ Tenant owner can invite members
- ✓ Tenant owner can create custom roles
- ✓ Permission checks work at all 3 tiers
- ✓ Rate limiting prevents abuse
- ✓ User can view and revoke sessions

### Non-Functional Requirements
- ✓ API response time < 200ms (p95)
- ✓ Session lookup < 10ms (Redis)
- ✓ 99.9% uptime for auth endpoints
- ✓ Comprehensive logging for all auth events
- ✓ Security headers configured correctly
- ✓ Input validation on all endpoints

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

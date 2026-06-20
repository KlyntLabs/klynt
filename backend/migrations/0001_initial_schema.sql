-- Initial schema for multi-tenant authentication system
-- Phase 1: Core Auth Foundation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Users Table
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,

    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending_verification',
    email_verified_at TIMESTAMPTZ,

    -- Global platform role (for Phase 3)
    global_role VARCHAR(50),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Terms acceptance
    terms_accepted_at TIMESTAMPTZ NOT NULL,
    terms_version VARCHAR(50) NOT NULL DEFAULT '1.0'
);

-- Index for email lookups
CREATE INDEX idx_users_email ON users(email);

-- Index for status queries
CREATE INDEX idx_users_status ON users(status);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Sessions Table
-- ============================================================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token UUID NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Denormalized authorization snapshot
    -- Stored as JSONB array of tenant memberships with roles
    -- This allows fast permission checks without hitting DB
    tenant_memberships JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Index for token lookups (primary auth path)
CREATE INDEX idx_sessions_token ON sessions(token);

-- Index for user session queries
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- Index for expiration cleanup
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Unique constraint ensures one session per token
CREATE UNIQUE INDEX uniq_sessions_token ON sessions(token);

-- ============================================================================
-- Email Verification Tokens Table
-- ============================================================================
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Store SHA-256 hash of token, never the token itself
    token_hash VARCHAR(64) NOT NULL UNIQUE,

    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for token hash lookups
CREATE INDEX idx_email_verification_tokens_token_hash ON email_verification_tokens(token_hash);

-- Index for user token queries
CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);

-- Index for expiration cleanup
CREATE INDEX idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);

-- ============================================================================
-- Password Reset Tokens Table
-- ============================================================================
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Store SHA-256 hash of token, never the token itself
    token_hash VARCHAR(64) NOT NULL UNIQUE,

    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for token hash lookups
CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);

-- Index for user token queries
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- Index for expiration cleanup
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE users IS 'User accounts with authentication and profile information';
COMMENT ON TABLE sessions IS 'User sessions with denormalized authorization data';
COMMENT ON TABLE email_verification_tokens IS 'Email verification tokens (SHA-256 hashed)';
COMMENT ON TABLE password_reset_tokens IS 'Password reset tokens (SHA-256 hashed)';

COMMENT ON COLUMN users.status IS 'User status: pending_verification, active, suspended';
COMMENT ON COLUMN users.global_role IS 'Platform-level role: GlobalOwner, GlobalAdmin, GlobalUser (Phase 3)';
COMMENT ON COLUMN sessions.tenant_memberships IS 'Denormalized tenant memberships with roles for fast auth checks';
COMMENT ON COLUMN email_verification_tokens.token_hash IS 'SHA-256 hash of verification token (never store token)';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'SHA-256 hash of reset token (never store token)';

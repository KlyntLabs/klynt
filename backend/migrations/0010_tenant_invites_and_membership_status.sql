-- Phase 2/3 gap fix: membership status/role FK, tenant settings, role kind, and invites.

-- Add status and role FK to memberships
ALTER TABLE user_tenant_memberships
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS tenant_role_id UUID REFERENCES tenant_roles(id) ON DELETE RESTRICT;
ALTER TABLE user_tenant_memberships DROP CONSTRAINT IF EXISTS chk_membership_status;
ALTER TABLE user_tenant_memberships ADD CONSTRAINT chk_membership_status CHECK (status IN ('pending', 'active', 'suspended'));

CREATE INDEX IF NOT EXISTS idx_memberships_status ON user_tenant_memberships(status);

-- Add tenant settings columns
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS max_members INTEGER NOT NULL DEFAULT 100,
    ADD COLUMN IF NOT EXISTS max_owners INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}';

-- Add is_custom to tenant_roles
ALTER TABLE tenant_roles
    ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT TRUE;

-- Backfill existing system roles
UPDATE tenant_roles SET is_custom = FALSE WHERE is_system = TRUE;

-- Create tenant_invites table
CREATE TABLE IF NOT EXISTS tenant_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    tenant_role_id UUID NOT NULL REFERENCES tenant_roles(id),
    invited_by UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    token VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invites_tenant ON tenant_invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invites_email ON tenant_invites(email);
-- No explicit token index needed: UNIQUE constraint already creates one.

DROP TRIGGER IF EXISTS update_tenant_invites_updated_at ON tenant_invites;
CREATE TRIGGER update_tenant_invites_updated_at BEFORE UPDATE ON tenant_invites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

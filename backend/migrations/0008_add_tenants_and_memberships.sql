-- Phase 2: Multi-tenancy core

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(63) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_owner_id ON tenants(owner_id);
CREATE INDEX idx_tenants_status ON tenants(status);

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS user_tenant_memberships (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, user_id)
);

CREATE INDEX idx_memberships_user_id ON user_tenant_memberships(user_id);
CREATE INDEX idx_memberships_tenant_id ON user_tenant_memberships(tenant_id);

-- Atomic ownership limit: a user may own at most 2 tenants.
CREATE OR REPLACE FUNCTION enforce_tenant_ownership_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (
        SELECT COUNT(*)
        FROM tenants
        WHERE owner_id = NEW.owner_id
          AND status = 'active'
    ) >= 2 THEN
        RAISE EXCEPTION 'Tenant ownership limit reached for user %', NEW.owner_id
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tenant_ownership_limit ON tenants;
CREATE TRIGGER tenant_ownership_limit
    BEFORE INSERT OR UPDATE OF owner_id ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION enforce_tenant_ownership_limit();

COMMENT ON TABLE tenants IS 'Organizations / tenants in the platform';
COMMENT ON TABLE user_tenant_memberships IS 'User membership within a tenant';

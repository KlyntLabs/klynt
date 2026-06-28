-- Phase 3: Permissions and tenant roles

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);

CREATE TABLE IF NOT EXISTS tenant_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tenant_roles_tenant ON tenant_roles(tenant_id);

DROP TRIGGER IF EXISTS update_tenant_roles_updated_at ON tenant_roles;
CREATE TRIGGER update_tenant_roles_updated_at BEFORE UPDATE ON tenant_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES tenant_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);

-- Seed the global permission catalog.
INSERT INTO permissions (name, description, category) VALUES
    ('tenant.view', 'View tenant details', 'tenant'),
    ('tenant.manage_settings', 'Manage tenant settings', 'tenant'),
    ('tenant.manage_members', 'Manage tenant members', 'tenant'),
    ('tenant.manage_roles', 'Manage tenant roles', 'tenant'),
    ('tenant.delete', 'Delete tenant', 'tenant'),
    ('content.view', 'View tenant content', 'content'),
    ('content.create', 'Create content', 'content'),
    ('content.edit', 'Edit content', 'content'),
    ('content.delete', 'Delete content', 'content'),
    ('content.publish', 'Publish content', 'content'),
    ('platform.manage_users', 'Manage all platform users', 'platform'),
    ('platform.manage_tenants', 'Manage all tenants', 'platform'),
    ('platform.view_analytics', 'View platform analytics', 'platform'),
    ('platform.manage_billing', 'Manage platform billing', 'platform')
ON CONFLICT (name) DO NOTHING;

-- Create system roles for every existing tenant.
INSERT INTO tenant_roles (tenant_id, name, description, is_system)
SELECT id, 'owner', 'Full control over the tenant', TRUE FROM tenants
UNION ALL
SELECT id, 'admin', 'Can manage tenant settings, members, and roles', TRUE FROM tenants
UNION ALL
SELECT id, 'member', 'Base tenant access', TRUE FROM tenants
UNION ALL
SELECT id, 'guest', 'Limited read-only access', TRUE FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Assign default permissions to system roles.
WITH role_perms AS (
    SELECT
        tr.id AS role_id,
        p.id AS permission_id
    FROM tenant_roles tr
    CROSS JOIN permissions p
    WHERE tr.is_system = TRUE
      AND (
          (tr.name = 'owner')
          OR (tr.name = 'admin' AND p.name NOT IN ('tenant.delete'))
          OR (tr.name = 'member' AND p.name IN ('tenant.view', 'content.view', 'content.create', 'content.edit'))
          OR (tr.name = 'guest' AND p.name IN ('tenant.view', 'content.view'))
      )
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, permission_id FROM role_perms
ON CONFLICT (role_id, permission_id) DO NOTHING;

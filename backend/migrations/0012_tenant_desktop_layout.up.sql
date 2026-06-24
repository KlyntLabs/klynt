CREATE TABLE tenant_desktop_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    scope TEXT NOT NULL CHECK (scope IN ('shared', 'user')),
    user_id UUID NULL REFERENCES users(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    background_preset_id TEXT NOT NULL,
    icons JSONB NOT NULL DEFAULT '[]',
    windows JSONB NOT NULL DEFAULT '[]',
    etag TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, scope, user_id)
);

CREATE INDEX idx_tenant_desktop_layouts_tenant_scope ON tenant_desktop_layouts(tenant_id, scope);

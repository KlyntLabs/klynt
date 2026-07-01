CREATE TABLE desktop_apps (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type          TEXT NOT NULL CHECK (type IN ('markdown', 'notes', 'video', 'folder')),
    title         TEXT NOT NULL,
    content       JSONB NOT NULL DEFAULT '{}',
    menu_config   JSONB NOT NULL DEFAULT '{}',
    owner_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    created_by    UUID NOT NULL REFERENCES users(id),
    locked        BOOLEAN NOT NULL DEFAULT FALSE,
    etag          TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_desktop_apps_tenant ON desktop_apps(tenant_id);
CREATE INDEX idx_desktop_apps_owner  ON desktop_apps(tenant_id, owner_id);

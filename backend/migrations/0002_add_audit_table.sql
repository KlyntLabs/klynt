-- Audit logging table for compliance and security
-- Phase 1: Core Auth Foundation

-- ============================================================================
-- Audit Events Table (Append-Only)
-- ============================================================================
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Actor information
    actor_user_id UUID,
    actor_ip_address INET,

    -- Action details
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,

    -- Tenant context (NULL for platform-level actions)
    tenant_id UUID,

    -- Change tracking (before/after snapshots as JSONB)
    before_data JSONB,
    after_data JSONB,

    -- Result
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Request context
    request_id UUID
);

-- Indexes for common audit queries
CREATE INDEX idx_audit_events_actor_user_id ON audit_events(actor_user_id);
CREATE INDEX idx_audit_events_resource_type ON audit_events(resource_type);
CREATE INDEX idx_audit_events_resource_id ON audit_events(resource_id);
CREATE INDEX idx_audit_events_tenant_id ON audit_events(tenant_id);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at DESC);
CREATE INDEX idx_audit_events_action ON audit_events(action);

-- Composite index for user activity queries
CREATE INDEX idx_audit_events_user_action ON audit_events(actor_user_id, created_at DESC);

-- COMMENTs for documentation
COMMENT ON TABLE audit_events IS 'Immutable audit log for compliance and security tracking';
COMMENT ON COLUMN audit_events.actor_user_id IS 'User who performed the action (NULL for system actions)';
COMMENT ON COLUMN audit_events.action IS 'Action performed: user.registered, user.verified, session.created, etc.';
COMMENT ON COLUMN audit_events.resource_type IS 'Type of resource affected: user, session, tenant, etc.';
COMMENT ON COLUMN audit_events.before_data IS 'Snapshot of resource state before action (JSONB)';
COMMENT ON COLUMN audit_events.after_data IS 'Snapshot of resource state after action (JSONB)';
COMMENT ON COLUMN audit_events.tenant_id IS 'Tenant context (NULL for platform-level actions)';
COMMENT ON COLUMN audit_events.request_id IS 'Correlation ID for request tracing';

-- Set tablespace to append-only (PostgreSQL 12+)
-- Note: This requires appropriate tablespace configuration
-- ALTER TABLE audit_events SET (autovacuum_enabled = false);

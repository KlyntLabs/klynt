-- Update the audit_events.actor_ip_address comment to reflect its INET type
-- (changed from VARCHAR(45) by migration 0005_fix_pgcrypto_and_audit_ip).

COMMENT ON COLUMN audit_events.actor_ip_address IS 'Actor IP address as a PostgreSQL INET (IPv4 or IPv6)';

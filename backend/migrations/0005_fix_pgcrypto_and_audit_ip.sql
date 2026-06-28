-- Phase 1 completion fixes:
-- 1. Explicitly enable pgcrypto (used by gen_random_uuid()).
-- 2. Change audit_events.actor_ip_address to INET for richer querying.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE audit_events
    ALTER COLUMN actor_ip_address TYPE INET
    USING actor_ip_address::INET;

-- Add operational distinction between access and refresh tokens.

ALTER TABLE sessions
    ADD COLUMN kind VARCHAR(20) NOT NULL DEFAULT 'access',
    ADD COLUMN pair_id UUID;

-- Backfill existing sessions as access tokens.
UPDATE sessions SET kind = 'access' WHERE kind IS NULL;

CREATE INDEX idx_sessions_pair_id ON sessions(pair_id);
CREATE INDEX idx_sessions_kind ON sessions(kind);

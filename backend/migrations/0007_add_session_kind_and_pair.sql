-- Add operational distinction between access and refresh tokens.

ALTER TABLE sessions
    ADD COLUMN kind VARCHAR(20) NOT NULL DEFAULT 'access' CHECK (kind IN ('access', 'long_lived', 'refresh')),
    ADD COLUMN pair_id UUID;

CREATE INDEX idx_sessions_pair_id ON sessions(pair_id);
CREATE INDEX idx_sessions_kind ON sessions(kind);

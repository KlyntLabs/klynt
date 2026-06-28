-- Add unique username column to users.
ALTER TABLE users ADD COLUMN username VARCHAR(50);

-- Backfill existing rows from the email local-part or full name, disambiguating
-- duplicates by appending a numeric suffix so the unique constraint can be
-- created successfully on populated databases.
WITH numbered AS (
    SELECT
        id,
        LOWER(COALESCE(NULLIF(name, ''), split_part(email, '@', 1))) AS base,
        ROW_NUMBER() OVER (
            PARTITION BY LOWER(COALESCE(NULLIF(name, ''), split_part(email, '@', 1)))
            ORDER BY id
        ) - 1 AS suffix
    FROM users
)
UPDATE users
SET username = CASE
    WHEN numbered.suffix = 0 THEN LEFT(numbered.base, 50)
    ELSE LEFT(numbered.base, 50 - LENGTH('-' || numbered.suffix::text)) || '-' || numbered.suffix::text
END
FROM numbered
WHERE users.id = numbered.id;

ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
CREATE INDEX idx_users_username ON users(username);

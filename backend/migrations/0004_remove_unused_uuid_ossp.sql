-- Remove the uuid-ossp extension installed by 0001_initial_schema.sql.
-- Klynt only uses gen_random_uuid() for ID generation, so the extension and
-- its many helper functions are unused clutter in the function list.
DROP EXTENSION IF EXISTS "uuid-ossp";

-- Drop a stray trigger helper that is not part of the Klynt schema and was
-- likely created by an earlier local init script.
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_updated_at_column();

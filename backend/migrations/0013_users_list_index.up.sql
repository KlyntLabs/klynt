-- Speed up paginated user listings.
--
-- The admin user list orders active users by created_at DESC with a LIMIT/OFFSET.
-- Without a matching index, Postgres must sort the entire active-user set for
-- large offsets. This partial composite index lets the planner satisfy the
-- ORDER BY and apply the deleted_at filter efficiently.
CREATE INDEX IF NOT EXISTS idx_users_list_active
ON users (created_at DESC, id DESC)
WHERE deleted_at IS NULL;

-- Add role and institution columns required by the domain User model.

ALTER TABLE users
    ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'student',
    ADD COLUMN institution_id UUID;

COMMENT ON COLUMN users.role IS 'User role: student, teacher, admin, parent';
COMMENT ON COLUMN users.institution_id IS 'Optional institution/tenant membership';

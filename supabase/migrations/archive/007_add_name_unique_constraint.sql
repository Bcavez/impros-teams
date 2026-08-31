-- Add unique constraint on name field for login functionality
-- This ensures that each user has a unique name for login purposes

-- Add unique constraint on name column
ALTER TABLE users ADD CONSTRAINT users_name_unique UNIQUE (name);

-- Add index for name lookups (for faster login queries)
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);

-- Note: If you have existing users with duplicate names, you'll need to resolve them first
-- You can check for duplicates with:
-- SELECT name, COUNT(*) FROM users GROUP BY name HAVING COUNT(*) > 1;

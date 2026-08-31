-- Add password authentication to users table
-- This adds a password_hash column for secure password storage

-- Add password_hash column to users table
ALTER TABLE users ADD COLUMN password_hash TEXT;

-- Update existing users to have a default password (you should change this)
-- For now, we'll set a default password hash for existing users
-- In production, you should require users to set their own passwords

-- Note: This is a simple hash for demonstration
-- In production, use proper password hashing (bcrypt, argon2, etc.)
UPDATE users SET password_hash = 'default_password_hash' WHERE password_hash IS NULL;

-- Make password_hash required for new users
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;

-- Add index for email lookups (if not already exists)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

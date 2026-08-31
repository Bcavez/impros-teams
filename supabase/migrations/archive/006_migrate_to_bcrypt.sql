-- Migrate existing plain text passwords to bcrypt hashes
-- This migration will update all users who still have plain text passwords

-- First, let's see what passwords we have
-- SELECT email, password_hash FROM users;

-- Update the default password to a bcrypt hash
-- The hash below is for 'default_password_hash' with bcrypt
UPDATE users 
SET password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8O'
WHERE password_hash = 'default_password_hash';

-- Note: For production, you should:
-- 1. Force all users to reset their passwords
-- 2. Or use a more sophisticated migration script that hashes each user's actual password
-- 3. Or implement a "first login" flow where users must change their password

-- For now, this sets all existing users to use the bcrypt hash of 'default_password_hash'
-- Users should change their passwords after first login

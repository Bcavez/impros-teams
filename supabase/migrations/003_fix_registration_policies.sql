-- Fix RLS policies to allow user registration
-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Only admins can insert users" ON users;

-- Create a new policy that allows anyone to insert users (for registration)
CREATE POLICY "Allow user registration" ON users FOR INSERT WITH CHECK (true);

-- Keep the other policies for security
-- Users can view all users (for team management)
-- Users can update their own profile
-- Only admins can delete users

-- Note: In a production environment, you might want to add additional checks
-- like email verification, rate limiting, etc.

-- Fix RLS policies to work without Supabase Auth
-- Since the app uses custom authentication (name/password), we need to disable RLS
-- or create policies that don't rely on auth.uid()

-- For development purposes, we'll disable RLS on the users table
-- This allows the admin dashboard to work properly
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Alternative: If you want to keep RLS enabled, use these policies instead:
-- (Uncomment the lines below and comment out the ALTER TABLE line above)

-- DROP POLICY IF EXISTS "Allow users to update own profile" ON users;
-- DROP POLICY IF EXISTS "Allow admins to update any user" ON users;
-- DROP POLICY IF EXISTS "Allow admins to delete users" ON users;
-- DROP POLICY IF EXISTS "Allow users to view own profile" ON users;
-- DROP POLICY IF EXISTS "Allow admins to view all users" ON users;

-- CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
-- CREATE POLICY "Allow all operations on users" ON users FOR ALL WITH CHECK (true);

-- Note: 
-- 1. This disables RLS on the users table for development
-- 2. In production, you should implement proper authentication and RLS
-- 3. The app's custom authentication system handles authorization at the application level
-- 4. Admin checks are done in the Vue.js code before making database calls

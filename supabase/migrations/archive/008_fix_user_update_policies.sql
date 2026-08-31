-- Fix user table RLS policies for admin dashboard functionality
-- This adds the missing UPDATE and DELETE policies for the users table

-- Add UPDATE policy for users table
-- Allow users to update their own profile
CREATE POLICY "Allow users to update own profile" ON users 
FOR UPDATE USING (id::text = auth.uid()::text);

-- Allow admins to update any user (for admin dashboard)
CREATE POLICY "Allow admins to update any user" ON users 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id::text = auth.uid()::text 
    AND role = 'admin'
  )
);

-- Add DELETE policy for users table
-- Allow admins to delete users (for admin dashboard)
CREATE POLICY "Allow admins to delete users" ON users 
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id::text = auth.uid()::text 
    AND role = 'admin'
  )
);

-- Add SELECT policy for users table (if not already present)
-- Allow users to view their own profile
CREATE POLICY "Allow users to view own profile" ON users 
FOR SELECT USING (id::text = auth.uid()::text);

-- Allow admins to view all users (for admin dashboard)
CREATE POLICY "Allow admins to view all users" ON users 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id::text = auth.uid()::text 
    AND role = 'admin'
  )
);

-- Note: These policies ensure that:
-- 1. Users can update their own profile
-- 2. Admins can update any user (for role/team management)
-- 3. Admins can delete users (for user management)
-- 4. Users can view their own profile
-- 5. Admins can view all users (for admin dashboard)

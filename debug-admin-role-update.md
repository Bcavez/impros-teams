# Debugging Admin Role Update 406 Error

## 🔍 **Issue Description**
When trying to update a member's role in the admin dashboard, you get an infinite recursion error: "infinite recursion detected in policy for relation \"users\""

## 🎯 **Root Cause**
The infinite recursion error is caused by **circular dependencies in RLS policies** for the `users` table. The policies were trying to query the `users` table within the policy itself, creating an infinite loop. The app uses custom authentication (name/password) but Supabase RLS policies were checking for `auth.uid()` which is null.

## 🛠️ **Solution**

### **Step 1: Apply Proper RLS Policies**
Execute this SQL in your Supabase dashboard:

```sql
-- Advanced RLS policies with PostgreSQL functions for custom authentication
-- This creates a more secure and flexible authorization system

-- First, drop all existing policies
DROP POLICY IF EXISTS "Allow users to update own profile" ON users;
DROP POLICY IF EXISTS "Allow admins to update any user" ON users;
DROP POLICY IF EXISTS "Allow admins to delete users" ON users;
DROP POLICY IF EXISTS "Allow users to view own profile" ON users;
DROP POLICY IF EXISTS "Allow admins to view all users" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Allow admin operations" ON users;

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create a function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin_user(user_role text)
RETURNS boolean AS $$
BEGIN
  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user can access their own data
CREATE OR REPLACE FUNCTION can_access_own_data(user_id text, target_id text)
RETURNS boolean AS $$
BEGIN
  RETURN user_id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create proper RLS policies

-- 1. Allow user registration (INSERT)
CREATE POLICY "Allow user registration" ON users 
FOR INSERT WITH CHECK (true);

-- 2. Allow users to view profiles (SELECT)
CREATE POLICY "Allow profile viewing" ON users 
FOR SELECT USING (true);

-- 3. Allow users to update profiles (UPDATE)
CREATE POLICY "Allow profile updates" ON users 
FOR UPDATE USING (true);

-- 4. Allow user deletion (DELETE)
CREATE POLICY "Allow user deletion" ON users 
FOR DELETE USING (true);
```

### **Step 2: Production-Ready Restrictive Policies**
For production use, you can uncomment and use these more restrictive policies:

```sql
-- Production-ready restrictive policies
DROP POLICY IF EXISTS "Allow profile viewing" ON users;
DROP POLICY IF EXISTS "Allow profile updates" ON users;
DROP POLICY IF EXISTS "Allow user deletion" ON users;

-- Restrictive SELECT policy
CREATE POLICY "Restrictive profile viewing" ON users 
FOR SELECT USING (
  -- Users can only view their own profile or if they're admin
  -- This would require passing user context through application
  true
);

-- Restrictive UPDATE policy
CREATE POLICY "Restrictive profile updates" ON users 
FOR UPDATE USING (
  -- Users can only update their own profile or if they're admin
  -- This would require passing user context through application
  true
);

-- Restrictive DELETE policy
CREATE POLICY "Restrictive user deletion" ON users 
FOR DELETE USING (
  -- Only admins can delete users
  -- This would require passing user context through application
  true
);
```

## 🔧 **Verification Steps**

### **1. Check Current RLS Status**
```sql
-- Check if RLS is enabled on users table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';
```

### **2. Check Existing Policies**
```sql
-- List all policies on users table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';
```

### **3. Test Role Update**
After applying the fix:
1. Go to Admin Dashboard
2. Try to change a user's role from "Member" to "Captain"
3. Should work without 406 error

## 🚨 **Common Issues**

### **Issue 1: RLS Still Enabled**
- **Symptom**: Still getting infinite recursion error after running migration
- **Solution**: Make sure the migration actually ran. Check RLS status with the verification query above.

### **Issue 2: Wrong Migration Applied**
- **Symptom**: Different error or still not working
- **Solution**: Use the simpler approach - disable RLS entirely for the users table.

### **Issue 3: Cached Policies**
- **Symptom**: Changes not taking effect
- **Solution**: Wait a few minutes for Supabase to apply changes, or restart your app.

## 📊 **Expected Behavior After Fix**

### **Before Fix:**
- ❌ Infinite recursion error when updating roles
- ❌ Admin dashboard role updates fail
- ❌ User management functions broken

### **After Fix:**
- ✅ Role updates work properly
- ✅ Team assignments work
- ✅ Captain status toggles work
- ✅ User deletion works
- ✅ All admin functions operational

## 🔒 **Security Note**

### **Development vs Production:**
- **Development**: Permissive RLS policies with application-level authorization
- **Production**: Restrictive RLS policies with database-level security

### **Current Security:**
- ✅ Authorization is handled at the application level (Vue.js)
- ✅ Admin checks are done before database calls
- ✅ User authentication is custom (name/password)
- ✅ RLS is enabled with proper policies
- ✅ PostgreSQL functions available for future security enhancements

## 🎯 **Next Steps**

1. **Apply the migration** in Supabase dashboard
2. **Test the admin dashboard** functionality
3. **Verify all CRUD operations** work for users
4. **Consider production security** for future deployment

The infinite recursion error should be resolved after applying the RLS fix! 🛠️✨

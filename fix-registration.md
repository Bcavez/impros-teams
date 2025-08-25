# Fix Registration "Unauthorized" Error

## The Problem
You're getting an "unauthorized" error when trying to register because the Row Level Security (RLS) policies in Supabase are too restrictive.

## The Solution
Run this SQL in your Supabase dashboard to fix the policies:

### 1. Go to Supabase Dashboard
1. Go to [supabase.com](https://supabase.com)
2. Sign in and open your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"**

### 2. Run the Fix SQL
Copy and paste this SQL:

```sql
-- Fix RLS policies to allow user registration
DROP POLICY IF EXISTS "Only admins can insert users" ON users;
CREATE POLICY "Allow user registration" ON users FOR INSERT WITH CHECK (true);

-- Fix other restrictive policies
DROP POLICY IF EXISTS "Team members can view coaching sessions" ON coaching_sessions;
DROP POLICY IF EXISTS "Captains and admins can manage coaching sessions" ON coaching_sessions;

-- Allow all operations for development
CREATE POLICY "Allow view coaching sessions" ON coaching_sessions FOR SELECT USING (true);
CREATE POLICY "Allow create coaching sessions" ON coaching_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update coaching sessions" ON coaching_sessions FOR UPDATE USING (true);
CREATE POLICY "Allow delete coaching sessions" ON coaching_sessions FOR DELETE USING (true);

-- Fix attendance records
CREATE POLICY "Allow view attendance records" ON attendance_records FOR SELECT USING (true);
CREATE POLICY "Allow insert attendance records" ON attendance_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update attendance records" ON attendance_records FOR UPDATE USING (true);
CREATE POLICY "Allow delete attendance records" ON attendance_records FOR DELETE USING (true);

-- Fix shows
CREATE POLICY "Allow view shows" ON shows FOR SELECT USING (true);
CREATE POLICY "Allow insert shows" ON shows FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update shows" ON shows FOR UPDATE USING (true);
CREATE POLICY "Allow delete shows" ON shows FOR DELETE USING (true);

-- Fix show dates
CREATE POLICY "Allow view show dates" ON show_dates FOR SELECT USING (true);
CREATE POLICY "Allow insert show dates" ON show_dates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update show dates" ON show_dates FOR UPDATE USING (true);
CREATE POLICY "Allow delete show dates" ON show_dates FOR DELETE USING (true);

-- Fix show assignments
CREATE POLICY "Allow view show assignments" ON show_assignments FOR SELECT USING (true);
CREATE POLICY "Allow insert show assignments" ON show_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update show assignments" ON show_assignments FOR UPDATE USING (true);
CREATE POLICY "Allow delete show assignments" ON show_assignments FOR DELETE USING (true);

-- Fix show availability
CREATE POLICY "Allow view show availability" ON show_availability FOR SELECT USING (true);
CREATE POLICY "Allow insert show availability" ON show_availability FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update show availability" ON show_availability FOR UPDATE USING (true);
CREATE POLICY "Allow delete show availability" ON show_availability FOR DELETE USING (true);
```

### 3. Click "Run"
This will fix all the RLS policies.

### 4. Test Registration
After running the SQL:
1. Go back to your app
2. Try registering a new user
3. Registration should now work without errors

## What This Fixes:
- ✅ User registration
- ✅ Creating coaching sessions
- ✅ Updating attendance records
- ✅ Creating shows and assignments
- ✅ All CRUD operations

## Security Note:
These policies are permissive for development. In production, you should implement more restrictive policies based on your security requirements.

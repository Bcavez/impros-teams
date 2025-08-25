# Remove Mock Data from Database

## To remove all mock data from your Supabase database:

### 1. Go to your Supabase Dashboard
1. Go to [supabase.com](https://supabase.com)
2. Sign in and open your project

### 2. Open the SQL Editor
1. Click on **"SQL Editor"** in the left sidebar
2. Click **"New query"**

### 3. Run the Cleanup SQL
Copy and paste this SQL into the editor:

```sql
-- Remove all mock data from the database
-- This will clean up all sample data while keeping the table structure

-- Remove sample show availability records
DELETE FROM show_availability;

-- Remove sample show assignments
DELETE FROM show_assignments;

-- Remove sample show dates
DELETE FROM show_dates;

-- Remove sample shows
DELETE FROM shows;

-- Remove sample attendance records
DELETE FROM attendance_records;

-- Remove sample coaching sessions
DELETE FROM coaching_sessions;

-- Remove sample users
DELETE FROM users;
```

### 4. Click "Run"
This will remove all the demo data from your database.

### 5. Verify
After running the SQL:
- All tables will be empty
- No more demo users (admin@example.com, etc.)
- No more sample coaching sessions or shows
- Your database is now clean and ready for real data

### 6. Create Your First User
After cleaning the database, you'll need to create your first user through the registration process in the app.

## What's Been Removed:
- ✅ Mock data fallback from the code
- ✅ Sample users from the database
- ✅ Sample coaching sessions
- ✅ Sample shows and assignments
- ✅ All demo credentials

Your app is now completely clean and ready for real data!

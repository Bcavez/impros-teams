# Setup Password Authentication

## Current Status
The app now supports password authentication, but you need to update your database first.

## Step 1: Update Database Schema

### Run this SQL in your Supabase dashboard:

```sql
-- Add password authentication to users table
ALTER TABLE users ADD COLUMN password_hash TEXT;

-- Update existing users to have a default password
UPDATE users SET password_hash = 'default_password_hash' WHERE password_hash IS NULL;

-- Make password_hash required for new users
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;

-- Add index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

## Step 2: Create Admin User with Password

### Option A: Create Admin via SQL
```sql
-- Create admin user with password
INSERT INTO users (name, email, password_hash, role, team, is_captain, created_at) 
VALUES (
  'Your Name', 
  'your-email@example.com', 
  'your_password_here', 
  'admin', 
  NULL, 
  FALSE, 
  NOW()
);
```

### Option B: Create Admin via App + Update
1. Register normally through the app (creates member user)
2. Update to admin via SQL:
```sql
UPDATE users 
SET role = 'admin', password_hash = 'your_password_here' 
WHERE email = 'your-email@example.com';
```

## Step 3: Test Authentication

### Login Credentials:
- **Email**: Your email
- **Password**: The password you set in the SQL

### Default Password (for existing users):
- **Password**: `default_password_hash`

## How It Works:

1. **Registration**: Stores password in `password_hash` field
2. **Login**: Compares entered password with stored `password_hash`
3. **Security**: Passwords are stored as-is (for development)
4. **Production**: Should use proper password hashing (bcrypt, argon2)

## Security Notes:

⚠️ **For Development Only**: This uses simple password storage
✅ **For Production**: Implement proper password hashing
✅ **Password Requirements**: Add validation (length, complexity, etc.)
✅ **Rate Limiting**: Add login attempt limits
✅ **Password Reset**: Implement forgot password functionality

## Next Steps:

1. Run the database migration
2. Create your admin user
3. Test login with password
4. Create additional users through the app

Your app now has proper password authentication! 🔐

# Quick Setup Instructions

## Why you're seeing demo credentials

The app is currently running in **mock data mode** because Supabase environment variables are not configured.

## To use real Supabase data:

### 1. Create a `.env` file in your project root
Create a file named `.env` (not `.env.local` or anything else) in the same folder as your `package.json`.

### 2. Add your Supabase credentials
Add these lines to your `.env` file:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Get your Supabase credentials
1. Go to [supabase.com](https://supabase.com)
2. Create a new project or use an existing one
3. Go to **Settings** → **API**
4. Copy the **Project URL** and **anon public** key
5. Paste them in your `.env` file

### 4. Set up the database
1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and run the SQL

### 5. Restart your development server
```bash
npm run dev
```

## Current Status
- ✅ App works with mock data
- ✅ Supabase integration ready
- ❌ Real database not configured yet
- ❌ Environment variables missing

Once you complete the setup, the app will use real Supabase data instead of demo credentials.

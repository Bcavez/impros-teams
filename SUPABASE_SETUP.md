# Supabase Setup Guide for Team Management PWA

This guide will help you set up Supabase for your team management PWA.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `team-management-pwa`
   - **Database Password**: Choose a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"

## 2. Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (starts with `https://`)
   - **anon public** key (starts with `eyJ`)

## 3. Set Up Environment Variables

1. Create a `.env` file in your project root:
```bash
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

2. Replace the placeholder values with your actual Supabase credentials

## 4. Set Up the Database Schema

### Option A: Using Supabase Dashboard (Recommended)

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and run the SQL in the editor
4. This will create all tables, indexes, and sample data

### Option B: Using Supabase CLI

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
supabase link --project-ref your-project-ref
```

4. Push the migration:
```bash
supabase db push
```

## 5. Configure Row Level Security (RLS)

The migration includes basic RLS policies. For production, you'll want to:

1. Go to **Authentication** → **Policies** in your Supabase dashboard
2. Review and adjust the policies for your specific needs
3. Consider adding more granular permissions

## 6. Test the Integration

1. Start your development server:
```bash
npm run dev
```

2. Try logging in with one of the sample users:
   - **Admin**: `admin@example.com`
   - **Samurai Captain**: `samurai@example.com`
   - **Member**: `member1@example.com`

## 7. Next Steps

### Set Up Real Authentication

Currently, the app uses simple email lookup. For production:

1. Enable Supabase Auth in your dashboard
2. Update the login function to use `supabase.auth.signInWithPassword()`
3. Add email verification and password reset functionality

### Add Real-time Features

1. Subscribe to database changes:
```typescript
const subscription = supabase
  .channel('coaching_sessions')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'coaching_sessions' },
    (payload) => {
      // Handle real-time updates
    }
  )
  .subscribe()
```

### Set Up File Storage

1. Create storage buckets for team documents
2. Configure storage policies
3. Add file upload functionality

## 8. Production Considerations

### Environment Variables

- Use different Supabase projects for development and production
- Never commit `.env` files to version control
- Use environment-specific variables in your deployment platform

### Security

- Review and test all RLS policies
- Implement proper authentication flows
- Add rate limiting for API calls
- Consider using service roles for admin operations

### Performance

- Monitor query performance in Supabase dashboard
- Add database indexes for frequently queried columns
- Implement caching strategies for read-heavy operations

### Backup

- Set up automated backups in Supabase dashboard
- Test restore procedures regularly
- Keep migration files in version control

## 9. Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your domain is added to Supabase allowed origins
2. **RLS Blocking Queries**: Check that your policies allow the operations you're trying to perform
3. **Type Errors**: Make sure your TypeScript types match your database schema

### Getting Help

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [GitHub Issues](https://github.com/supabase/supabase/issues)

## 10. Migration from Mock Data

The stores have been updated to use Supabase instead of mock data. The API remains the same, so your components should continue to work without changes.

Key changes:
- All database operations are now async
- Error handling is more robust
- Real-time updates are possible
- Data persists between sessions

# Supabase Quick Start Guide

## What I've Set Up For You

1. **Supabase client configuration** (`src/lib/supabase.ts`)
   - Client-side and server-side Supabase clients
   - TypeScript types for all database tables

2. **Updated API route** (`src/app/api/activities/route.supabase.ts`)
   - A Supabase-powered version of your activities API
   - Handles activities, transactions, and sectors

3. **Database schema** (in `SUPABASE_SETUP_GUIDE.md`)
   - Complete SQL schema for all your tables
   - Includes relationships and indexes

4. **Migration script** (`scripts/migrate-to-supabase.ts`)
   - Automatically migrates your existing JSON data to Supabase

## Steps to Get Started

### 1. Create Your Supabase Account
1. Go to [https://supabase.com](https://supabase.com)
2. Sign up and create a new project
3. Save your database password somewhere safe

### 2. Run the Database Schema
1. In your Supabase dashboard, go to **SQL Editor**
2. Copy all the SQL from `SUPABASE_SETUP_GUIDE.md` (Section 2: Database Schema Setup)
3. Paste and run it in the SQL Editor
4. Then run the Row Level Security SQL (Section 3)

### 3. Get Your API Keys
1. In Supabase dashboard, go to **Settings → API**
2. Copy these values:
   - Project URL
   - anon/public key
   - service_role key

### 4. Set Up Environment Variables
```bash
# In the frontend directory
cd frontend
touch .env.local
```

Add to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 5. Migrate Your Existing Data (Optional)
If you have existing data in JSON files:

```bash
# Run the migration script
cd frontend
npx tsx scripts/migrate-to-supabase.ts
```

### 6. Update Your API Routes
To use the Supabase version of your API:

```bash
# Rename the old file
mv src/app/api/activities/route.ts src/app/api/activities/route.old.ts

# Use the Supabase version
mv src/app/api/activities/route.supabase.ts src/app/api/activities/route.ts
```

### 7. Test Your Application
```bash
npm run dev
```

Visit http://localhost:3000 and test:
- Creating new activities
- Adding transactions
- Viewing existing data

## Key Benefits of Using Supabase

1. **Real Database**: No more JSON files, proper SQL database
2. **Scalability**: Can handle thousands of records easily
3. **Security**: Built-in authentication and row-level security
4. **Real-time**: Get real-time updates when data changes
5. **Backups**: Automatic backups of your data
6. **API**: Automatic REST API for all your tables

## Troubleshooting

### Environment Variables Not Loading?
- Make sure `.env.local` is in the frontend directory
- Restart your development server after adding env vars

### Migration Script Fails?
- Check that your Supabase credentials are correct
- Make sure the database schema is created first
- Check the console for specific error messages

### API Errors?
- Check the browser console and terminal for error messages
- Verify your Supabase URL and keys are correct
- Make sure Row Level Security policies are applied

## Next Steps

1. **Authentication**: Set up Supabase Auth for user login
2. **File Storage**: Use Supabase Storage for images/files
3. **Real-time**: Enable real-time subscriptions for live updates
4. **Edge Functions**: Add server-side logic with Supabase Functions

## Need Help?

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- Check the error messages in your browser console or terminal 
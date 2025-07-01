# Fix Activities List - Environment Setup

## Problem
If you're seeing an error like "Unable to connect to database" or activities are not loading, it means your Supabase environment variables are not configured.

## Quick Fix

### Step 1: Copy the Environment Template
```bash
cd frontend
cp env.template .env.local
```

### Step 2: Get Your Supabase Credentials
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings → API**
4. Copy these three values:
   - **Project URL** 
   - **anon public key**
   - **service_role key** (keep this secret!)

### Step 3: Update .env.local
Edit the `.env.local` file and replace the placeholder values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-service-role-key
```

### Step 4: Restart Your Server
```bash
npm run dev
```

## Verify It's Working

### Test the Database Connection
1. Open your browser to `http://localhost:3000/api/health`
2. You should see a JSON response showing:
   - `"status": "ok"` - everything is working
   - Environment variables should show `"configured"`
   - Database connection should show `"ok"`

### Test the Activities Page
1. Open your browser to `http://localhost:3000/activities`
2. You should see either:
   - Your actual activities from the database, OR
   - "No activities yet" if your database is empty (which is normal!)
3. You should NOT see sample/dummy activities anymore

## If You Still Have Issues

1. **Check the browser console** for error messages
2. **Check the terminal** where you ran `npm run dev` for server errors
3. **Verify your Supabase project** has the activities table set up
4. **Follow the full setup guide** in `SUPABASE_QUICK_START.md`

## Database Setup
If you haven't set up your Supabase database tables yet, follow the complete setup guide in `SUPABASE_SETUP_GUIDE.md`. 
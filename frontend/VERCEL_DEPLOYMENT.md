# Vercel Deployment Guide for AIMS Project

## Environment Variables

Before deploying to Vercel, you need to configure the following environment variables in your Vercel project settings:

### Required Environment Variables

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Your Supabase project URL
   - Example: `https://your-project-id.supabase.co`
   - Get from: Supabase Dashboard → Settings → API

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Your Supabase anonymous/public key
   - Get from: Supabase Dashboard → Settings → API

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Your Supabase service role key (keep this secret!)
   - Get from: Supabase Dashboard → Settings → API

### Required for File Uploads

4. **BLOB_READ_WRITE_TOKEN** (REQUIRED for profile pictures and document uploads)
   - For file uploads and profile pictures
   - Get from: Vercel Dashboard → Storage → Blob
   - Without this, profile picture uploads will fail

## Deployment Steps

1. **Set up Environment Variables in Vercel**
   - Go to your Vercel project dashboard
   - Navigate to Settings → Environment Variables
   - Add each environment variable listed above

2. **Deploy**
   - Push your code to the main branch
   - Vercel will automatically build and deploy

3. **Verify Deployment**
   - Check the deployment logs for any errors
   - Visit `/api/health` to verify the database connection
   - Test the activities page to ensure data is loading

## Build Configuration

The project is already configured with:
- `vercel.json` for proper Next.js deployment
- API route timeout settings (30 seconds)
- CORS headers for API routes
- Security headers

## Database Setup

Make sure your Supabase database has all the required tables and migrations applied. See the `supabase/migrations` directory for the SQL files.

## Troubleshooting

If you encounter issues:
1. Check the Vercel function logs for errors
2. Verify all environment variables are set correctly
3. Ensure the Supabase project is accessible from Vercel
4. Check that all database migrations have been applied

### Profile Pictures Not Showing

If profile pictures aren't showing in production:
1. The database may have old URLs pointing to local filesystem (`/uploads/profiles/...`)
2. Set up Vercel Blob Storage and add `BLOB_READ_WRITE_TOKEN` to environment variables
3. Run the fix script to clean up broken URLs:
   ```bash
   npm run fix-avatar-urls
   ```
4. Users will need to re-upload their profile pictures
# Migrate Your Existing Profile Pictures to Production 🚀

Great news! You have 25 profile pictures stored locally that we can migrate to Vercel Blob storage so they'll work in production.

## Quick Migration Steps

### 1. Get Your Environment Variables
You'll need these from your production environment:

**From Vercel Dashboard:**
- Go to your project → Settings → Environment Variables
- Copy these values:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `BLOB_READ_WRITE_TOKEN` (you may need to create this first - see below)

**If you don't have Blob Storage set up yet:**
1. Go to Vercel Dashboard → Storage
2. Create a new Blob store
3. Copy the `BLOB_READ_WRITE_TOKEN`
4. Add it to your project's environment variables

### 2. Set Up Local Environment
Create a temporary `.env.local` file in the frontend directory with your production values:

```bash
cd frontend
```

Then create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
```

### 3. Run the Migration
```bash
npm run migrate-profile-pics
```

This will:
- Read all 25 profile pictures from `public/uploads/profiles/`
- Upload each one to Vercel Blob storage
- Update the database with the new cloud URLs
- Show you progress for each file

### 4. Clean Up
After successful migration:
1. Delete the temporary `.env.local` file (important for security!)
2. The local profile pictures in `public/uploads/profiles/` are no longer needed

### 5. Deploy
Push any changes and let Vercel redeploy. Your profile pictures will now work in production!

## What Happens During Migration

The script will:
1. Upload each image to Vercel Blob storage (permanent cloud storage)
2. Get a new public URL for each image
3. Find all users in the database using each old URL
4. Update their `avatar_url` to the new cloud URL
5. Give you a summary of what was migrated

## Your Current Profile Pictures

You have these files ready to migrate:
- 028eca22-7f43-402f-8aa7-89339b0694f3.jpeg
- 0f21db48-9e4b-4463-9262-664c82738a7a.png
- 11e8ab5f-678e-4eda-8e33-b8ee48660b78.jpeg
- ... and 22 more!

Total size: ~47MB of profile pictures

## Need Help?

If you get any errors:
1. Double-check all environment variables are correct
2. Make sure you have the BLOB_READ_WRITE_TOKEN set up
3. Ensure your Supabase connection is working

The migration is safe to run multiple times - it will only update users who still have old URLs.

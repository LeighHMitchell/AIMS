# Fix Profile Pictures in Production

## The Problem
Your users' profile pictures are not showing in production because:
1. The database has avatar URLs pointing to local filesystem paths (e.g., `/uploads/profiles/...`)
2. These files don't exist in Vercel's production environment
3. Vercel doesn't persist uploaded files to the filesystem

## Quick Fix Steps

### Step 1: Set up Vercel Blob Storage
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Storage** → **Create Database** → **Blob**
3. Create a new Blob store
4. Copy the `BLOB_READ_WRITE_TOKEN` from the store settings

### Step 2: Add Environment Variable to Vercel
1. Go to your project in Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add:
   - Key: `BLOB_READ_WRITE_TOKEN`
   - Value: [paste the token from Step 1]
   - Environment: Production (and optionally Preview/Development)

### Step 3: Fix Existing Broken Avatar URLs
I've created an API endpoint to fix the broken URLs. You have two options:

#### Option A: Use the API Endpoint (Recommended)
1. First, check how many users have broken avatars:
   ```
   GET https://your-app.vercel.app/api/fix-avatar-urls
   ```

2. Then fix them by calling:
   ```
   POST https://your-app.vercel.app/api/fix-avatar-urls?secret=fix-avatars-2024
   ```

   Note: You should change the secret by setting an `ADMIN_SECRET` environment variable in Vercel.

#### Option B: Use cURL from Terminal
```bash
# Check status
curl https://your-app.vercel.app/api/fix-avatar-urls

# Fix broken URLs
curl -X POST "https://your-app.vercel.app/api/fix-avatar-urls?secret=fix-avatars-2024"
```

### Step 4: Verify It's Working
1. The API will return a summary of how many avatar URLs were fixed
2. Check your users in the app - their avatars will be removed
3. Users can now re-upload their profile pictures, which will use cloud storage

## Going Forward
- All new profile picture uploads will automatically use Vercel Blob storage
- Profile pictures will persist across deployments
- No more broken image links!

## Security Note
Remember to:
1. Change the default secret (`fix-avatars-2024`) by setting `ADMIN_SECRET` in your Vercel environment variables
2. Consider adding proper authentication to the fix endpoint if needed

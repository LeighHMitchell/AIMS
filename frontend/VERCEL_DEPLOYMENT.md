# Vercel Deployment Instructions

## Prerequisites
1. Vercel account
2. Vercel CLI installed (`npm install -g vercel`)

## Environment Variables Setup

### Option 1: Via Vercel Dashboard (Recommended)
1. Go to your Vercel project dashboard at https://vercel.com
2. Navigate to Settings → Environment Variables
3. Add the following variables for all environments (Production, Preview, Development):

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Option 2: Via CLI (One-time setup)
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

## Deploy Command
After setting up environment variables:
```bash
vercel --prod
```

## Automatic Deployment
Push to your main branch will automatically trigger a deployment if you've connected your GitHub repository to Vercel.

## Configuration
The project includes:
- `vercel.json`: Configures build settings, function timeouts, and CORS headers
- `.env.example`: Template for required environment variables
- TypeScript errors are temporarily ignored for deployment (can be re-enabled in next.config.js)

## Function Timeouts
API routes have extended timeouts (60 seconds) configured for:
- `/api/activities/*`
- `/api/organizations/*`
- `/api/analytics/*`
- `/api/iati/*`
- `/api/activities/*/transactions/*`

## Troubleshooting
1. If deployment fails due to missing environment variables, ensure all variables are set in Vercel dashboard
2. For build errors, check the build logs in Vercel dashboard
3. For runtime errors, check the function logs in Vercel dashboard
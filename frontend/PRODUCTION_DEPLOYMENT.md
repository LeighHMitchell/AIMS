# Vercel Deployment Guide

This guide will help you deploy the AIMS project to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Supabase Project**: You'll need the Supabase credentials

## Deployment Steps

### 1. Connect Repository to Vercel

1. Log in to your Vercel dashboard
2. Click "New Project"
3. Import your GitHub repository
4. Select the `frontend` folder as the root directory

### 2. Configure Build Settings

Vercel should auto-detect Next.js. Verify these settings:

- **Framework Preset**: Next.js
- **Root Directory**: `frontend` (if your repo contains multiple projects)
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 3. Set Environment Variables

In your Vercel project settings, add these environment variables:

#### Required Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

#### Optional Variables (Recommended for Better Currency Conversion)
```
EXCHANGERATE_HOST_API_KEY=your_exchange_rate_api_key
NEXT_PUBLIC_ENABLE_ACTIVITY_OPTIMIZATION=true
NODE_ENV=production
```

**⚠️ Important**: While `EXCHANGERATE_HOST_API_KEY` is optional, it's **highly recommended** for production to get accurate historical exchange rates. Without it, the app will use fallback rates from the database, which may not be as accurate for very old dates (before 2010).

### 4. Deploy

1. Click "Deploy" to start the deployment
2. Vercel will build and deploy your application
3. You'll receive a deployment URL when complete

## Production Optimizations Included

- ✅ TypeScript strict checking enabled
- ✅ ESLint validation during build
- ✅ Security headers configured
- ✅ API timeouts set to 30 seconds
- ✅ Next.js optimization settings
- ✅ Vercel function configuration

## Monitoring and Maintenance

### Build Logs
- Check Vercel dashboard for build logs if deployment fails
- Most common issues are missing environment variables

### Performance
- The app includes performance optimizations
- Monitor Core Web Vitals in Vercel Analytics

### Updates
To update the deployment:
1. Push changes to your GitHub repository
2. Vercel will automatically redeploy

## Troubleshooting

### Build Failures
1. Check that all environment variables are set
2. Verify Supabase credentials are correct
3. Check build logs for specific errors

### Runtime Errors
1. Check Vercel function logs
2. Verify database connectivity
3. Ensure API routes are working

### Database Connection Issues
- The app expects specific database tables
- Ensure your Supabase database schema matches the expected structure
- Check RLS policies are configured correctly

## Support

For deployment issues:
1. Check Vercel documentation
2. Review build logs carefully
3. Verify all environment variables are set correctly
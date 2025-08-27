# Production Deployment Guide

This guide will help you deploy the AIMS Dashboard to production using GitHub and Vercel.

## Prerequisites

1. **GitHub Repository**: Your code should be in a GitHub repository
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Supabase Project**: Set up your production Supabase database

## Environment Variables

Set these environment variables in your Vercel dashboard:

### Required Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
NODE_ENV=production
```

### Optional Variables
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key (if using maps)
```

## GitHub Secrets Setup

For the GitHub Actions workflow to work, add these secrets to your GitHub repository:

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Add the following secrets:

```bash
VERCEL_TOKEN=your_vercel_token
ORG_ID=your_vercel_org_id
PROJECT_ID=your_vercel_project_id
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Getting Vercel Credentials

1. **Vercel Token**: 
   - Go to [Vercel Dashboard](https://vercel.com/account/tokens)
   - Create a new token
   - Copy the token value

2. **Organization ID & Project ID**:
   - Run `npx vercel` in your frontend directory
   - Follow the setup prompts
   - Check `.vercel/project.json` for the IDs

## Deployment Steps

### Option 1: Automatic Deployment (Recommended)

1. **Push to main branch**:
   ```bash
   git add .
   git commit -m "feat: prepare for production deployment"
   git push origin main
   ```

2. **GitHub Actions will automatically**:
   - Run tests and linting
   - Build the application
   - Deploy to Vercel if tests pass

### Option 2: Manual Deployment

1. **Connect Vercel to GitHub**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Set the root directory to `frontend`
   - Configure environment variables

2. **Deploy**:
   - Vercel will automatically deploy on every push to main
   - Or trigger manual deployments from the Vercel dashboard

## Vercel Configuration

The project includes optimized configurations:

- **`vercel.json`**: Production-ready settings with security headers
- **`next.config.js`**: Optimized for production builds
- **GitHub Actions**: Automated testing and deployment

## Health Check

After deployment, verify your app is working:

1. Visit your deployed URL
2. Check the health endpoint: `https://your-app.vercel.app/api/health-check`
3. Verify database connectivity through the admin panel

## Troubleshooting

### Build Failures
- Check the Vercel build logs
- Ensure all environment variables are set
- Verify Supabase connection

### Runtime Errors
- Check the Vercel function logs
- Verify environment variables are correct
- Test database connectivity

### Performance Issues
- Enable Vercel Analytics
- Check Core Web Vitals
- Monitor API response times

## Security Considerations

✅ **Already Configured**:
- Security headers (CSP, HSTS, etc.)
- CORS configuration
- Environment variable validation
- TypeScript strict mode

## Monitoring

Consider setting up:
- Vercel Analytics
- Error tracking (Sentry)
- Performance monitoring
- Database monitoring (Supabase dashboard)

## Support

If you encounter issues:
1. Check the Vercel deployment logs
2. Review the GitHub Actions workflow logs
3. Verify all environment variables are set correctly
4. Test locally with production environment variables

---

**Ready for Production!** 🚀

Your AIMS Dashboard is now configured for production deployment. Simply push to the main branch to trigger automatic deployment via GitHub Actions to Vercel.

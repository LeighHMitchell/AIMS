# 🚀 AIMS Production Deployment Guide

## Quick Deploy to Vercel (Recommended)

### 1. Prerequisites
- GitHub account
- Vercel account (free tier available)
- Google Maps API key

### 2. Prepare for Deployment

```bash
# Navigate to the frontend directory
cd frontend

# Test the production build locally
npm run deploy:production
```

### 3. Push to GitHub

```bash
# From project root
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### 4. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "New Project"
3. Import your GitHub repository
4. Configure project settings:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

### 5. Configure Environment Variables

In Vercel dashboard → Settings → Environment Variables, add:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key
```

### 6. Deploy

Click "Deploy" and wait for the build to complete.

## Environment Variables Setup

### Required Variables
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Google Maps API key for mapping functionality

### Optional Variables
- `DATABASE_URL`: Database connection string (when migrating from JSON files)
- `NEXT_PUBLIC_GA_ID`: Google Analytics tracking ID
- `SENTRY_DSN`: Error monitoring with Sentry

## Production Optimizations Applied

✅ **Security Headers**: Added security headers for XSS protection, content type sniffing prevention
✅ **Image Optimization**: Configured Next.js image optimization with remote patterns
✅ **Build Optimization**: Enabled strict TypeScript and ESLint checking
✅ **Caching**: Configured appropriate cache headers for API routes
✅ **CORS**: Configured CORS headers for API security

## Post-Deployment Checklist

- [ ] Test all major functionality
- [ ] Verify maps are working
- [ ] Check API endpoints respond correctly
- [ ] Test responsive design on mobile
- [ ] Set up custom domain (optional)
- [ ] Configure monitoring/analytics
- [ ] Set up error tracking

## Monitoring and Maintenance

### Performance Monitoring
- Use Vercel Analytics for performance insights
- Monitor Core Web Vitals
- Set up alerts for downtime

### Error Tracking
Consider integrating Sentry for error monitoring:

```bash
npm install @sentry/nextjs
```

## Rollback Plan

If issues arise:
1. Revert to previous Git commit
2. Redeploy from Vercel dashboard
3. Or use Vercel CLI: `vercel --prod`

## Support

- Vercel Documentation: https://vercel.com/docs
- Next.js Documentation: https://nextjs.org/docs
- Project Issues: Create GitHub issue for bugs

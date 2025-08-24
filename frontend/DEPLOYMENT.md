# Deployment Guide

## Prerequisites

1. **Supabase Project**: You need a Supabase project with the database schema set up
2. **Vercel Account**: Connected to your GitHub repository
3. **Environment Variables**: Configured in Vercel dashboard

## Environment Variables

Set these environment variables in your Vercel project settings:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NODE_ENV=production
```

Optional:
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Vercel Configuration

The project includes:
- `vercel.json` - Vercel deployment configuration
- `.vercelignore` - Files to exclude from deployment
- `next.config.js` - Next.js configuration optimized for Vercel

## Database Setup

1. Run Supabase migrations in the `supabase/migrations/` directory
2. Ensure all required tables and functions are created
3. Set up Row Level Security (RLS) policies if needed

## Deployment Process

1. **Push to GitHub**: All changes are automatically deployed via Vercel
2. **Manual Deploy**: Use Vercel CLI or dashboard to trigger deployment
3. **Environment Check**: Verify all environment variables are set

## Build Configuration

- **Framework**: Next.js 14.2.29
- **Node Version**: 18.x (recommended)
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

## Post-Deployment Checklist

- [ ] Verify database connection works
- [ ] Test authentication flow
- [ ] Check API endpoints respond correctly
- [ ] Verify file uploads work (if applicable)
- [ ] Test responsive design on mobile devices

## Troubleshooting

### Common Issues

1. **Environment Variables**: Check Vercel dashboard settings
2. **Database Connection**: Verify Supabase URL and keys
3. **Build Errors**: Check build logs in Vercel dashboard
4. **CORS Issues**: Verify API headers configuration

### Debug Endpoints

- `/api/test` - Basic API health check
- `/api/debug-simple` - Database connection test

## Performance Optimization

The app includes:
- Image optimization via Next.js
- API route caching headers
- Static asset optimization
- Bundle analysis (run `npm run build:analyze`)

## Security Headers

Security headers are configured in `vercel.json`:
- Content Security Policy
- CORS headers
- XSS Protection
- Frame Options

## Monitoring

Consider setting up:
- Vercel Analytics
- Error tracking (Sentry, etc.)
- Performance monitoring
- Database monitoring via Supabase dashboard
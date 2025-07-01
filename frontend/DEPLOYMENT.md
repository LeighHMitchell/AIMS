# AIMS Dashboard Deployment Guide

## Pre-Deployment Checklist

### 1. Fix Critical Issues
- [ ] API response size (currently >10MB, should be <2MB)
- [ ] Database query timeouts (add indexes, optimize queries)
- [ ] Memory usage optimization

### 2. Environment Variables
Create a `.env.production` file with:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Deployment Options

### Option 1: Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Set environment variables in Vercel dashboard
```

### Option 2: Docker Deployment
```bash
# Build Docker image
docker build -t aims-dashboard .

# Run locally to test
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your-url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
  -e SUPABASE_SERVICE_ROLE_KEY=your-service-key \
  aims-dashboard

# Push to registry
docker tag aims-dashboard your-registry/aims-dashboard:latest
docker push your-registry/aims-dashboard:latest
```

### Option 3: Traditional Server
```bash
# Run deployment script
npm run deploy

# Copy to server
scp -r .next public package*.json user@server:/path/to/app/

# On server
cd /path/to/app
npm ci --production
npm run start
```

## Performance Monitoring

### 1. Add Application Monitoring
```javascript
// Install monitoring
npm install @sentry/nextjs
```

### 2. Setup Health Checks
Create `/api/health` endpoint to monitor:
- Database connectivity
- Response times
- Memory usage

## Post-Deployment

1. **Monitor Application**
   - Check error logs
   - Monitor response times
   - Track memory usage

2. **Update Documentation**
   - Document deployment process
   - Update environment variables
   - Note any custom configurations 
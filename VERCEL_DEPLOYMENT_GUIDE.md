# 🚀 AIMS Project - Vercel Deployment Guide

## ✅ Current Status: READY FOR DEPLOYMENT

Your AIMS project is fully configured and ready for deployment to Vercel via GitHub. All necessary configurations are in place.

## 📋 Pre-Deployment Checklist

### ✅ Completed Items:
- [x] Next.js application configured
- [x] `vercel.json` deployment configuration
- [x] GitHub Actions workflow (`.github/workflows/deploy.yml`)
- [x] Build process tested and working
- [x] Environment variables template created
- [x] Vercel project configured (Project ID: `prj_KSV6bKhZomeXEdT16gB70Sre0QLe`)

## 🎯 Quick Deployment Steps

### Step 1: Set Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your AIMS project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NODE_ENV=production
```

### Step 2: Deploy Using the Preparation Script

Run the automated deployment preparation script:

```bash
./prepare-deployment.sh
```

This script will:
- ✅ Check prerequisites
- ✅ Stage all uncommitted changes
- ✅ Test the build process
- ✅ Commit changes with your message
- ✅ Optionally push to GitHub

### Step 3: Manual Deployment (Alternative)

If you prefer manual deployment:

```bash
# Stage all changes
git add .

# Commit changes
git commit -m "Prepare for production deployment"

# Push to GitHub (triggers automatic deployment)
git push origin main
```

## 🔧 Configuration Details

### Vercel Configuration (`frontend/vercel.json`)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "npm ci",
  "functions": {
    "src/pages/api/**/*.ts": { "maxDuration": 30 },
    "src/app/api/**/*.ts": { "maxDuration": 30 }
  }
}
```

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)
- Triggers on push to `main`/`master` branch
- Runs tests and builds
- Deploys to Vercel using `amondnet/vercel-action@v25`
- Includes proper error handling and notifications

### Build Configuration
- **Framework**: Next.js 14
- **Node Version**: 18+
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm ci`

## 🌐 Environment Variables

### Required Variables:
| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `NODE_ENV` | Environment | `production` |

### Optional Variables:
| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key | `AIzaSyB...` |
| `NEXT_PUBLIC_APP_URL` | Application URL | `https://your-app.vercel.app` |

## 📊 Deployment Monitoring

### GitHub Actions
1. Go to your GitHub repository
2. Click **Actions** tab
3. Monitor the "Deploy to Production" workflow

### Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Monitor **Deployments** tab

### Expected Build Output
```
✓ Generating static pages (129/129)
✓ Collecting build traces    
✓ Finalizing page optimization
```

## 🔍 Troubleshooting

### Common Issues:

#### 1. Build Failures
- Check for TypeScript/ESLint errors
- Verify all dependencies are installed
- Ensure environment variables are set

#### 2. Environment Variables Not Working
- Verify variables are set in Vercel dashboard
- Check variable names match exactly
- Ensure `NEXT_PUBLIC_` prefix for client-side variables

#### 3. Database Connection Issues
- Verify Supabase credentials
- Check Supabase project is active
- Ensure RLS policies are configured

#### 4. API Route Errors
- Dynamic server usage warnings are expected for API routes
- These don't prevent deployment
- Check individual API route logs in Vercel

### Build Warnings (Expected):
```
Error in implementing-partners API: Dynamic server usage: Route /api/aid-effectiveness/implementing-partners couldn't be rendered statically because it used `request.url`.
```
These warnings are normal for Next.js API routes and don't affect deployment.

## 🎉 Post-Deployment Verification

After deployment, verify:

- [ ] Application loads at the Vercel URL
- [ ] Authentication works correctly
- [ ] Database connections are functional
- [ ] File uploads work
- [ ] All API endpoints respond
- [ ] User registration/login works
- [ ] Supabase storage is accessible

## 📞 Support

If you encounter issues:

1. Check the build logs in Vercel dashboard
2. Review GitHub Actions workflow logs
3. Verify environment variables are correctly set
4. Test locally with `npm run build` and `npm run start`

## 🚀 Ready to Deploy!

Your AIMS project is fully prepared for deployment. Run the preparation script or manually push to GitHub to trigger the automatic deployment to Vercel.

**Next Action**: Execute `./prepare-deployment.sh` or manually push to GitHub main branch.

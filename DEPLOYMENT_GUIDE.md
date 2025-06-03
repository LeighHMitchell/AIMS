# 🚀 Deployment Guide: GitHub + Vercel + Supabase

## 📦 Step 1: Push to GitHub

1. **Add all files**:
   ```bash
   git add .
   ```

2. **Commit your changes**:
   ```bash
   git commit -m "Add Supabase integration and prepare for Vercel deployment"
   ```

3. **Push to GitHub**:
   ```bash
   git push origin main
   ```

## 🔗 Step 2: Deploy to Vercel

1. **Go to Vercel**:
   - Visit [vercel.com](https://vercel.com)
   - Sign in with your GitHub account

2. **Import your project**:
   - Click "Add New..." → "Project"
   - Select your `aims_project` repository
   - Click "Import"

3. **Configure your project**:
   - **Framework Preset**: Next.js (should be auto-detected)
   - **Root Directory**: `./` (leave as is)
   - **Build Settings**: Will be auto-configured from `vercel.json`

## 🔐 Step 3: Add Environment Variables in Vercel

**IMPORTANT**: You need to add your Supabase credentials in Vercel!

1. In your Vercel project settings, go to **Settings** → **Environment Variables**

2. Add these variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://lhiayyjwkjkjkxvhcenw.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoaWF5eWp3a2pramt4dmhjZW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NTQzMTcsImV4cCI6MjA2NDUzMDMxN30.E3vOd6YxfoiKAJN2NlCsxRHiLDItFQV2OycbGD2h4iY
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoaWF5eWp3a2pramt4dmhjZW53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk1NDMxNywiZXhwIjoyMDY0NTMwMzE3fQ.riXiTQyFF6m1egj6lDzmxC6AHrrg9D57B_aWwnsnlac
   ```

3. Click "Save" for each variable

4. **Deploy**: Click "Deploy" button

## 🌐 Step 4: Your Live App

After deployment, you'll get a URL like:
- `https://aims-project.vercel.app` (or similar)

Your app will be live with:
- ✅ All data saved to Supabase
- ✅ Automatic deployments when you push to GitHub
- ✅ SSL certificate (HTTPS)
- ✅ Global CDN for fast loading

## 🔄 Automatic Deployments

After initial setup:
1. Make changes locally
2. Commit and push to GitHub
3. Vercel automatically deploys!

```bash
git add .
git commit -m "Your changes"
git push
```

## 🐛 Troubleshooting

### If your app doesn't work on Vercel:

1. **Check build logs** in Vercel dashboard
2. **Verify environment variables** are set correctly
3. **Check browser console** for errors

### Common issues:

- **Missing env vars**: Double-check all 3 Supabase variables are added
- **Build errors**: Check if all dependencies are in `package.json`
- **API errors**: Ensure Supabase RLS policies allow access

## 🎉 Success Checklist

- [ ] Code pushed to GitHub
- [ ] Project imported to Vercel
- [ ] Environment variables added
- [ ] Deployment successful
- [ ] Can create activities on live site
- [ ] Data appears in Supabase dashboard

## 📱 Share Your App

Once deployed, you can share your app URL with anyone! They can:
- View activities
- Create new activities (if you add auth)
- Access from anywhere in the world

## 🔒 Security Notes

- Your `SUPABASE_SERVICE_ROLE_KEY` is kept secret on Vercel's servers
- Never commit `.env.local` to GitHub
- Consider adding authentication before going to production 
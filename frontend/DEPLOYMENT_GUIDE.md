# AIMS Application Deployment Guide

This guide will help you deploy your AIMS application to the internet.

## ⚠️ Important Note About Data Storage

Currently, this application uses local JSON files for data storage (`frontend/data/*.json`). This works in development but **will not persist data in most cloud deployments**. For production, you should migrate to a proper database (PostgreSQL, MongoDB, etc.).

## Prerequisites

1. Git repository (GitHub, GitLab, or Bitbucket)
2. Google Maps API key (for the maps functionality)

## Option 1: Deploy to Vercel (Recommended)

Vercel is the easiest option for Next.js applications.

### Step 1: Push to GitHub

First, push your code to a GitHub repository:

```bash
cd aims_project
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/aims-project.git
git push -u origin main
```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login with GitHub
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

### Step 3: Add Environment Variables

In Vercel dashboard, go to Settings → Environment Variables and add:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Step 4: Deploy

Click "Deploy" and wait for the build to complete. Your app will be available at:
- `https://your-project-name.vercel.app`

## Option 2: Deploy to Netlify

### Step 1: Prepare for Netlify

Create a `netlify.toml` file in the `frontend` directory:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

### Step 2: Deploy to Netlify

1. Go to [netlify.com](https://netlify.com) and sign up/login
2. Drag and drop your `frontend` folder or connect GitHub
3. Add environment variables in Site Settings → Environment
4. Deploy

## Option 3: Deploy to Railway

Railway supports Next.js apps with API routes well.

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Deploy

```bash
cd frontend
railway login
railway init
railway up
```

### Step 3: Add Environment Variables

```bash
railway variables set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
```

## Option 4: Deploy to a VPS (DigitalOcean, AWS EC2, etc.)

For more control, deploy to a Virtual Private Server.

### Step 1: Set up the server

```bash
# SSH into your server
ssh user@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt-get install nginx
```

### Step 2: Clone and build

```bash
git clone your-repo-url
cd aims_project/frontend
npm install
npm run build
```

### Step 3: Create PM2 ecosystem file

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'aims-app',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/aims_project/frontend',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'your_key_here'
    }
  }]
}
```

### Step 4: Configure Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 5: Start the app

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Database Migration (Important!)

For production, migrate from JSON files to a database:

### Option 1: Use Vercel Storage

```bash
npm install @vercel/postgres
```

### Option 2: Use MongoDB Atlas

```bash
npm install mongodb
```

### Option 3: Use PostgreSQL

```bash
npm install pg @types/pg
```

You'll need to:
1. Update all API routes to use the database instead of JSON files
2. Create database schemas/models
3. Migrate existing data

## Custom Domain

All platforms support custom domains:

1. **Vercel**: Settings → Domains → Add
2. **Netlify**: Domain Settings → Add custom domain
3. **Railway**: Settings → Domains → Add
4. **VPS**: Configure DNS A record to point to your server IP

## Environment Variables Needed

Create a `.env.local` file (for local development) and add these to your deployment platform:

```env
# Google Maps API Key (required for maps)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Database URL (when you migrate from JSON)
DATABASE_URL=your_database_connection_string

# Optional: Analytics, monitoring, etc.
NEXT_PUBLIC_GA_ID=your_google_analytics_id
```

## Post-Deployment Checklist

- [ ] Test all functionality
- [ ] Check that data persists (if using database)
- [ ] Set up SSL certificate (automatic on Vercel/Netlify)
- [ ] Configure custom domain
- [ ] Set up monitoring/alerts
- [ ] Enable error tracking (Sentry, etc.)
- [ ] Set up backups (especially for database)

## Quick Start Commands

```bash
# Build locally to test
cd frontend
npm run build
npm start

# Test production build
NODE_ENV=production npm start
```

## Troubleshooting

1. **Build fails**: Check Node.js version (needs 18+)
2. **API routes 404**: Ensure correct routing configuration
3. **Maps not working**: Check API key and billing enabled
4. **Data not persisting**: Migrate to database for production

## Support

For deployment issues:
- Vercel: https://vercel.com/support
- Netlify: https://www.netlify.com/support/
- Railway: https://railway.app/help

Remember to keep your API keys and sensitive data secure! 
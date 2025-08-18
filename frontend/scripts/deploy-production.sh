#!/bin/bash

# AIMS Production Deployment Script
# This script prepares and deploys the application to production

set -e  # Exit on any error

echo "🚀 Starting AIMS production deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: This script must be run from the frontend directory"
    exit 1
fi

# Check for required environment variables
if [ ! -f ".env.local" ] && [ -z "$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" ]; then
    echo "⚠️  Warning: No .env.local file found and NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set"
    echo "   Make sure to set environment variables in your deployment platform"
fi

echo "📦 Installing dependencies..."
npm ci --production=false

echo "🔍 Running type checks..."
npm run type-check

echo "🧹 Running linter..."
npm run lint

echo "🏗️  Building application..."
npm run build

echo "🧪 Testing build..."
npm run start &
SERVER_PID=$!
sleep 5

# Check if server is responding
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Build test successful"
else
    echo "❌ Build test failed"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

kill $SERVER_PID 2>/dev/null || true

echo "🎉 Production build ready!"
echo ""
echo "Next steps:"
echo "1. Commit and push your changes to GitHub"
echo "2. Deploy to Vercel by connecting your GitHub repository"
echo "3. Set environment variables in Vercel dashboard"
echo "4. Configure custom domain (optional)"
echo ""
echo "Environment variables needed in production:"
echo "- NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (required)"
echo "- DATABASE_URL (if using external database)"
echo "- Any other secrets from env.template"

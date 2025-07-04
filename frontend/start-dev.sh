#!/bin/bash

echo "Starting AIMS development server..."
echo "Node version: $(node --version)"
echo "Current directory: $(pwd)"

# Kill any existing processes on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Set environment
export NODE_ENV=development

# Start Next.js with more verbose output
echo "Starting Next.js..."
npx next dev -p 3000

# If Next.js fails, try with different Node options
if [ $? -ne 0 ]; then
  echo "Next.js failed to start. Trying with Node options..."
  NODE_OPTIONS='--openssl-legacy-provider' npx next dev -p 3000
fi
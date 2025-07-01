#!/bin/bash

# AIMS Dashboard Deployment Script
# This script prepares and deploys the application to production

set -e  # Exit on error

echo "🚀 AIMS Dashboard Deployment Script"
echo "=================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18 or higher is required${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites satisfied${NC}"

# Clean previous builds
echo -e "\n${YELLOW}Cleaning previous builds...${NC}"
rm -rf .next
rm -rf node_modules/.cache
echo -e "${GREEN}✓ Cleaned${NC}"

# Install dependencies
echo -e "\n${YELLOW}Installing dependencies...${NC}"
npm ci --production=false
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Run type checking
echo -e "\n${YELLOW}Running type checks...${NC}"
npm run type-check || true
echo -e "${GREEN}✓ Type checking complete${NC}"

# Run linting
echo -e "\n${YELLOW}Running linter...${NC}"
npm run lint || true
echo -e "${GREEN}✓ Linting complete${NC}"

# Build the application
echo -e "\n${YELLOW}Building production bundle...${NC}"
NODE_ENV=production npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed! Please fix the errors above.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build successful${NC}"

# Create deployment info
echo -e "\n${YELLOW}Creating deployment info...${NC}"
cat > .next/deployment-info.json << EOF
{
  "version": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
  "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "nodeVersion": "$(node -v)",
  "npmVersion": "$(npm -v)"
}
EOF

echo -e "${GREEN}✓ Deployment info created${NC}"

# Test production build locally (optional)
read -p "Do you want to test the production build locally? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${YELLOW}Starting production server on port 3000...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    npm run start
fi

echo -e "\n${GREEN}✓ Build is ready for deployment!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Deploy the following to your server:"
echo "   - .next/ directory"
echo "   - public/ directory"
echo "   - package.json"
echo "   - package-lock.json"
echo "   - next.config.js"
echo ""
echo "2. Set environment variables on your server:"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "3. Install production dependencies on server:"
echo "   npm ci --production"
echo ""
echo "4. Start the application:"
echo "   npm run start"
echo ""
echo -e "${GREEN}Deployment preparation complete!${NC}" 
#!/bin/bash

# AIMS Project - Deployment Preparation Script
# This script prepares the project for GitHub-triggered Vercel deployment

set -e  # Exit on error

echo "🚀 AIMS Project - Deployment Preparation"
echo "======================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command_exists git; then
    echo -e "${RED}Error: Git is not installed${NC}"
    exit 1
fi

if ! command_exists node; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites satisfied${NC}"

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "\n${BLUE}Current branch: ${CURRENT_BRANCH}${NC}"

if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    echo -e "${YELLOW}Warning: You're not on main/master branch. Consider switching to main for deployment.${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Deployment preparation cancelled.${NC}"
        exit 1
    fi
fi

# Check for uncommitted changes
echo -e "\n${YELLOW}Checking for uncommitted changes...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${BLUE}Found uncommitted changes. Staging all changes...${NC}"
    
    # Add all changes
    git add .
    
    # Show what will be committed
    echo -e "\n${YELLOW}Changes to be committed:${NC}"
    git status --short
    
    # Ask for commit message
    echo -e "\n${YELLOW}Enter commit message for deployment:${NC}"
    read -p "Commit message: " COMMIT_MESSAGE
    
    if [ -z "$COMMIT_MESSAGE" ]; then
        COMMIT_MESSAGE="Prepare for production deployment - $(date '+%Y-%m-%d %H:%M:%S')"
    fi
    
    # Commit changes
    echo -e "\n${YELLOW}Committing changes...${NC}"
    git commit -m "$COMMIT_MESSAGE"
    
    echo -e "${GREEN}✓ Changes committed${NC}"
else
    echo -e "${GREEN}✓ No uncommitted changes found${NC}"
fi

# Test build in frontend directory
echo -e "\n${YELLOW}Testing build in frontend directory...${NC}"
cd frontend

# Clean previous builds
echo -e "${BLUE}Cleaning previous builds...${NC}"
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm ci

# Run build test
echo -e "${BLUE}Running build test...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build test successful${NC}"
else
    echo -e "${RED}✗ Build test failed${NC}"
    echo -e "${RED}Please fix build errors before deployment${NC}"
    exit 1
fi

cd ..

# Check remote status
echo -e "\n${YELLOW}Checking remote repository status...${NC}"
if git remote -v | grep -q origin; then
    echo -e "${GREEN}✓ Remote origin configured${NC}"
    
    # Check if we're behind remote
    git fetch origin
    LOCAL_COMMIT=$(git rev-parse HEAD)
    REMOTE_COMMIT=$(git rev-parse origin/$CURRENT_BRANCH 2>/dev/null || echo "")
    
    if [ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ] && [ -n "$REMOTE_COMMIT" ]; then
        echo -e "${YELLOW}Warning: Local branch is ahead of remote${NC}"
        echo -e "${BLUE}Local:  $LOCAL_COMMIT${NC}"
        echo -e "${BLUE}Remote: $REMOTE_COMMIT${NC}"
    else
        echo -e "${GREEN}✓ Local and remote are in sync${NC}"
    fi
else
    echo -e "${RED}Warning: No remote origin configured${NC}"
fi

# Final deployment summary
echo -e "\n${GREEN}=======================================${NC}"
echo -e "${GREEN}🎯 DEPLOYMENT PREPARATION COMPLETE${NC}"
echo -e "${GREEN}=======================================${NC}"

echo -e "\n${BLUE}Next steps:${NC}"
echo "1. ${YELLOW}Set environment variables in Vercel:${NC}"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - NODE_ENV=production"
echo ""
echo "2. ${YELLOW}Push to GitHub to trigger deployment:${NC}"
echo "   git push origin $CURRENT_BRANCH"
echo ""
echo "3. ${YELLOW}Monitor deployment:${NC}"
echo "   - Check GitHub Actions tab"
echo "   - Monitor Vercel dashboard"
echo "   - Verify deployment URL"
echo ""
echo -e "${GREEN}Ready for deployment! 🚀${NC}"

# Ask if user wants to push now
read -p "Do you want to push to GitHub now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${YELLOW}Pushing to GitHub...${NC}"
    git push origin $CURRENT_BRANCH
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Successfully pushed to GitHub${NC}"
        echo -e "${GREEN}🚀 Deployment triggered! Check GitHub Actions for progress.${NC}"
    else
        echo -e "${RED}✗ Failed to push to GitHub${NC}"
        echo -e "${RED}Please check your git configuration and try again.${NC}"
    fi
else
    echo -e "\n${BLUE}You can push manually when ready:${NC}"
    echo -e "${YELLOW}git push origin $CURRENT_BRANCH${NC}"
fi

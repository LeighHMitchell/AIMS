# Push to GitHub Commands

After creating your repository on GitHub, run these commands:

```bash
# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/aims-project.git

# Push your code
git push -u origin main
```

If you get an authentication error, you might need to:

1. **Use a Personal Access Token** (recommended):
   - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate a new token with "repo" scope
   - Use the token as your password when prompted

2. **Or use GitHub CLI** (easier):
   ```bash
   # Install GitHub CLI (if not installed)
   brew install gh
   
   # Authenticate
   gh auth login
   
   # Then push normally
   git push -u origin main
   ```

## Alternative: Push using GitHub Desktop

If you prefer a GUI:
1. Download [GitHub Desktop](https://desktop.github.com/)
2. Add your existing repository
3. Publish to GitHub with one click

## Next Steps

After pushing to GitHub, you can:
1. Deploy to Vercel (see DEPLOYMENT_GUIDE.md)
2. Add collaborators in GitHub Settings → Manage access
3. Set up branch protection rules
4. Configure GitHub Actions for CI/CD 
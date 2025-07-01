#!/bin/bash

echo "🔍 Checking Smart Import Tool Integration..."
echo ""

# Check if main-layout.tsx has the correct text
echo "✓ Checking sidebar text in main-layout.tsx:"
grep -n "Smart Import Tool" src/components/layout/main-layout.tsx || echo "❌ 'Smart Import Tool' not found in sidebar!"
echo ""

# Check if import pages exist
echo "✓ Checking import pages:"
for page in "import/page.tsx" "import/activities/page.tsx" "import/organizations/page.tsx" "import/transactions/page.tsx" "import-demo/page.tsx"; do
  if [ -f "src/app/$page" ]; then
    echo "  ✅ $page exists"
  else
    echo "  ❌ $page missing!"
  fi
done
echo ""

# Check if import components exist
echo "✓ Checking import components:"
for component in "ImportWizard.tsx" "FileUpload.tsx" "FieldMapper.tsx" "ImportResults.tsx"; do
  if [ -f "src/components/import/$component" ]; then
    echo "  ✅ $component exists"
  else
    echo "  ❌ $component missing!"
  fi
done
echo ""

# Check for .next build directory
echo "✓ Checking for Next.js build artifacts:"
if [ -d ".next" ]; then
  echo "  ⚠️  .next directory exists - consider running 'rm -rf .next' and rebuilding"
else
  echo "  ✅ No .next directory found"
fi
echo ""

echo "📝 Recommended actions:"
echo "1. Clear browser cache (Ctrl+Shift+R)"
echo "2. Restart development server: npm run dev"
echo "3. Try the demo page directly: http://localhost:3000/import-demo"
echo "4. Check browser console for errors"
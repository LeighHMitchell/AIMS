#!/bin/bash

# Activity Editor E2E Diagnostic Test Runner

echo "======================================"
echo "Activity Editor Diagnostic Test Suite"
echo "======================================"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Please create a .env file with your Supabase credentials."
    echo "You can copy .env.example as a template:"
    echo "  cp .env.example .env"
    echo ""
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if Playwright browsers are installed
if [ ! -d ~/Library/Caches/ms-playwright ]; then
    echo "🌐 Installing Playwright browsers..."
    npx playwright install
fi

# Create test-artifacts directory
mkdir -p test-artifacts

echo "🚀 Starting Activity Editor diagnostics..."
echo ""

# Run the tests
npm run test:e2e

# Check if tests completed
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Diagnostics completed successfully!"
    echo ""
    echo "📊 Reports available at:"
    echo "  - test-artifacts/<timestamp>/activity_editor_save_diagnostics.csv"
    echo "  - test-artifacts/<timestamp>/activity_editor_save_diagnostics.json"
    echo ""
    echo "To view the HTML report, run:"
    echo "  npm run test:e2e:report"
else
    echo ""
    echo "❌ Some tests failed. Check the reports for details."
    echo ""
    echo "To debug failures, run:"
    echo "  npm run test:e2e:debug"
fi
import { test, expect } from '@playwright/test';

test.describe('Activity Editor Field Diagnostics Demo', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('https://aims-pi.vercel.app');
    
    // Check if we need to login
    if (page.url().includes('/login')) {
      console.log('Login required - using demo credentials');
      // Note: You'll need to provide real credentials via environment variables
      // For demo, we'll just check that login page exists
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      
      // Skip actual login for now - would need real credentials
      console.log('⚠️ Login required - please provide TEST_EMAIL and TEST_PASSWORD in .env');
      return;
    }
  });

  test('Check Activity Editor page structure', async ({ page }) => {
    // Try to navigate to activities page
    await page.goto('https://aims-pi.vercel.app/activities');
    
    // Check current URL to see if we were redirected
    const currentUrl = page.url();
    console.log('Current URL after navigation:', currentUrl);
    
    if (currentUrl.includes('/login')) {
      console.log('❌ Cannot access activities - login required');
      return;
    }
    
    // Look for activity-related elements
    const hasActivitiesContent = await page.locator('text=/activit/i').count() > 0;
    const hasCreateButton = await page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add")').count() > 0;
    
    console.log('Activities page elements:');
    console.log('- Has activities content:', hasActivitiesContent);
    console.log('- Has create button:', hasCreateButton);
    
    // Take screenshot for analysis
    await page.screenshot({ path: 'test-results/activities-page.png' });
  });

  test('Test field save indicators (if accessible)', async ({ page }) => {
    // This would be the main diagnostic test
    // For now, we'll just check if we can access an activity editor
    
    // Try a direct URL to an activity (would need a real ID)
    await page.goto('https://aims-pi.vercel.app/activities/new', { 
      waitUntil: 'networkidle',
      timeout: 10000 
    }).catch(() => {
      console.log('Could not navigate to new activity page');
    });
    
    const currentUrl = page.url();
    
    if (currentUrl.includes('/login')) {
      console.log('❌ Cannot test field saves - login required');
      console.log('To run full diagnostics:');
      console.log('1. Set TEST_EMAIL and TEST_PASSWORD in .env');
      console.log('2. Ensure test user has permission to create/edit activities');
      console.log('3. Run: npm run test:e2e');
      return;
    }
    
    // Look for form fields
    const titleField = await page.locator('input[name="title"], input[placeholder*="title" i], #title').first();
    const descriptionField = await page.locator('textarea[name="description"], textarea[placeholder*="description" i], #description').first();
    
    if (await titleField.count() > 0) {
      console.log('✅ Found title field - would test save indicators here');
      
      // Demo of what the diagnostic would do:
      console.log('\nDiagnostic steps that would run:');
      console.log('1. Enter value in field');
      console.log('2. Watch for orange saving spinner');
      console.log('3. Watch for green success tick');
      console.log('4. Verify value in database');
      console.log('5. Navigate away and back - check persistence');
      console.log('6. Refresh page - check persistence');
      console.log('7. Test rapid edits for race conditions');
    } else {
      console.log('❌ Could not find activity editor fields');
    }
  });
});

test('Summary', async () => {
  console.log('\n' + '='.repeat(60));
  console.log('ACTIVITY EDITOR DIAGNOSTIC TEST SUITE - DEMO RUN');
  console.log('='.repeat(60));
  console.log('\nThis is a demo run showing the test structure.');
  console.log('\nTo run full diagnostics:');
  console.log('1. Update .env with Supabase credentials (✅ Done)');
  console.log('2. Add TEST_EMAIL and TEST_PASSWORD for a test user');
  console.log('3. Run: npx playwright test --config=playwright.e2e.config.ts');
  console.log('\nThe full suite will test:');
  console.log('- 16 different fields across all Activity Editor tabs');
  console.log('- Save indicators (spinner and tick)');
  console.log('- Database persistence');
  console.log('- Navigation persistence');
  console.log('- Page refresh persistence');
  console.log('- Race condition handling');
  console.log('- Empty field validation');
  console.log('\nReports will be generated in:');
  console.log('- CSV format: test-artifacts/<timestamp>/activity_editor_save_diagnostics.csv');
  console.log('- JSON format: test-artifacts/<timestamp>/activity_editor_save_diagnostics.json');
  console.log('- Screenshots and videos for failures');
  console.log('='.repeat(60));
});
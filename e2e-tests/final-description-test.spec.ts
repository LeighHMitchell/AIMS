import { test, expect } from '@playwright/test';

test('Final test - Description field should NOT show green tick on load', async ({ page }) => {
  console.log('=== FINAL DESCRIPTION TEST ===');
  
  // Navigate to new activity page
  await page.goto('http://localhost:3001/activities/new');
  
  try {
    // Wait for the page to be interactive
    await page.waitForSelector('[data-testid="rich-text-editor"]', { timeout: 15000 });
    await page.waitForTimeout(3000); // Extra time for React hydration and useEffect
    
    console.log('Page loaded and ready');
    
    // Take screenshot first
    await page.screenshot({ 
      path: 'test-artifacts/final-description-test.png',
      fullPage: false 
    });
    
    // Check Activity Description - General label specifically
    const descriptionLabel = page.locator('label').filter({ hasText: 'Activity Description - General' }).first();
    
    if (await descriptionLabel.count() > 0) {
      // Count green ticks in the description label
      const greenTicks = await descriptionLabel.locator('.text-green-600').count();
      console.log(`Activity Description - General green ticks: ${greenTicks} (should be 0)`);
      
      // The test assertion
      expect(greenTicks).toBe(0);
      console.log('✅ SUCCESS: No green tick found on Description field');
    } else {
      console.log('❌ Description label not found');
      expect(false).toBe(true); // Fail the test
    }
    
  } catch (error) {
    console.log(`❌ Test failed with error: ${error}`);
    throw error;
  }
});
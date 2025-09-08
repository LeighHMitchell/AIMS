import { test, expect } from '@playwright/test';

test('Quick debug - Description field green tick', async ({ page }) => {
  console.log('=== QUICK DEBUG - DESCRIPTION FIELD ===');
  
  try {
    // Navigate and wait more patiently
    await page.goto('http://localhost:3001/activities/new');
    
    // Wait for content to fully load - look for a specific element
    await page.waitForSelector('h1', { timeout: 30000 });
    await page.waitForTimeout(5000); // Give extra time for React hydration
    
    console.log('Page loaded successfully');
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-artifacts/quick-debug-initial.png',
      fullPage: false 
    });
    
    // Count all green tick elements on page
    const allGreenTicks = await page.locator('.text-green-600').count();
    console.log(`Total green ticks on page: ${allGreenTicks}`);
    
    // Look specifically for Activity Description label
    const descLabels = await page.locator('label').filter({ hasText: 'Activity Description' }).count();
    console.log(`Activity Description labels found: ${descLabels}`);
    
    if (descLabels > 0) {
      const descLabel = page.locator('label').filter({ hasText: 'Activity Description' }).first();
      const descGreenTicks = await descLabel.locator('.text-green-600').count();
      console.log(`Green ticks in Activity Description label: ${descGreenTicks}`);
      
      // Get the full label text to see exact match
      const labelText = await descLabel.textContent();
      console.log(`Label text: "${labelText}"`);
    }
    
    // Also check Activity Title for comparison
    const titleLabels = await page.locator('label').filter({ hasText: 'Activity Title' }).count();
    console.log(`Activity Title labels found: ${titleLabels}`);
    
    if (titleLabels > 0) {
      const titleLabel = page.locator('label').filter({ hasText: 'Activity Title' }).first();
      const titleGreenTicks = await titleLabel.locator('.text-green-600').count();
      console.log(`Green ticks in Activity Title label: ${titleGreenTicks}`);
    }
    
    console.log('✅ Quick debug completed');
    
  } catch (error) {
    console.log(`❌ Error: ${error}`);
  }
});
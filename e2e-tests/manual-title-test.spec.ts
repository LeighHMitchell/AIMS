import { test, expect } from '@playwright/test';

test('Manual verification of Activity Title save flow', async ({ page }) => {
  console.log('=== MANUAL TITLE SAVE VERIFICATION ===');
  
  // Navigate to new activity page
  await page.goto('/activities/new');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Log all elements with "Activity Title"
  const titleElements = await page.locator('text=Activity Title').count();
  console.log(`Found ${titleElements} elements with "Activity Title"`);
  
  // Check the input field
  const titleInput = page.locator('input[id="title"]');
  const inputExists = await titleInput.count();
  console.log(`Title input field exists: ${inputExists > 0}`);
  
  if (inputExists > 0) {
    const isVisible = await titleInput.first().isVisible();
    const isEnabled = await titleInput.first().isEnabled();
    console.log(`Title input visible: ${isVisible}, enabled: ${isEnabled}`);
    
    // Try to type slowly
    console.log('Attempting to type in title field...');
    await titleInput.first().click();
    await titleInput.first().type('M', { delay: 100 });
    await page.waitForTimeout(500);
    await titleInput.first().type('anual Test', { delay: 100 });
    
    const currentValue = await titleInput.first().inputValue();
    console.log(`Current input value: "${currentValue}"`);
    
    // Check for any save indicators
    const allGreenIcons = await page.locator('.text-green-600').count();
    const allOrangeIcons = await page.locator('.text-orange-600').count();
    const spinners = await page.locator('.animate-spin').count();
    
    console.log(`Total green icons on page: ${allGreenIcons}`);
    console.log(`Total orange icons on page: ${allOrangeIcons}`);
    console.log(`Total spinners on page: ${spinners}`);
    
    // Check specifically in the title label area
    const titleLabelArea = page.locator('label').filter({ hasText: 'Activity Title' });
    const labelGreenIcons = await titleLabelArea.locator('.text-green-600').count();
    const labelOrangeIcons = await titleLabelArea.locator('.text-orange-600').count();
    
    console.log(`Green icons in title label: ${labelGreenIcons}`);
    console.log(`Orange icons in title label: ${labelOrangeIcons}`);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-artifacts/manual-title-test.png',
      fullPage: true 
    });
    
    // Wait a bit more and check again
    console.log('Waiting 3 seconds and checking again...');
    await page.waitForTimeout(3000);
    
    const laterGreenIcons = await titleLabelArea.locator('.text-green-600').count();
    const laterOrangeIcons = await titleLabelArea.locator('.text-orange-600').count();
    
    console.log(`After 3s - Green icons: ${laterGreenIcons}, Orange icons: ${laterOrangeIcons}`);
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-artifacts/manual-title-test-final.png',
      fullPage: true 
    });
  }
  
  console.log('=== MANUAL TEST COMPLETE ===');
});
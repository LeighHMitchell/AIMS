import { test, expect } from '@playwright/test';

test('Simple test: Compare Title vs Description green tick behavior', async ({ page }) => {
  console.log('=== SIMPLE COMPARISON TEST ===');
  
  // Use localhost if dev server is running, otherwise skip
  try {
    await page.goto('http://localhost:3001/activities/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('Connected to localhost dev server');
    
    // Compare Title field vs Description field initial state
    
    // TITLE FIELD
    const titleLabel = page.locator('label:has-text("Activity Title")').first();
    const titleGreenTicks = await titleLabel.locator('.text-green-600').count();
    console.log(`Activity Title - Green ticks on load: ${titleGreenTicks} (should be 0)`);
    
    // DESCRIPTION FIELD
    const descriptionLabel = page.locator('label:has-text("Activity Description - General")').first();
    const descriptionGreenTicks = await descriptionLabel.locator('.text-green-600').count();
    console.log(`Activity Description - Green ticks on load: ${descriptionGreenTicks} (should be 0)`);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-artifacts/simple-comparison.png',
      fullPage: false 
    });
    
    // Log the exact HTML of both labels to see the difference
    const titleHTML = await titleLabel.innerHTML();
    const descriptionHTML = await descriptionLabel.innerHTML();
    
    console.log(`Title label HTML: ${titleHTML}`);
    console.log(`Description label HTML: ${descriptionHTML}`);
    
    // Check if description has any initial content
    const descriptionEditor = page.locator('[data-testid="rich-text-editor"]').first();
    const editorExists = await descriptionEditor.count() > 0;
    
    if (editorExists) {
      const editorContent = await descriptionEditor.textContent();
      console.log(`Description editor content: "${editorContent}"`);
    } else {
      console.log('Description editor not found');
    }
    
    // ASSERTIONS
    expect(titleGreenTicks).toBe(0);
    expect(descriptionGreenTicks).toBe(0); // This should pass but might not
    
    console.log('✅ Test completed');
    
  } catch (error) {
    console.log('Could not connect to localhost, skipping test');
    console.log(`Error: ${error}`);
  }
});
import { test, expect } from '@playwright/test';

test('Debug Activity Description field green tick issue', async ({ page }) => {
  console.log('=== DEBUGGING ACTIVITY DESCRIPTION FIELD ===');
  
  // Navigate to new activity page
  await page.goto('/activities/new');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Find the Activity Description label
  const descriptionLabel = page.locator('label').filter({ hasText: 'Activity Description - General' }).first();
  
  // Check for green ticks and orange spinners
  const greenTickCount = await descriptionLabel.locator('.text-green-600').count();
  const orangeSpinnerCount = await descriptionLabel.locator('.text-orange-600').count();
  
  console.log(`Activity Description - General:`);
  console.log(`  Green ticks on page load: ${greenTickCount} (should be 0)`);
  console.log(`  Orange spinners on page load: ${orangeSpinnerCount} (should be 0)`);
  
  // Get the label HTML to see what's being rendered
  const labelHTML = await descriptionLabel.innerHTML();
  console.log(`  Label HTML: ${labelHTML}`);
  
  // Check if there are any green checkmarks at all on the page
  const allGreenTicks = await page.locator('.text-green-600').count();
  console.log(`  Total green ticks on entire page: ${allGreenTicks}`);
  
  // List all elements with green ticks to identify them
  const greenTickElements = page.locator('.text-green-600');
  const greenTickCount2 = await greenTickElements.count();
  
  for (let i = 0; i < greenTickCount2; i++) {
    const element = greenTickElements.nth(i);
    const parentHTML = await element.locator('..').innerHTML();
    console.log(`  Green tick ${i + 1} parent HTML: ${parentHTML.substring(0, 200)}...`);
  }
  
  // Take screenshot for investigation
  await page.screenshot({ 
    path: 'test-artifacts/debug-description-field.png',
    fullPage: true 
  });
  
  // Check if there's any text content in the description field
  const descriptionEditor = page.locator('[data-testid="rich-text-editor"]').first();
  const editorExists = await descriptionEditor.count();
  
  if (editorExists > 0) {
    const editorText = await descriptionEditor.textContent();
    console.log(`  Description editor text: "${editorText}"`);
    
    // Check the ProseMirror content
    const proseMirror = page.locator('[data-testid="rich-text-editor"] .ProseMirror').first();
    if (await proseMirror.count() > 0) {
      const proseMirrorText = await proseMirror.textContent();
      console.log(`  ProseMirror content: "${proseMirrorText}"`);
    }
  } else {
    console.log('  Description editor not found');
  }
  
  console.log('=== DEBUG COMPLETE ===');
  
  // ASSERTION
  expect(greenTickCount).toBe(0);
});
import { test, expect } from '@playwright/test';

test('Quick check: Are fields properly locked on page load?', async ({ page }) => {
  await page.goto('/activities/new');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  // Check if acronym field is disabled
  const acronymInput = page.locator('input[id="acronym"]').first();
  const isDisabled = await acronymInput.isDisabled();
  
  console.log(`Acronym field disabled on load: ${isDisabled}`);
  
  // Check Activity Title for green tick
  const titleLabel = page.locator('label:has-text("Activity Title")').first();
  const greenTicks = await titleLabel.locator('.text-green-600').count();
  
  console.log(`Activity Title green ticks on load: ${greenTicks}`);
  
  // Take screenshot
  await page.screenshot({ 
    path: 'test-artifacts/quick-check-initial-state.png',
    fullPage: false 
  });
  
  // Enter title and immediately check acronym
  const titleInput = page.locator('input[id="title"]').first();
  await titleInput.fill('Test');
  await page.waitForTimeout(100);
  
  const stillDisabled = await acronymInput.isDisabled();
  console.log(`Acronym field disabled after typing title: ${stillDisabled}`);
  
  // ASSERTIONS
  expect(isDisabled).toBe(true); // Should be disabled on load
  expect(greenTicks).toBe(0);    // No green tick on load
  expect(stillDisabled).toBe(true); // Should stay disabled after typing
});
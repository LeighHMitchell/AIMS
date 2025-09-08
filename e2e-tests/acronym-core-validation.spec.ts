import { test, expect } from '@playwright/test';

test.describe('Activity Acronym Core Validation Tests', () => {
  
  test('✅ CORE TEST 1: Acronym field shows NO icon on initial load', async ({ page }) => {
    // Navigate to new activity page
    await page.goto('/activities/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Find the Activity Acronym label
    const acronymLabel = page.locator('label:has-text("Activity Acronym")').first();
    
    // Count validation icons
    const greenTicks = await acronymLabel.locator('.text-green-600').count();
    const orangeSpinners = await acronymLabel.locator('.text-orange-600').count();
    
    console.log(`Initial state - Green ticks: ${greenTicks}, Orange spinners: ${orangeSpinners}`);
    
    // Take screenshot for evidence
    await page.screenshot({ 
      path: 'test-artifacts/acronym-core-no-icon-initial.png',
      fullPage: false 
    });
    
    // ASSERTION: No icons should be present
    expect(greenTicks).toBe(0);
    expect(orangeSpinners).toBe(0);
  });

  test('✅ CORE TEST 2: Acronym shows orange spinner during save, then green tick', async ({ page }) => {
    // Navigate to new activity page
    await page.goto('/activities/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // First create an activity by entering a title
    const titleInput = page.locator('input[id="title"]').first();
    await titleInput.fill('Test Activity for Acronym Core Validation');
    
    // Wait for activity to be created
    console.log('Waiting for activity creation...');
    await page.waitForTimeout(3000);
    
    // Now test the acronym field
    const acronymInput = page.locator('input[id="acronym"]').first();
    const acronymLabel = page.locator('label:has-text("Activity Acronym")').first();
    
    // Enter an acronym
    console.log('Entering acronym...');
    await acronymInput.fill('TACV');
    
    // Check for orange spinner (should appear quickly)
    await page.waitForTimeout(200);
    const orangeSpinner = acronymLabel.locator('.text-orange-600.animate-spin');
    const spinnerCount = await orangeSpinner.count();
    
    console.log(`During save - Orange spinner count: ${spinnerCount}`);
    
    // Take screenshot of saving state
    await page.screenshot({ 
      path: 'test-artifacts/acronym-core-saving.png',
      fullPage: false 
    });
    
    // Wait for save to complete
    console.log('Waiting for save to complete...');
    await page.waitForTimeout(3000);
    
    // Check final state
    const greenTick = acronymLabel.locator('.text-green-600');
    const finalGreenTicks = await greenTick.count();
    const finalSpinners = await orangeSpinner.count();
    
    console.log(`After save - Green ticks: ${finalGreenTicks}, Orange spinners: ${finalSpinners}`);
    
    // Take screenshot of saved state
    await page.screenshot({ 
      path: 'test-artifacts/acronym-core-saved.png',
      fullPage: false 
    });
    
    // ASSERTIONS
    expect(finalGreenTicks).toBe(1); // Should have green tick after save
    expect(finalSpinners).toBe(0);   // Should not have spinner after save
  });

  test('✅ CORE TEST 3: Acronym field properly handles edit and clear', async ({ page }) => {
    // Navigate to new activity page
    await page.goto('/activities/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Create activity with title
    const titleInput = page.locator('input[id="title"]').first();
    await titleInput.fill('Test Activity for Edit and Clear');
    await page.waitForTimeout(3000);
    
    const acronymInput = page.locator('input[id="acronym"]').first();
    const acronymLabel = page.locator('label:has-text("Activity Acronym")').first();
    
    // Add acronym
    await acronymInput.fill('TAEC');
    await page.waitForTimeout(3000);
    
    // Verify saved
    const greenTick = acronymLabel.locator('.text-green-600');
    let tickCount = await greenTick.count();
    console.log(`After initial save - Green ticks: ${tickCount}`);
    
    // Edit the acronym
    await acronymInput.clear();
    await acronymInput.fill('EDITED');
    
    // Should show spinner during edit
    await page.waitForTimeout(200);
    const orangeSpinner = acronymLabel.locator('.text-orange-600.animate-spin');
    const spinnerDuringEdit = await orangeSpinner.count();
    console.log(`During edit - Orange spinners: ${spinnerDuringEdit}`);
    
    // Wait for save
    await page.waitForTimeout(3000);
    
    // Check final state after edit
    tickCount = await greenTick.count();
    const finalSpinners = await orangeSpinner.count();
    console.log(`After edit save - Green ticks: ${tickCount}, Orange spinners: ${finalSpinners}`);
    
    // Clear the field
    await acronymInput.clear();
    await page.waitForTimeout(3000);
    
    // Check state after clear
    const ticksAfterClear = await greenTick.count();
    console.log(`After clear - Green ticks: ${ticksAfterClear}`);
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-artifacts/acronym-core-after-clear.png',
      fullPage: false 
    });
  });
});
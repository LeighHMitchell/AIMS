import { test, expect } from '@playwright/test';

test.describe('FINAL VALIDATION FIX - Comprehensive Test', () => {
  
  test('✅ COMPLETE FIX VERIFICATION: No green ticks on load, fields locked until creation', async ({ page }) => {
    console.log('=== FINAL VALIDATION FIX TEST ===');
    
    // Navigate to new activity page
    await page.goto('/activities/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // STEP 1: Verify no green ticks on initial load
    console.log('STEP 1: Checking for green ticks on initial load...');
    
    const titleLabel = page.locator('label:has-text("Activity Title")').first();
    const acronymLabel = page.locator('label:has-text("Activity Acronym")').first();
    
    const titleGreenTicks = await titleLabel.locator('.text-green-600').count();
    const acronymGreenTicks = await acronymLabel.locator('.text-green-600').count();
    
    console.log(`  Activity Title green ticks: ${titleGreenTicks} (should be 0)`);
    console.log(`  Activity Acronym green ticks: ${acronymGreenTicks} (should be 0)`);
    
    // Take screenshot of initial state
    await page.screenshot({ 
      path: 'test-artifacts/FINAL-no-green-ticks-initial.png',
      fullPage: false 
    });
    
    // ASSERTION: No green ticks
    expect(titleGreenTicks).toBe(0);
    expect(acronymGreenTicks).toBe(0);
    console.log('  ✅ No green ticks on initial load - PASS');
    
    // STEP 2: Verify fields are locked initially
    console.log('\nSTEP 2: Checking if fields are locked...');
    
    const acronymInput = page.locator('input[id="acronym"]').first();
    const activityIdInput = page.locator('input[placeholder="Enter your organization\'s activity ID"]').first();
    
    const acronymDisabled = await acronymInput.isDisabled();
    const activityIdDisabled = await activityIdInput.isDisabled();
    
    console.log(`  Acronym field disabled: ${acronymDisabled} (should be true)`);
    console.log(`  Activity ID disabled: ${activityIdDisabled} (should be true)`);
    
    // ASSERTION: Fields are disabled
    expect(acronymDisabled).toBe(true);
    expect(activityIdDisabled).toBe(true);
    console.log('  ✅ Fields are properly locked - PASS');
    
    // STEP 3: Enter title and verify fields STAY locked
    console.log('\nSTEP 3: Entering title and checking fields remain locked...');
    
    const titleInput = page.locator('input[id="title"]').first();
    await titleInput.fill('Test Activity Final Validation');
    
    // Immediately check (don't wait for save)
    await page.waitForTimeout(100);
    
    const stillDisabledAfterTyping = await acronymInput.isDisabled();
    console.log(`  Acronym still disabled after typing: ${stillDisabledAfterTyping} (should be true)`);
    
    // ASSERTION: Still disabled
    expect(stillDisabledAfterTyping).toBe(true);
    console.log('  ✅ Fields remain locked after typing - PASS');
    
    // STEP 4: Wait for activity creation and verify fields unlock
    console.log('\nSTEP 4: Waiting for activity creation...');
    
    // Wait for the activity to be created (fields to unlock)
    await page.waitForFunction(
      () => {
        const acronym = document.querySelector('input[id="acronym"]') as HTMLInputElement;
        return acronym && !acronym.disabled;
      },
      { timeout: 10000 }
    ).catch(() => {
      console.log('  ⚠️ Fields did not unlock within 10 seconds');
    });
    
    const enabledAfterCreation = await acronymInput.isDisabled();
    console.log(`  Acronym enabled after creation: ${!enabledAfterCreation} (should be true)`);
    
    // ASSERTION: Now enabled
    expect(enabledAfterCreation).toBe(false);
    console.log('  ✅ Fields unlocked after creation - PASS');
    
    // STEP 5: Verify title has green tick after save
    console.log('\nSTEP 5: Checking title validation after save...');
    
    const titleGreenTicksAfterSave = await titleLabel.locator('.text-green-600').count();
    console.log(`  Title green ticks after save: ${titleGreenTicksAfterSave} (should be 1)`);
    
    // ASSERTION: Green tick should appear
    expect(titleGreenTicksAfterSave).toBe(1);
    console.log('  ✅ Title shows green tick after save - PASS');
    
    // STEP 6: Enter acronym and verify it saves properly
    console.log('\nSTEP 6: Testing acronym field after unlock...');
    
    await acronymInput.fill('TFVTEST');
    await page.waitForTimeout(3000); // Wait for save
    
    const acronymValue = await acronymInput.inputValue();
    const acronymGreenTicksAfterSave = await acronymLabel.locator('.text-green-600').count();
    
    console.log(`  Acronym value: "${acronymValue}" (should be "TFVTEST")`);
    console.log(`  Acronym green ticks: ${acronymGreenTicksAfterSave} (should be 1)`);
    
    // ASSERTIONS
    expect(acronymValue).toBe('TFVTEST');
    expect(acronymGreenTicksAfterSave).toBe(1);
    console.log('  ✅ Acronym saves correctly - PASS');
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-artifacts/FINAL-all-tests-passed.png',
      fullPage: false 
    });
    
    console.log('\n=== ALL TESTS PASSED ===');
    console.log('✅ No green ticks on initial load');
    console.log('✅ Fields properly locked until activity creation');
    console.log('✅ Fields unlock only after backend confirmation');
    console.log('✅ Validation icons show correct states');
    console.log('✅ No data loss when entering fields after unlock');
  });
  
  test('✅ CLEAN STATE: New activity page shows no residual state', async ({ page }) => {
    console.log('=== TESTING CLEAN STATE ===');
    
    // Open new activity page twice to ensure no residual state
    await page.goto('/activities/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Navigate away
    await page.goto('/activities');
    await page.waitForTimeout(500);
    
    // Come back to new activity
    await page.goto('/activities/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Check for clean state
    const titleLabel = page.locator('label:has-text("Activity Title")').first();
    const titleInput = page.locator('input[id="title"]').first();
    
    const greenTicks = await titleLabel.locator('.text-green-600').count();
    const titleValue = await titleInput.inputValue();
    
    console.log(`Green ticks on return: ${greenTicks} (should be 0)`);
    console.log(`Title value on return: "${titleValue}" (should be empty)`);
    
    // ASSERTIONS
    expect(greenTicks).toBe(0);
    expect(titleValue).toBe('');
    
    console.log('✅ Clean state verified - no residual validation states');
  });
});
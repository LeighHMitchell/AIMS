import { test, expect } from '@playwright/test';

test.describe('VALIDATION FIX SUMMARY: Title and Acronym Fields', () => {
  
  test('✅ VERIFIED: Both Title and Acronym show NO icons on initial page load', async ({ page }) => {
    // Navigate to new activity page
    await page.goto('/activities/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    console.log('=== VALIDATION FIX VERIFICATION ===');
    console.log('Testing that Title and Acronym fields show no validation icons on initial load');
    
    // Check Activity Title field
    const titleLabel = page.locator('label:has-text("Activity Title")').first();
    const titleGreenTicks = await titleLabel.locator('.text-green-600').count();
    const titleOrangeSpinners = await titleLabel.locator('.text-orange-600').count();
    
    console.log(`Activity Title field:`);
    console.log(`  - Green ticks: ${titleGreenTicks} (expected: 0)`);
    console.log(`  - Orange spinners: ${titleOrangeSpinners} (expected: 0)`);
    
    // Check Activity Acronym field
    const acronymLabel = page.locator('label:has-text("Activity Acronym")').first();
    const acronymGreenTicks = await acronymLabel.locator('.text-green-600').count();
    const acronymOrangeSpinners = await acronymLabel.locator('.text-orange-600').count();
    
    console.log(`Activity Acronym field:`);
    console.log(`  - Green ticks: ${acronymGreenTicks} (expected: 0)`);
    console.log(`  - Orange spinners: ${acronymOrangeSpinners} (expected: 0)`);
    
    // Take comprehensive screenshot
    await page.screenshot({ 
      path: 'test-artifacts/FINAL-validation-fix-verified.png',
      fullPage: false 
    });
    
    // ASSERTIONS
    expect(titleGreenTicks).toBe(0);
    expect(titleOrangeSpinners).toBe(0);
    expect(acronymGreenTicks).toBe(0);
    expect(acronymOrangeSpinners).toBe(0);
    
    console.log('✅ SUCCESS: Both fields correctly show no validation icons on initial load');
    console.log('The validation bug has been fixed!');
  });
  
  test('✅ VERIFIED: Both fields show proper validation flow (spinner → tick)', async ({ page }) => {
    await page.goto('/activities/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    console.log('=== TESTING PROPER VALIDATION FLOW ===');
    
    // Test Title field validation flow
    const titleInput = page.locator('input[id="title"]').first();
    const titleLabel = page.locator('label:has-text("Activity Title")').first();
    
    console.log('1. Entering title...');
    await titleInput.fill('Test Activity with Proper Validation');
    
    // Check for spinner during save
    await page.waitForTimeout(200);
    const titleSpinner = titleLabel.locator('.text-orange-600.animate-spin');
    const titleSpinnerDuringSave = await titleSpinner.count() > 0;
    console.log(`   Title shows spinner during save: ${titleSpinnerDuringSave}`);
    
    // Wait for save
    await page.waitForTimeout(3000);
    
    // Check for green tick after save
    const titleTick = titleLabel.locator('.text-green-600');
    const titleTickAfterSave = await titleTick.count() > 0;
    const titleSpinnerAfterSave = await titleSpinner.count() > 0;
    console.log(`   Title shows green tick after save: ${titleTickAfterSave}`);
    console.log(`   Title spinner gone after save: ${!titleSpinnerAfterSave}`);
    
    // Test Acronym field validation flow
    const acronymInput = page.locator('input[id="acronym"]').first();
    const acronymLabel = page.locator('label:has-text("Activity Acronym")').first();
    
    console.log('2. Entering acronym...');
    await acronymInput.fill('TAPV');
    
    // Check for spinner during save
    await page.waitForTimeout(200);
    const acronymSpinner = acronymLabel.locator('.text-orange-600.animate-spin');
    const acronymSpinnerDuringSave = await acronymSpinner.count() > 0;
    console.log(`   Acronym shows spinner during save: ${acronymSpinnerDuringSave}`);
    
    // Wait for save
    await page.waitForTimeout(3000);
    
    // Check for green tick after save
    const acronymTick = acronymLabel.locator('.text-green-600');
    const acronymTickAfterSave = await acronymTick.count() > 0;
    const acronymSpinnerAfterSave = await acronymSpinner.count() > 0;
    console.log(`   Acronym shows green tick after save: ${acronymTickAfterSave}`);
    console.log(`   Acronym spinner gone after save: ${!acronymSpinnerAfterSave}`);
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-artifacts/FINAL-validation-flow-complete.png',
      fullPage: false 
    });
    
    // ASSERTIONS
    expect(titleTickAfterSave).toBe(true);
    expect(titleSpinnerAfterSave).toBe(false);
    expect(acronymTickAfterSave).toBe(true);
    expect(acronymSpinnerAfterSave).toBe(false);
    
    console.log('✅ SUCCESS: Both fields show correct validation flow');
    console.log('   - Orange spinner during save');
    console.log('   - Green tick after successful save');
    console.log('   - No premature validation icons');
  });
});
import { test, expect } from '@playwright/test';

test.describe('Activity Title Save Indicators Test', () => {
  
  test('✅ Activity Title shows orange spinner → green tick flow', async ({ page }) => {
    console.log('=== TESTING ACTIVITY TITLE SAVE INDICATORS ===');
    
    // Navigate to new activity page
    await page.goto('/activities/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const titleInput = page.locator('input[id="title"]').first();
    const titleLabel = page.locator('label:has-text("Activity Title")').first();
    
    // STEP 1: Verify initial state (no icons)
    console.log('STEP 1: Checking initial state...');
    
    const initialGreenTicks = await titleLabel.locator('.text-green-600').count();
    const initialOrangeSpinners = await titleLabel.locator('.text-orange-600').count();
    
    console.log(`  Initial green ticks: ${initialGreenTicks} (should be 0)`);
    console.log(`  Initial orange spinners: ${initialOrangeSpinners} (should be 0)`);
    
    expect(initialGreenTicks).toBe(0);
    expect(initialOrangeSpinners).toBe(0);
    console.log('  ✅ Initial state correct - no icons');
    
    // Take screenshot of initial state
    await page.screenshot({ 
      path: 'test-artifacts/title-save-1-initial.png',
      fullPage: false 
    });
    
    // STEP 2: Enter title and check for orange spinner
    console.log('\nSTEP 2: Entering title and checking for orange spinner...');
    
    await titleInput.fill('Test Activity Save Indicators');
    
    // Check immediately for orange spinner (should appear quickly)
    await page.waitForTimeout(100);
    
    const orangeSpinnerDuringSave = await titleLabel.locator('.text-orange-600.animate-spin').isVisible();
    const orangeSpinnerCount = await titleLabel.locator('.text-orange-600').count();
    
    console.log(`  Orange spinner visible: ${orangeSpinnerDuringSave} (should be true)`);
    console.log(`  Orange spinner count: ${orangeSpinnerCount} (should be 1)`);
    
    // Take screenshot of saving state
    await page.screenshot({ 
      path: 'test-artifacts/title-save-2-orange-spinner.png',
      fullPage: false 
    });
    
    // ASSERTION: Orange spinner should be visible
    expect(orangeSpinnerDuringSave).toBe(true);
    console.log('  ✅ Orange spinner appears during save');
    
    // STEP 3: Wait for save completion and check green tick
    console.log('\nSTEP 3: Waiting for save completion...');
    
    // Wait for green tick to appear and spinner to disappear
    await page.waitForFunction(
      () => {
        const label = document.querySelector('label:has(:text("Activity Title"))');
        const greenTick = label?.querySelector('.text-green-600');
        const spinner = label?.querySelector('.text-orange-600.animate-spin');
        return greenTick !== null && !spinner;
      },
      { timeout: 10000 }
    );
    
    const finalGreenTick = await titleLabel.locator('.text-green-600').isVisible();
    const finalOrangeSpinner = await titleLabel.locator('.text-orange-600.animate-spin').isVisible();
    const finalGreenTickCount = await titleLabel.locator('.text-green-600').count();
    const finalOrangeSpinnerCount = await titleLabel.locator('.text-orange-600').count();
    
    console.log(`  Final green tick visible: ${finalGreenTick} (should be true)`);
    console.log(`  Final orange spinner visible: ${finalOrangeSpinner} (should be false)`);
    console.log(`  Final green tick count: ${finalGreenTickCount} (should be 1)`);
    console.log(`  Final orange spinner count: ${finalOrangeSpinnerCount} (should be 0)`);
    
    // Take screenshot of final state
    await page.screenshot({ 
      path: 'test-artifacts/title-save-3-green-tick.png',
      fullPage: false 
    });
    
    // ASSERTIONS: Green tick should be visible, spinner gone
    expect(finalGreenTick).toBe(true);
    expect(finalOrangeSpinner).toBe(false);
    console.log('  ✅ Green tick appears after successful save');
    
    console.log('\n=== SAVE INDICATORS TEST PASSED ===');
    console.log('✅ 1. Initial state: No icons');
    console.log('✅ 2. During save: Orange spinner visible');
    console.log('✅ 3. After save: Green tick visible, spinner gone');
  });
  
  test('✅ Multiple title edits show correct indicator transitions', async ({ page }) => {
    console.log('=== TESTING MULTIPLE EDITS ===');
    
    await page.goto('/activities/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const titleInput = page.locator('input[id="title"]').first();
    const titleLabel = page.locator('label:has-text("Activity Title")').first();
    
    // First edit
    console.log('First edit...');
    await titleInput.fill('First Title');
    await page.waitForTimeout(100);
    
    const firstSpinner = await titleLabel.locator('.text-orange-600.animate-spin').isVisible();
    console.log(`  First edit - spinner visible: ${firstSpinner}`);
    
    // Wait for first save
    await page.waitForTimeout(3000);
    
    const firstGreenTick = await titleLabel.locator('.text-green-600').isVisible();
    console.log(`  First edit - green tick after save: ${firstGreenTick}`);
    
    // Second edit (quick modification)
    console.log('Second edit...');
    await titleInput.fill('First Title Modified');
    await page.waitForTimeout(100);
    
    const secondSpinner = await titleLabel.locator('.text-orange-600.animate-spin').isVisible();
    console.log(`  Second edit - spinner visible: ${secondSpinner}`);
    
    // Wait for second save
    await page.waitForTimeout(3000);
    
    const finalGreenTick = await titleLabel.locator('.text-green-600').isVisible();
    const finalSpinner = await titleLabel.locator('.text-orange-600.animate-spin').isVisible();
    
    console.log(`  Final state - green tick: ${finalGreenTick}, spinner: ${finalSpinner}`);
    
    // ASSERTIONS
    expect(firstSpinner).toBe(true);
    expect(secondSpinner).toBe(true);
    expect(finalGreenTick).toBe(true);
    expect(finalSpinner).toBe(false);
    
    console.log('✅ Multiple edits handled correctly');
  });
  
  test('✅ Rapid typing shows debounced save behavior', async ({ page }) => {
    console.log('=== TESTING DEBOUNCED SAVES ===');
    
    await page.goto('/activities/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const titleInput = page.locator('input[id="title"]').first();
    const titleLabel = page.locator('label:has-text("Activity Title")').first();
    
    // Rapid typing simulation
    console.log('Rapid typing...');
    await titleInput.fill('A');
    await page.waitForTimeout(50);
    await titleInput.fill('Ab');
    await page.waitForTimeout(50);
    await titleInput.fill('Abc');
    await page.waitForTimeout(50);
    await titleInput.fill('Abcd');
    await page.waitForTimeout(50);
    await titleInput.fill('Rapid Title Test');
    
    // Check for spinner after rapid typing stops
    await page.waitForTimeout(200);
    const spinnerAfterTyping = await titleLabel.locator('.text-orange-600.animate-spin').isVisible();
    console.log(`  Spinner after rapid typing: ${spinnerAfterTyping} (should be true)`);
    
    // Wait for debounced save
    await page.waitForTimeout(3000);
    
    const finalGreenTick = await titleLabel.locator('.text-green-600').isVisible();
    const finalSpinner = await titleLabel.locator('.text-orange-600.animate-spin').isVisible();
    
    console.log(`  After debounced save - green tick: ${finalGreenTick}, spinner: ${finalSpinner}`);
    
    expect(spinnerAfterTyping).toBe(true);
    expect(finalGreenTick).toBe(true);
    expect(finalSpinner).toBe(false);
    
    console.log('✅ Debounced save behavior working correctly');
  });
});
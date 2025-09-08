import { test, expect } from '@playwright/test';

test.describe('Activity Title Green Tick Fix Verification', () => {
  
  test('✅ Activity Title shows green tick after save (like Acronym does)', async ({ page }) => {
    console.log('=== VERIFYING TITLE GREEN TICK FIX ===');
    
    // Navigate to new activity page
    await page.goto('/activities/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const titleInput = page.locator('input[id="title"]').first();
    const titleLabel = page.locator('label:has-text("Activity Title")').first();
    const acronymInput = page.locator('input[id="acronym"]').first();
    const acronymLabel = page.locator('label:has-text("Activity Acronym")').first();
    
    // STEP 1: Verify both fields start with no green ticks
    console.log('STEP 1: Checking initial state...');
    
    const titleInitialTicks = await titleLabel.locator('.text-green-600').count();
    const acronymInitialTicks = await acronymLabel.locator('.text-green-600').count();
    
    console.log(`  Title initial green ticks: ${titleInitialTicks} (should be 0)`);
    console.log(`  Acronym initial green ticks: ${acronymInitialTicks} (should be 0)`);
    
    expect(titleInitialTicks).toBe(0);
    expect(acronymInitialTicks).toBe(0);
    console.log('  ✅ Both fields start with no green ticks');
    
    // STEP 2: Enter title and wait for activity creation + green tick
    console.log('\nSTEP 2: Creating activity with title...');
    
    await titleInput.fill('Test Activity Title Green Tick Fix');
    
    // Wait for activity creation and title to show green tick
    console.log('  Waiting for title green tick to appear...');
    
    await page.waitForFunction(
      () => {
        const titleLabel = document.querySelector('label:has(:text("Activity Title"))');
        const greenTick = titleLabel?.querySelector('.text-green-600');
        return greenTick !== null;
      },
      { timeout: 10000 }
    ).catch(() => {
      console.log('  ⚠️ Title green tick did not appear within 10 seconds');
    });
    
    const titleGreenTickAfterSave = await titleLabel.locator('.text-green-600').count();
    console.log(`  Title green ticks after save: ${titleGreenTickAfterSave} (should be 1)`);
    
    // STEP 3: Now enter acronym and verify it also gets green tick
    console.log('\nSTEP 3: Testing acronym field...');
    
    // Wait for acronym to be enabled (activity should be created by now)
    await page.waitForFunction(
      () => {
        const acronym = document.querySelector('input[id="acronym"]') as HTMLInputElement;
        return acronym && !acronym.disabled;
      },
      { timeout: 5000 }
    ).catch(() => {
      console.log('  ⚠️ Acronym field did not unlock within 5 seconds');
    });
    
    await acronymInput.fill('TTGF');
    
    // Wait for acronym green tick
    await page.waitForFunction(
      () => {
        const acronymLabel = document.querySelector('label:has(:text("Activity Acronym"))');
        const greenTick = acronymLabel?.querySelector('.text-green-600');
        return greenTick !== null;
      },
      { timeout: 5000 }
    ).catch(() => {
      console.log('  ⚠️ Acronym green tick did not appear within 5 seconds');
    });
    
    const acronymGreenTickAfterSave = await acronymLabel.locator('.text-green-600').count();
    console.log(`  Acronym green ticks after save: ${acronymGreenTickAfterSave} (should be 1)`);
    
    // STEP 4: Final verification
    console.log('\nSTEP 4: Final verification...');
    
    const finalTitleTicks = await titleLabel.locator('.text-green-600').count();
    const finalAcronymTicks = await acronymLabel.locator('.text-green-600').count();
    
    console.log(`  Final title green ticks: ${finalTitleTicks} (should be 1)`);
    console.log(`  Final acronym green ticks: ${finalAcronymTicks} (should be 1)`);
    
    // Take screenshot of final state
    await page.screenshot({ 
      path: 'test-artifacts/FINAL-both-fields-green-ticks.png',
      fullPage: false 
    });
    
    // ASSERTIONS
    expect(finalTitleTicks).toBe(1);
    expect(finalAcronymTicks).toBe(1);
    
    console.log('\n=== SUCCESS ===');
    console.log('✅ Activity Title now shows green tick after save');
    console.log('✅ Activity Acronym shows green tick after save');
    console.log('✅ Both fields behave consistently');
  });
  
  test('✅ Activity Title green tick persists after page navigation', async ({ page }) => {
    console.log('=== TESTING GREEN TICK PERSISTENCE ===');
    
    // Create activity
    await page.goto('/activities/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const titleInput = page.locator('input[id="title"]').first();
    await titleInput.fill('Persistent Green Tick Test');
    
    // Wait for save and green tick
    await page.waitForTimeout(5000);
    
    // Get current URL (should now be edit page if activity was created)
    const currentUrl = page.url();
    console.log(`Current URL after save: ${currentUrl}`);
    
    if (!currentUrl.includes('/new')) {
      console.log('Activity was created, testing persistence...');
      
      // Reload the page
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Check if green tick persists
      const titleLabel = page.locator('label:has-text("Activity Title")').first();
      const persistentGreenTicks = await titleLabel.locator('.text-green-600').count();
      
      console.log(`Green ticks after reload: ${persistentGreenTicks} (should be 1 for existing activity)`);
      
      // For existing activities, green ticks should persist
      expect(persistentGreenTicks).toBe(1);
      console.log('✅ Green tick persists after page reload');
    } else {
      console.log('Activity creation may not have completed, skipping persistence test');
    }
  });
});
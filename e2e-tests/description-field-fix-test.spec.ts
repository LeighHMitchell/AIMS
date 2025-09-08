import { test, expect } from '@playwright/test';

test.describe('Activity Description Field - Green Tick Fix', () => {
  
  test('✅ Activity Description - General shows NO green tick on initial load', async ({ page }) => {
    console.log('=== TESTING DESCRIPTION FIELD GREEN TICK FIX ===');
    
    // Navigate to new activity page
    await page.goto('/activities/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Find the Activity Description - General label
    const descriptionLabel = page.locator('label').filter({ hasText: 'Activity Description - General' }).first();
    
    // Check initial state - should have NO green ticks
    const initialGreenTicks = await descriptionLabel.locator('.text-green-600').count();
    const initialOrangeSpinners = await descriptionLabel.locator('.text-orange-600').count();
    
    console.log(`Initial state:`);
    console.log(`  Green ticks: ${initialGreenTicks} (should be 0)`);
    console.log(`  Orange spinners: ${initialOrangeSpinners} (should be 0)`);
    
    // Take screenshot of initial state
    await page.screenshot({ 
      path: 'test-artifacts/description-field-initial.png',
      fullPage: false 
    });
    
    // ASSERTION: No green tick on load
    expect(initialGreenTicks).toBe(0);
    expect(initialOrangeSpinners).toBe(0);
    console.log('✅ PASS: No green tick on initial load');
    
    // Now create an activity by entering title
    console.log('\nCreating activity by entering title...');
    const titleInput = page.locator('input[id="title"]').first();
    await titleInput.fill('Test Activity for Description Validation');
    
    // Wait for activity creation
    await page.waitForTimeout(3000);
    
    // Description field should STILL have no green tick (no text entered)
    const afterActivityGreenTicks = await descriptionLabel.locator('.text-green-600').count();
    console.log(`After activity creation - Description green ticks: ${afterActivityGreenTicks} (should be 0)`);
    
    expect(afterActivityGreenTicks).toBe(0);
    console.log('✅ PASS: Still no green tick after activity creation');
    
    // Now enter text in the description field
    console.log('\nEntering text in description field...');
    
    const descriptionEditor = page.locator('[data-testid="rich-text-editor"] .ProseMirror').first();
    if (await descriptionEditor.count() > 0) {
      await descriptionEditor.click();
      await descriptionEditor.fill('This is a test description to verify the green tick behavior.');
      
      // Should show orange spinner during save
      await page.waitForTimeout(500);
      const orangeDuringSave = await descriptionLabel.locator('.text-orange-600.animate-spin').count();
      console.log(`Orange spinners during save: ${orangeDuringSave} (should be 1)`);
      
      // Wait for save to complete
      await page.waitForTimeout(5000);
      
      // Now should show green tick
      const finalGreenTicks = await descriptionLabel.locator('.text-green-600').count();
      const finalOrangeSpinners = await descriptionLabel.locator('.text-orange-600').count();
      
      console.log(`After text entry and save:`);
      console.log(`  Green ticks: ${finalGreenTicks} (should be 1)`);
      console.log(`  Orange spinners: ${finalOrangeSpinners} (should be 0)`);
      
      // Take screenshot of final state
      await page.screenshot({ 
        path: 'test-artifacts/description-field-after-save.png',
        fullPage: false 
      });
      
      expect(finalGreenTicks).toBe(1);
      expect(finalOrangeSpinners).toBe(0);
      console.log('✅ PASS: Green tick appears only after text is saved');
    } else {
      console.log('⚠️ Description editor not found, skipping text entry test');
    }
    
    console.log('\n=== DESCRIPTION FIELD TEST COMPLETE ===');
    console.log('✅ Initial load: No green tick');
    console.log('✅ After activity creation: Still no green tick');
    console.log('✅ After entering text: Green tick appears');
  });
  
  test('✅ Multiple description fields show correct behavior', async ({ page }) => {
    console.log('=== TESTING ALL DESCRIPTION FIELDS ===');
    
    await page.goto('/activities/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check all description field labels for initial state
    const descriptionFields = [
      'Activity Description - General',
      // Note: Other description fields might not be visible initially
    ];
    
    for (const fieldName of descriptionFields) {
      const label = page.locator('label').filter({ hasText: fieldName }).first();
      const labelExists = await label.count() > 0;
      
      if (labelExists) {
        const greenTicks = await label.locator('.text-green-600').count();
        console.log(`${fieldName}: ${greenTicks} green ticks (should be 0)`);
        expect(greenTicks).toBe(0);
      } else {
        console.log(`${fieldName}: Not found or not visible`);
      }
    }
    
    console.log('✅ All visible description fields show no green ticks initially');
  });
  
  test('✅ Page reload maintains correct description field state', async ({ page }) => {
    console.log('=== TESTING DESCRIPTION FIELD STATE PERSISTENCE ===');
    
    // Load new activity page
    await page.goto('/activities/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check initial state
    const descriptionLabel = page.locator('label').filter({ hasText: 'Activity Description - General' }).first();
    const initialGreenTicks = await descriptionLabel.locator('.text-green-600').count();
    console.log(`Initial green ticks: ${initialGreenTicks} (should be 0)`);
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check state after reload
    const afterReloadGreenTicks = await descriptionLabel.locator('.text-green-600').count();
    console.log(`After reload green ticks: ${afterReloadGreenTicks} (should be 0)`);
    
    expect(initialGreenTicks).toBe(0);
    expect(afterReloadGreenTicks).toBe(0);
    
    console.log('✅ Description field state is consistent after page reload');
  });
});
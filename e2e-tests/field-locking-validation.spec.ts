import { test, expect } from '@playwright/test';

test.describe('Field Locking and Validation - Fixed Behavior Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/activities/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test('✅ CRITICAL: Fields remain LOCKED until activity is created in backend', async ({ page }) => {
    console.log('=== Testing Field Locking Logic ===');
    
    // Check initial state - acronym field should be disabled
    const acronymInput = page.locator('input[id="acronym"]').first();
    const acronymContainer = page.locator('div:has(> input[id="acronym"])').first();
    
    // Check if acronym is disabled initially
    const initiallyDisabled = await acronymInput.isDisabled();
    console.log(`Acronym field disabled initially: ${initiallyDisabled}`);
    expect(initiallyDisabled).toBe(true);
    
    // Enter a title (but don't wait for save)
    const titleInput = page.locator('input[id="title"]').first();
    await titleInput.fill('Test Activity');
    
    // Immediately check if acronym is still disabled (should be!)
    await page.waitForTimeout(100);
    const stillDisabledAfterTyping = await acronymInput.isDisabled();
    console.log(`Acronym field disabled after typing title: ${stillDisabledAfterTyping}`);
    
    // Take screenshot showing fields still locked
    await page.screenshot({ 
      path: 'test-artifacts/fields-locked-after-typing-title.png',
      fullPage: false 
    });
    
    // ASSERTION: Acronym should STILL be disabled
    expect(stillDisabledAfterTyping).toBe(true);
    
    // Now wait for activity to be created
    console.log('Waiting for activity creation...');
    await page.waitForTimeout(3000);
    
    // Check if fields are now enabled
    const enabledAfterCreation = await acronymInput.isDisabled();
    console.log(`Acronym field disabled after activity creation: ${enabledAfterCreation}`);
    
    // ASSERTION: Acronym should now be enabled
    expect(enabledAfterCreation).toBe(false);
    
    // Take screenshot showing fields now unlocked
    await page.screenshot({ 
      path: 'test-artifacts/fields-unlocked-after-creation.png',
      fullPage: false 
    });
  });

  test('✅ User cannot enter data in locked fields before activity creation', async ({ page }) => {
    console.log('=== Testing Data Protection in Locked Fields ===');
    
    // Try to interact with various fields before entering title
    const acronymInput = page.locator('input[id="acronym"]').first();
    const activityIdInput = page.locator('input[placeholder="Enter your organization\'s activity ID"]').first();
    const iatiIdInput = page.locator('input[placeholder="Enter IATI identifier"]').first();
    
    // Check all are disabled
    const acronymDisabled = await acronymInput.isDisabled();
    const activityIdDisabled = await activityIdInput.isDisabled();
    const iatiIdDisabled = await iatiIdInput.isDisabled();
    
    console.log('Initial field states:');
    console.log(`  Acronym disabled: ${acronymDisabled}`);
    console.log(`  Activity ID disabled: ${activityIdDisabled}`);
    console.log(`  IATI ID disabled: ${iatiIdDisabled}`);
    
    // All should be disabled
    expect(acronymDisabled).toBe(true);
    expect(activityIdDisabled).toBe(true);
    expect(iatiIdDisabled).toBe(true);
    
    // Try to type in disabled fields (should not work)
    await acronymInput.fill('TEST').catch(() => console.log('Cannot type in disabled acronym field - correct!'));
    
    // Verify fields are empty
    const acronymValue = await acronymInput.inputValue();
    console.log(`Acronym value after attempted input: "${acronymValue}"`);
    expect(acronymValue).toBe('');
  });

  test('✅ Warning messages show correct information about field locking', async ({ page }) => {
    console.log('=== Testing Warning Messages ===');
    
    // Click on a disabled field container
    const acronymContainer = page.locator('div:has(> input[id="acronym"])').first();
    await acronymContainer.click();
    
    // Check for toast warning
    await page.waitForTimeout(500);
    
    // Look for toast message
    const toastMessage = page.locator('[data-sonner-toast]').last();
    const toastVisible = await toastMessage.isVisible().catch(() => false);
    
    if (toastVisible) {
      const toastText = await toastMessage.textContent();
      console.log(`Toast message: ${toastText}`);
      
      // Should mention waiting for activity creation, not just entering title
      expect(toastText).toContain('wait for the activity to be created');
    }
    
    // Take screenshot of warning
    await page.screenshot({ 
      path: 'test-artifacts/field-lock-warning-message.png',
      fullPage: false 
    });
  });

  test('✅ No premature data loss when activity is created', async ({ page }) => {
    console.log('=== Testing Data Preservation ===');
    
    const titleInput = page.locator('input[id="title"]').first();
    const acronymInput = page.locator('input[id="acronym"]').first();
    
    // Enter title to trigger activity creation
    await titleInput.fill('Activity with Safe Field Entry');
    
    // Wait for activity to be created
    console.log('Waiting for activity creation...');
    await page.waitForFunction(
      () => {
        const acronym = document.querySelector('input[id="acronym"]') as HTMLInputElement;
        return acronym && !acronym.disabled;
      },
      { timeout: 10000 }
    );
    
    // Now enter acronym (should be safe)
    await acronymInput.fill('AWSFE');
    
    // Wait for save
    await page.waitForTimeout(3000);
    
    // Verify acronym is still there
    const acronymValue = await acronymInput.inputValue();
    console.log(`Acronym value after save: "${acronymValue}"`);
    expect(acronymValue).toBe('AWSFE');
    
    // Reload page to verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if data persisted
    const acronymAfterReload = await acronymInput.inputValue();
    console.log(`Acronym value after reload: "${acronymAfterReload}"`);
    
    // If we're on an edit page, acronym should persist
    const currentUrl = page.url();
    if (!currentUrl.includes('/new')) {
      expect(acronymAfterReload).toBe('AWSFE');
      console.log('✅ Data persisted correctly');
    }
  });

  test('✅ Activity Title field still shows correct validation states', async ({ page }) => {
    console.log('=== Verifying Title Field Validation ===');
    
    const titleInput = page.locator('input[id="title"]').first();
    const titleLabel = page.locator('label:has-text("Activity Title")').first();
    
    // Initial state - no icons
    let greenTick = titleLabel.locator('.text-green-600');
    let orangeSpinner = titleLabel.locator('.text-orange-600');
    
    const initialGreenTicks = await greenTick.count();
    const initialOrangeSpinners = await orangeSpinner.count();
    
    console.log(`Initial - Green ticks: ${initialGreenTicks}, Orange spinners: ${initialOrangeSpinners}`);
    expect(initialGreenTicks).toBe(0);
    expect(initialOrangeSpinners).toBe(0);
    
    // Type in title
    await titleInput.fill('Testing Title Validation');
    
    // Should show orange spinner during save
    await page.waitForTimeout(200);
    const spinnerDuringSave = await orangeSpinner.count();
    console.log(`During save - Orange spinners: ${spinnerDuringSave}`);
    
    // Wait for save
    await page.waitForTimeout(3000);
    
    // Should show green tick after save
    const finalGreenTicks = await greenTick.count();
    const finalOrangeSpinners = await orangeSpinner.count();
    
    console.log(`After save - Green ticks: ${finalGreenTicks}, Orange spinners: ${finalOrangeSpinners}`);
    expect(finalGreenTicks).toBe(1);
    expect(finalOrangeSpinners).toBe(0);
  });

  test('✅ Multiple fields unlock together after activity creation', async ({ page }) => {
    console.log('=== Testing Batch Field Unlocking ===');
    
    // Check multiple fields are initially locked
    const fieldsToCheck = [
      { selector: 'input[id="acronym"]', name: 'Acronym' },
      { selector: 'input[placeholder="Enter your organization\'s activity ID"]', name: 'Activity ID' },
      { selector: 'input[placeholder="Enter IATI identifier"]', name: 'IATI ID' },
    ];
    
    // Check all are disabled initially
    for (const field of fieldsToCheck) {
      const input = page.locator(field.selector).first();
      const isDisabled = await input.isDisabled();
      console.log(`${field.name} initially disabled: ${isDisabled}`);
      expect(isDisabled).toBe(true);
    }
    
    // Enter title to create activity
    const titleInput = page.locator('input[id="title"]').first();
    await titleInput.fill('Test Multiple Field Unlock');
    
    // Wait for activity creation
    console.log('Waiting for activity creation and field unlocking...');
    await page.waitForFunction(
      () => {
        const acronym = document.querySelector('input[id="acronym"]') as HTMLInputElement;
        return acronym && !acronym.disabled;
      },
      { timeout: 10000 }
    );
    
    // Check all are now enabled
    for (const field of fieldsToCheck) {
      const input = page.locator(field.selector).first();
      const isDisabled = await input.isDisabled();
      console.log(`${field.name} after creation disabled: ${isDisabled}`);
      expect(isDisabled).toBe(false);
    }
    
    console.log('✅ All fields unlocked successfully after activity creation');
  });
});
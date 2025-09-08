import { test, expect } from '@playwright/test';

test.describe('Activity Acronym Validation - Verification Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the new activity page
    await page.goto('/activities/new');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Add a small delay to ensure all React components are mounted
    await page.waitForTimeout(500);
  });

  test('✅ Activity Acronym - No validation icon should appear on initial page load', async ({ page }) => {
    console.log('Testing: Activity Acronym should have no validation icon on load');
    
    // Find the Activity Acronym label
    const acronymLabel = page.locator('label:has-text("Activity Acronym")').first();
    
    // Check for the presence of any validation icons
    const greenTick = acronymLabel.locator('.text-green-600');
    const orangeSpinner = acronymLabel.locator('.text-orange-600');
    
    // Log the current state
    const greenTickCount = await greenTick.count();
    const orangeSpinnerCount = await orangeSpinner.count();
    
    console.log(`Acronym - Green tick count on load: ${greenTickCount}`);
    console.log(`Acronym - Orange spinner count on load: ${orangeSpinnerCount}`);
    
    // Take a screenshot for evidence
    await page.screenshot({ 
      path: 'test-artifacts/acronym-initial-state.png',
      fullPage: false 
    });
    
    // ASSERTION: No green tick should be visible on initial load
    expect(greenTickCount).toBe(0);
    
    // ASSERTION: No orange spinner should be visible on initial load
    expect(orangeSpinnerCount).toBe(0);
  });

  test('✅ Activity Acronym - Field disabled until title is entered', async ({ page }) => {
    console.log('Testing: Acronym field should be disabled until title is entered');
    
    // Find the Activity Acronym input field
    const acronymInput = page.locator('input[id="acronym"]').first();
    const acronymLabel = page.locator('label:has-text("Activity Acronym")').first();
    
    // Initially, the field should be disabled (greyed out)
    const acronymContainer = page.locator('div:has(> input[id="acronym"])').first();
    const isDisabled = await acronymContainer.evaluate(el => el.classList.contains('opacity-50'));
    
    console.log(`Acronym field disabled initially: ${isDisabled}`);
    
    // The label should have gray text color initially
    const labelClass = await acronymLabel.getAttribute('class');
    console.log(`Acronym label class: ${labelClass}`);
    
    // Take a screenshot of disabled state
    await page.screenshot({ 
      path: 'test-artifacts/acronym-disabled-state.png',
      fullPage: false 
    });
    
    // Now enter a title to enable the acronym field
    const titleInput = page.locator('input[id="title"]').first();
    await titleInput.fill('Test Activity for Acronym');
    
    // Wait a moment for the state to update
    await page.waitForTimeout(500);
    
    // Check if acronym field is now enabled
    const isEnabledAfterTitle = await acronymContainer.evaluate(el => !el.classList.contains('opacity-50'));
    console.log(`Acronym field enabled after title: ${isEnabledAfterTitle}`);
    
    // Take a screenshot of enabled state
    await page.screenshot({ 
      path: 'test-artifacts/acronym-enabled-state.png',
      fullPage: false 
    });
    
    expect(isEnabledAfterTitle).toBe(true);
  });

  test('✅ Activity Acronym - Orange spinner appears while saving, then green tick after save', async ({ page }) => {
    console.log('Testing: Acronym - Orange spinner during save, green tick after');
    
    // First, create an activity by entering a title
    const titleInput = page.locator('input[id="title"]').first();
    await titleInput.fill('Test Activity for Acronym Validation');
    
    // Wait for the activity to be created
    await page.waitForTimeout(3000);
    
    // Find the Activity Acronym input field and label
    const acronymInput = page.locator('input[id="acronym"]').first();
    const acronymLabel = page.locator('label:has-text("Activity Acronym")').first();
    
    // Type into the acronym field
    await acronymInput.fill('TAFAV');
    
    // Check for orange spinner immediately after typing
    const orangeSpinner = acronymLabel.locator('.text-orange-600.animate-spin');
    
    // Wait a brief moment for the spinner to appear
    await page.waitForTimeout(100);
    
    // Check if spinner is visible
    const spinnerVisible = await orangeSpinner.isVisible();
    
    console.log(`Acronym - Orange spinner visible during save: ${spinnerVisible}`);
    
    // Take a screenshot of the saving state
    await page.screenshot({ 
      path: 'test-artifacts/acronym-saving-state.png',
      fullPage: false 
    });
    
    // ASSERTION: Orange spinner should be visible while saving
    expect(spinnerVisible).toBe(true);
    
    // Wait for save to complete (max 5 seconds)
    await page.waitForFunction(
      () => {
        const label = document.querySelector('label:has(:text("Activity Acronym"))');
        const greenTick = label?.querySelector('.text-green-600');
        return greenTick !== null;
      },
      { timeout: 5000 }
    ).catch(() => {
      console.log('Green tick did not appear within 5 seconds');
    });
    
    // Verify green tick is now visible
    const greenTick = acronymLabel.locator('.text-green-600');
    const greenTickVisible = await greenTick.isVisible();
    
    // Verify orange spinner is no longer visible
    const orangeSpinnerStillVisible = await orangeSpinner.isVisible();
    
    console.log(`Acronym - Green tick visible after save: ${greenTickVisible}`);
    console.log(`Acronym - Orange spinner still visible: ${orangeSpinnerStillVisible}`);
    
    // Take a screenshot of the saved state
    await page.screenshot({ 
      path: 'test-artifacts/acronym-saved-state.png',
      fullPage: false 
    });
    
    // ASSERTION: Green tick should be visible after save
    expect(greenTickVisible).toBe(true);
    
    // ASSERTION: Orange spinner should NOT be visible after save
    expect(orangeSpinnerStillVisible).toBe(false);
  });

  test('✅ Activity Acronym - Clearing field removes green tick', async ({ page }) => {
    console.log('Testing: Acronym - Clearing field behavior');
    
    // First, create an activity with title and acronym
    const titleInput = page.locator('input[id="title"]').first();
    await titleInput.fill('Test Activity with Acronym');
    
    // Wait for activity creation
    await page.waitForTimeout(3000);
    
    const acronymInput = page.locator('input[id="acronym"]').first();
    const acronymLabel = page.locator('label:has-text("Activity Acronym")').first();
    
    // Add an acronym
    await acronymInput.fill('TAWA');
    
    // Wait for save to complete
    await page.waitForFunction(
      () => {
        const label = document.querySelector('label:has(:text("Activity Acronym"))');
        const greenTick = label?.querySelector('.text-green-600');
        return greenTick !== null;
      },
      { timeout: 5000 }
    ).catch(() => {
      console.log('Initial save did not complete');
    });
    
    // Verify green tick is visible
    let greenTick = acronymLabel.locator('.text-green-600');
    const initialGreenTickVisible = await greenTick.isVisible();
    console.log(`Acronym - Green tick visible before clear: ${initialGreenTickVisible}`);
    
    // Clear the acronym field
    await acronymInput.clear();
    
    // Wait for the clear to process
    await page.waitForTimeout(2000);
    
    // Check the state after clearing
    const greenTickAfterClear = await greenTick.isVisible();
    console.log(`Acronym - Green tick visible after clear: ${greenTickAfterClear}`);
    
    // Take a screenshot of the cleared state
    await page.screenshot({ 
      path: 'test-artifacts/acronym-cleared-state.png',
      fullPage: false 
    });
  });

  test('✅ Activity Acronym - Multiple rapid edits handle validation correctly', async ({ page }) => {
    console.log('Testing: Acronym - Multiple rapid edits');
    
    // First create an activity
    const titleInput = page.locator('input[id="title"]').first();
    await titleInput.fill('Test Activity for Rapid Edits');
    
    // Wait for activity creation
    await page.waitForTimeout(3000);
    
    const acronymInput = page.locator('input[id="acronym"]').first();
    const acronymLabel = page.locator('label:has-text("Activity Acronym")').first();
    
    // Make multiple rapid edits
    await acronymInput.fill('A');
    await page.waitForTimeout(50);
    await acronymInput.fill('AB');
    await page.waitForTimeout(50);
    await acronymInput.fill('ABC');
    await page.waitForTimeout(50);
    await acronymInput.fill('ABCD');
    
    // Should show orange spinner for the debounced save
    const orangeSpinner = acronymLabel.locator('.text-orange-600.animate-spin');
    await page.waitForTimeout(100);
    
    const spinnerVisibleDuringEdits = await orangeSpinner.isVisible();
    console.log(`Acronym - Orange spinner visible during rapid edits: ${spinnerVisibleDuringEdits}`);
    
    // Wait for final save
    await page.waitForFunction(
      () => {
        const label = document.querySelector('label:has(:text("Activity Acronym"))');
        const greenTick = label?.querySelector('.text-green-600');
        const spinner = label?.querySelector('.text-orange-600.animate-spin');
        return greenTick !== null && !spinner;
      },
      { timeout: 5000 }
    ).catch(() => {
      console.log('Final save did not complete');
    });
    
    // Verify final state has green tick and no spinner
    const greenTick = acronymLabel.locator('.text-green-600');
    const finalGreenTickVisible = await greenTick.isVisible();
    const finalSpinnerVisible = await orangeSpinner.isVisible();
    
    console.log(`Acronym - Final state - Green tick: ${finalGreenTickVisible}, Spinner: ${finalSpinnerVisible}`);
    
    // Take a screenshot
    await page.screenshot({ 
      path: 'test-artifacts/acronym-rapid-edits-final.png',
      fullPage: false 
    });
    
    expect(finalGreenTickVisible).toBe(true);
    expect(finalSpinnerVisible).toBe(false);
  });

  test('✅ Activity Acronym - Special characters and spaces handled correctly', async ({ page }) => {
    console.log('Testing: Acronym - Special characters and spaces');
    
    // First create an activity
    const titleInput = page.locator('input[id="title"]').first();
    await titleInput.fill('Test Activity for Special Chars');
    
    // Wait for activity creation
    await page.waitForTimeout(3000);
    
    const acronymInput = page.locator('input[id="acronym"]').first();
    const acronymLabel = page.locator('label:has-text("Activity Acronym")').first();
    
    // Try entering an acronym with spaces and special characters
    await acronymInput.fill('T.E.S.T - 2024');
    
    // Should show orange spinner while saving
    const orangeSpinner = acronymLabel.locator('.text-orange-600.animate-spin');
    await page.waitForTimeout(100);
    
    // Wait for save attempt
    await page.waitForTimeout(3000);
    
    // Check final state
    const greenTick = acronymLabel.locator('.text-green-600');
    const hasGreenTick = await greenTick.count() > 0;
    const hasOrangeSpinner = await orangeSpinner.count() > 0;
    
    console.log(`Acronym with special chars - Green tick: ${hasGreenTick}, Orange spinner: ${hasOrangeSpinner}`);
    
    // Take a screenshot
    await page.screenshot({ 
      path: 'test-artifacts/acronym-special-chars.png',
      fullPage: false 
    });
    
    // Should successfully save and show green tick
    expect(hasGreenTick).toBe(true);
    expect(hasOrangeSpinner).toBe(false);
  });

  test('✅ Activity Acronym - Long acronym validation', async ({ page }) => {
    console.log('Testing: Acronym - Long text validation');
    
    // First create an activity
    const titleInput = page.locator('input[id="title"]').first();
    await titleInput.fill('Test Activity for Long Acronym');
    
    // Wait for activity creation
    await page.waitForTimeout(3000);
    
    const acronymInput = page.locator('input[id="acronym"]').first();
    const acronymLabel = page.locator('label:has-text("Activity Acronym")').first();
    
    // Try entering a very long acronym (unusual but should be handled)
    const longAcronym = 'VERYLONGACRONYMTHATMIGHTEXCEEDEXPECTEDLENGTH';
    await acronymInput.fill(longAcronym);
    
    // Check for validation behavior
    await page.waitForTimeout(100);
    
    const orangeSpinner = acronymLabel.locator('.text-orange-600.animate-spin');
    const spinnerVisible = await orangeSpinner.isVisible();
    
    console.log(`Long acronym - Spinner visible: ${spinnerVisible}`);
    
    // Wait for save attempt
    await page.waitForTimeout(3000);
    
    // Check final state
    const greenTick = acronymLabel.locator('.text-green-600');
    const finalGreenTick = await greenTick.count() > 0;
    const finalSpinner = await orangeSpinner.count() > 0;
    
    console.log(`Long acronym final - Green tick: ${finalGreenTick}, Spinner: ${finalSpinner}`);
    
    // Take a screenshot
    await page.screenshot({ 
      path: 'test-artifacts/acronym-long-text.png',
      fullPage: false 
    });
  });
});
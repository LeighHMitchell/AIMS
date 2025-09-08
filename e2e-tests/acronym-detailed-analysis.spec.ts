import { test, expect } from '@playwright/test';

test.describe('Activity Acronym - Detailed State Analysis', () => {
  test('Analyze Acronym Field State and Behavior', async ({ page }) => {
    console.log('\n🔍 DETAILED ACTIVITY ACRONYM FIELD ANALYSIS');
    console.log('='.repeat(60));

    // Navigate to activity editor
    await page.goto('https://aims-pi.vercel.app/activities/new');
    
    // Check if redirected to login
    if (page.url().includes('/login')) {
      console.log('⚠️ Redirected to login - testing with authentication required');
      
      // Take screenshot of login page
      await page.screenshot({ path: 'test-results/acronym-analysis-login-required.png' });
      
      console.log('\n📋 ANALYSIS RESULT:');
      console.log('- Authentication required to access activity editor');
      console.log('- Cannot test acronym field without valid credentials');
      console.log('- Add TEST_EMAIL and TEST_PASSWORD to .env for full analysis');
      return;
    }

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({ path: 'test-results/acronym-analysis-initial.png' });

    // Find the acronym field
    const acronymField = page.locator('#acronym').first();
    const fieldExists = await acronymField.count() > 0;

    console.log(`\n📍 FIELD DETECTION:`);
    console.log(`- Acronym field exists: ${fieldExists ? '✅ YES' : '❌ NO'}`);

    if (!fieldExists) {
      console.log('❌ Acronym field not found - analysis cannot continue');
      return;
    }

    // Analyze field attributes
    const isVisible = await acronymField.isVisible();
    const isEnabled = await acronymField.isEnabled();
    const isEditable = await acronymField.isEditable();
    const currentValue = await acronymField.inputValue().catch(() => 'ERROR_READING_VALUE');
    const placeholder = await acronymField.getAttribute('placeholder').catch(() => null);
    const className = await acronymField.getAttribute('class').catch(() => null);
    const disabled = await acronymField.getAttribute('disabled').catch(() => null);
    const readonly = await acronymField.getAttribute('readonly').catch(() => null);

    console.log(`\n🔍 FIELD STATE ANALYSIS:`);
    console.log(`- Visible: ${isVisible ? '✅ YES' : '❌ NO'}`);
    console.log(`- Enabled: ${isEnabled ? '✅ YES' : '❌ NO'}`);
    console.log(`- Editable: ${isEditable ? '✅ YES' : '❌ NO'}`);
    console.log(`- Current Value: "${currentValue}"`);
    console.log(`- Placeholder: "${placeholder}"`);
    console.log(`- Disabled Attribute: ${disabled !== null ? '❌ YES (disabled)' : '✅ NO'}`);
    console.log(`- Readonly Attribute: ${readonly !== null ? '⚠️ YES (readonly)' : '✅ NO'}`);

    console.log(`\n🎨 STYLING ANALYSIS:`);
    if (className) {
      const classes = className.split(' ');
      const disabledClasses = classes.filter(c => c.includes('disabled') || c.includes('opacity'));
      console.log(`- Disabled CSS classes: ${disabledClasses.length > 0 ? disabledClasses.join(', ') : 'None'}`);
      console.log(`- Contains "disabled:cursor-not-allowed": ${classes.includes('disabled:cursor-not-allowed') ? '✅ YES' : '❌ NO'}`);
      console.log(`- Contains "disabled:opacity-50": ${classes.includes('disabled:opacity-50') ? '✅ YES' : '❌ NO'}`);
    }

    // Try to determine WHY the field might be disabled
    console.log(`\n🕵️ POTENTIAL CAUSES FOR DISABLED STATE:`);
    
    // Check if there are any loading indicators
    const loadingIndicators = await page.locator('.animate-spin, [data-loading="true"], .loading').count();
    console.log(`- Loading indicators present: ${loadingIndicators > 0 ? '⚠️ YES - may cause temporary disable' : '✅ NO'}`);
    
    // Check for error messages
    const errorMessages = await page.locator('.error, .text-red-500, .text-red-600, [role="alert"]').count();
    console.log(`- Error messages present: ${errorMessages > 0 ? '⚠️ YES - may disable field' : '✅ NO'}`);
    
    // Check form validation state
    const formErrors = await page.locator('input:invalid, .invalid').count();
    console.log(`- Form validation errors: ${formErrors > 0 ? '⚠️ YES - may disable dependent fields' : '✅ NO'}`);

    // Check if activity is in certain state that would disable editing
    const statusSelectors = ['select[name="status"]', 'select[name="activity_status"]', '#status', '#activity_status'];
    let activityStatus = null;
    for (const selector of statusSelectors) {
      const statusField = page.locator(selector).first();
      if (await statusField.count() > 0) {
        activityStatus = await statusField.inputValue().catch(() => null);
        if (activityStatus) break;
      }
    }
    console.log(`- Activity Status: ${activityStatus || 'Not found/readable'}`);

    // Test field interaction attempts
    console.log(`\n🧪 INTERACTION TESTING:`);
    
    if (isEnabled && isEditable) {
      console.log(`- Field appears interactive, testing...`);
      
      try {
        // Try to focus the field
        await acronymField.focus({ timeout: 5000 });
        console.log(`- Focus: ✅ SUCCESS`);
        
        // Try to type a test value
        await acronymField.fill('TEST', { timeout: 5000 });
        const newValue = await acronymField.inputValue();
        console.log(`- Type test: ${newValue === 'TEST' ? '✅ SUCCESS' : '❌ FAILED'} (value: "${newValue}")`);
        
        // Check for save indicators after typing
        await acronymField.blur();
        await page.waitForTimeout(1000);
        
        const spinnerVisible = await page.locator('.animate-spin, [data-saving="true"]').first().isVisible().catch(() => false);
        const tickVisible = await page.locator('.text-green-500, .text-green-600, [data-saved="true"]').first().isVisible().catch(() => false);
        
        console.log(`- Save spinner after input: ${spinnerVisible ? '✅ SEEN' : '❌ NOT SEEN'}`);
        console.log(`- Success tick after input: ${tickVisible ? '✅ SEEN' : '❌ NOT SEEN'}`);
        
        // Take screenshot after successful interaction
        await page.screenshot({ path: 'test-results/acronym-analysis-after-input.png' });
        
      } catch (error) {
        console.log(`- Interaction failed: ❌ ${error}`);
        await page.screenshot({ path: 'test-results/acronym-analysis-interaction-failed.png' });
      }
    } else {
      console.log(`- Field not interactive (enabled: ${isEnabled}, editable: ${isEditable})`);
    }

    // Check surrounding context for clues
    console.log(`\n🌍 CONTEXT ANALYSIS:`);
    
    // Look for labels or help text
    const label = await page.locator('label[for="acronym"], label:has-text("Acronym")').first().textContent().catch(() => null);
    console.log(`- Field label: "${label || 'Not found'}"`);
    
    // Check if there are any conditional logic indicators
    const conditionalElements = await page.locator('[data-show-if], [data-hide-if], [data-conditional]').count();
    console.log(`- Conditional logic elements: ${conditionalElements > 0 ? '⚠️ YES - field may be conditionally disabled' : '✅ NO'}`);

    // Final screenshot
    await page.screenshot({ path: 'test-results/acronym-analysis-final.png' });

    // SUMMARY AND RECOMMENDATIONS
    console.log('\n' + '='.repeat(60));
    console.log('🎯 DIAGNOSIS SUMMARY');
    console.log('='.repeat(60));
    
    if (!isEnabled) {
      console.log('🔴 PRIMARY ISSUE: Activity Acronym field is DISABLED');
      console.log('\n💡 LIKELY CAUSES:');
      console.log('   1. New activity state - field disabled until other required fields filled');
      console.log('   2. User permissions - insufficient rights to edit acronym');
      console.log('   3. Activity status - certain statuses prevent acronym editing');
      console.log('   4. Form validation - other field errors preventing acronym editing');
      console.log('   5. Loading state - field temporarily disabled during data loading');
      
      console.log('\n🔧 TROUBLESHOOTING STEPS:');
      console.log('   1. Fill required fields first (title, description, etc.)');
      console.log('   2. Check user has edit permissions for activities');
      console.log('   3. Verify activity status allows editing');
      console.log('   4. Look for validation errors in other fields');
      console.log('   5. Wait for any loading processes to complete');
      
      console.log('\n🎯 WHY YOU SEE GREEN TICK BUT VALUE DISAPPEARS:');
      console.log('   - Field becomes enabled temporarily');
      console.log('   - You enter value and see success indicator');
      console.log('   - Field gets disabled again due to form state');
      console.log('   - Value is lost because field is not truly editable');
      
    } else {
      console.log('✅ Field appears to be enabled and functional');
      console.log('   The save persistence issue may be due to:');
      console.log('   - Database validation failing silently');
      console.log('   - Frontend-backend synchronization issues');
      console.log('   - Network request failures during save');
    }
    
    console.log('\n📸 Screenshots saved:');
    console.log('   - acronym-analysis-initial.png');
    console.log('   - acronym-analysis-after-input.png (if field was interactive)');
    console.log('   - acronym-analysis-final.png');
    
    console.log('='.repeat(60));
  });
});
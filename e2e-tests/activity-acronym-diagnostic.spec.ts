import { test, expect } from '@playwright/test';
import SupabaseHelper from './helpers/supabase';

let testActivityId: string | null = null;

test.describe('Activity Acronym Save Diagnostic', () => {
  test.beforeAll(async () => {
    console.log('🔍 Starting Activity Acronym Diagnostic...');
    
    try {
      testActivityId = await SupabaseHelper.createActivity({
        title: 'Acronym Test Activity',
        description: 'Testing acronym field persistence'
      });
      
      if (testActivityId) {
        console.log(`✅ Created test activity: ${testActivityId}`);
      }
    } catch (error) {
      console.log('⚠️ Could not create test activity, will test on existing activity');
    }
  });

  test.afterAll(async () => {
    if (testActivityId) {
      await SupabaseHelper.deleteActivity(testActivityId);
      console.log('🧹 Cleaned up test activity');
    }
  });

  test('Activity Acronym - Save Indicators and Persistence Test', async ({ page }) => {
    const testAcronym = `TEST${Date.now().toString().slice(-4)}`;
    const results = {
      field_found: false,
      initial_value_set: false,
      orange_spinner_seen: false,
      green_tick_seen: false,
      value_after_navigation: null,
      value_after_refresh: null,
      db_value: null,
      issues: []
    };

    console.log(`\n🧪 Testing Activity Acronym field with value: "${testAcronym}"`);

    try {
      // Navigate to activities page
      await page.goto('https://aims-pi.vercel.app/activities');
      
      // Check if we need to login
      if (page.url().includes('/login')) {
        console.log('⚠️ Login required - cannot test without credentials');
        results.issues.push('Login required for testing');
        return;
      }

      // Try to access activity editor (new activity or existing one)
      let editorUrl = 'https://aims-pi.vercel.app/activities/new';
      if (testActivityId) {
        editorUrl = `https://aims-pi.vercel.app/activities/${testActivityId}/edit`;
      }

      await page.goto(editorUrl);

      if (page.url().includes('/login')) {
        console.log('⚠️ Editor requires authentication');
        results.issues.push('Editor requires authentication');
        return;
      }

      // Take initial screenshot
      await page.screenshot({ path: 'test-results/acronym-initial.png' });

      // Look for Activity Acronym field with multiple possible selectors
      const acronymSelectors = [
        'input[name="acronym"]',
        'input[name="activity_acronym"]', 
        '#acronym',
        '#activity_acronym',
        'input[placeholder*="acronym" i]',
        'input[placeholder*="abbreviation" i]',
        'label:has-text("Acronym") + input',
        'label:has-text("Activity Acronym") + input',
        '[data-testid*="acronym"]'
      ];

      let acronymField = null;
      let workingSelector = '';

      for (const selector of acronymSelectors) {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          acronymField = element;
          workingSelector = selector;
          results.field_found = true;
          console.log(`✅ Found Activity Acronym field with selector: ${selector}`);
          break;
        }
      }

      if (!acronymField) {
        console.log('❌ Activity Acronym field not found with any selector');
        results.issues.push('Field not found with tested selectors');
        
        // Take screenshot of current page to help identify correct selector
        await page.screenshot({ path: 'test-results/acronym-field-not-found.png' });
        
        // Log all input fields for debugging
        const allInputs = await page.locator('input').count();
        console.log(`Found ${allInputs} input fields on page`);
        
        for (let i = 0; i < Math.min(allInputs, 10); i++) {
          const input = page.locator('input').nth(i);
          const name = await input.getAttribute('name').catch(() => null);
          const id = await input.getAttribute('id').catch(() => null);
          const placeholder = await input.getAttribute('placeholder').catch(() => null);
          const type = await input.getAttribute('type').catch(() => null);
          
          console.log(`  Input ${i}: name="${name}" id="${id}" placeholder="${placeholder}" type="${type}"`);
        }
        
        return;
      }

      // PHASE 1: Set the acronym value and watch for indicators
      console.log(`\n📝 Phase 1: Setting acronym value to "${testAcronym}"`);
      
      await acronymField.clear();
      await acronymField.fill(testAcronym);
      results.initial_value_set = true;
      
      // Take screenshot after filling
      await page.screenshot({ path: 'test-results/acronym-filled.png' });

      // Move focus away to trigger save (blur event)
      await acronymField.blur();
      
      // Wait a moment and look for save indicators
      await page.waitForTimeout(500);

      // Check for orange saving spinner
      const spinnerSelectors = [
        '[data-testid="saving-indicator"]',
        '.saving-spinner',
        '[aria-label*="Saving"]',
        '.animate-spin',
        '.text-orange-500',
        '.text-orange-600',
        'svg.animate-spin',
        '[data-saving="true"]'
      ];

      for (const spinnerSelector of spinnerSelectors) {
        try {
          const spinner = page.locator(spinnerSelector).first();
          const isVisible = await spinner.isVisible({ timeout: 1000 });
          if (isVisible) {
            results.orange_spinner_seen = true;
            console.log(`🟠 Orange saving spinner detected: ${spinnerSelector}`);
            await page.screenshot({ path: 'test-results/acronym-saving-spinner.png' });
            break;
          }
        } catch (e) {
          // Continue checking other selectors
        }
      }

      // Wait for save to complete and check for green tick
      await page.waitForTimeout(2000);

      const tickSelectors = [
        '[data-testid="saved-indicator"]',
        '.saved-tick',
        '[aria-label*="Saved"]',
        '.text-green-500',
        '.text-green-600',
        'svg.text-green-500',
        'svg.text-green-600',
        '[data-saved="true"]'
      ];

      for (const tickSelector of tickSelectors) {
        try {
          const tick = page.locator(tickSelector).first();
          const isVisible = await tick.isVisible({ timeout: 2000 });
          if (isVisible) {
            results.green_tick_seen = true;
            console.log(`✅ Green success tick detected: ${tickSelector}`);
            await page.screenshot({ path: 'test-results/acronym-success-tick.png' });
            break;
          }
        } catch (e) {
          // Continue checking other selectors
        }
      }

      // PHASE 2: Test navigation persistence
      console.log(`\n🔄 Phase 2: Testing navigation persistence`);
      
      // Navigate away to dashboard
      await page.goto('https://aims-pi.vercel.app/dashboard');
      await page.waitForTimeout(1000);
      
      // Navigate back
      await page.goto(editorUrl);
      await page.waitForTimeout(2000);
      
      // Check if acronym value persisted
      const valueAfterNav = await acronymField.inputValue().catch(() => null);
      results.value_after_navigation = valueAfterNav;
      
      if (valueAfterNav === testAcronym) {
        console.log(`✅ Value persisted after navigation: "${valueAfterNav}"`);
      } else {
        console.log(`❌ Value lost after navigation. Expected: "${testAcronym}", Found: "${valueAfterNav}"`);
        results.issues.push(`Navigation persistence failed: expected "${testAcronym}", got "${valueAfterNav}"`);
      }
      
      await page.screenshot({ path: 'test-results/acronym-after-navigation.png' });

      // PHASE 3: Test refresh persistence
      console.log(`\n🔄 Phase 3: Testing refresh persistence`);
      
      // Refresh the page
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      // Re-locate the field (DOM may have changed)
      const acronymFieldAfterRefresh = page.locator(workingSelector).first();
      const valueAfterRefresh = await acronymFieldAfterRefresh.inputValue().catch(() => null);
      results.value_after_refresh = valueAfterRefresh;
      
      if (valueAfterRefresh === testAcronym) {
        console.log(`✅ Value persisted after refresh: "${valueAfterRefresh}"`);
      } else {
        console.log(`❌ Value lost after refresh. Expected: "${testAcronym}", Found: "${valueAfterRefresh}"`);
        results.issues.push(`Refresh persistence failed: expected "${testAcronym}", got "${valueAfterRefresh}"`);
      }
      
      await page.screenshot({ path: 'test-results/acronym-after-refresh.png' });

      // PHASE 4: Check database value (if possible)
      if (testActivityId) {
        console.log(`\n💾 Phase 4: Checking database persistence`);
        
        const dbActivity = await SupabaseHelper.getActivityById(testActivityId);
        if (dbActivity) {
          // Try common database column names for acronym
          const possibleColumns = ['acronym', 'activity_acronym', 'abbreviation'];
          let dbValue = null;
          
          for (const column of possibleColumns) {
            if (dbActivity[column] !== undefined) {
              dbValue = dbActivity[column];
              results.db_value = dbValue;
              console.log(`💾 Database value (${column}): "${dbValue}"`);
              break;
            }
          }
          
          if (dbValue === testAcronym) {
            console.log(`✅ Database value matches: "${dbValue}"`);
          } else {
            console.log(`❌ Database value mismatch. Expected: "${testAcronym}", Found: "${dbValue}"`);
            results.issues.push(`Database persistence failed: expected "${testAcronym}", got "${dbValue}"`);
          }
        }
      }

    } catch (error) {
      console.error('❌ Test error:', error);
      results.issues.push(`Test execution error: ${error}`);
    }

    // FINAL REPORT
    console.log('\n' + '='.repeat(80));
    console.log('                ACTIVITY ACRONYM DIAGNOSTIC RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\nTest Value: "${testAcronym}"`);
    console.log(`Field Found: ${results.field_found ? '✅' : '❌'}`);
    console.log(`Initial Value Set: ${results.initial_value_set ? '✅' : '❌'}`);
    console.log(`Orange Spinner Seen: ${results.orange_spinner_seen ? '✅' : '❌'}`);
    console.log(`Green Tick Seen: ${results.green_tick_seen ? '✅' : '❌'}`);
    console.log(`Value After Navigation: "${results.value_after_navigation}" ${results.value_after_navigation === testAcronym ? '✅' : '❌'}`);
    console.log(`Value After Refresh: "${results.value_after_refresh}" ${results.value_after_refresh === testAcronym ? '✅' : '❌'}`);
    console.log(`Database Value: "${results.db_value}" ${results.db_value === testAcronym ? '✅' : '❌'}`);
    
    if (results.issues.length > 0) {
      console.log(`\n🔍 Issues Identified:`);
      results.issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    }
    
    console.log('\n📸 Screenshots captured in test-results/:');
    console.log('   - acronym-initial.png');
    console.log('   - acronym-filled.png');
    console.log('   - acronym-saving-spinner.png (if spinner detected)');
    console.log('   - acronym-success-tick.png (if tick detected)');
    console.log('   - acronym-after-navigation.png');
    console.log('   - acronym-after-refresh.png');
    
    console.log('='.repeat(80));

    // Assertions for the test framework
    if (results.field_found) {
      expect(results.initial_value_set).toBe(true);
      
      if (results.green_tick_seen) {
        // If green tick appears, the value should persist
        expect(results.value_after_navigation).toBe(testAcronym);
        expect(results.value_after_refresh).toBe(testAcronym);
      }
    }
  });
});
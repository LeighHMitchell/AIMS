import { test, expect } from '@playwright/test';

test.describe('Activity Acronym - Comprehensive Investigation', () => {
  test('Find and analyze Activity Acronym field across different pages', async ({ page }) => {
    console.log('\n🔍 COMPREHENSIVE ACTIVITY ACRONYM INVESTIGATION');
    console.log('='.repeat(70));

    const locations = [
      { url: 'https://aims-pi.vercel.app/activities', name: 'Activities List' },
      { url: 'https://aims-pi.vercel.app/activities/new', name: 'New Activity' },
      // We'll also try to find an existing activity to edit
    ];

    let acronymFieldFound = false;
    let workingLocation = null;
    let fieldDetails = null;

    // Check each location
    for (const location of locations) {
      console.log(`\n📍 Checking: ${location.name} (${location.url})`);
      
      try {
        await page.goto(location.url);
        await page.waitForTimeout(2000);

        // Check if redirected to login
        if (page.url().includes('/login')) {
          console.log('   ⚠️ Redirected to login - authentication required');
          continue;
        }

        // Take screenshot of current page
        await page.screenshot({ path: `test-results/acronym-check-${location.name.replace(/\s+/g, '-').toLowerCase()}.png` });

        // Look for acronym field with multiple selectors
        const selectors = [
          '#acronym',
          'input[name="acronym"]',
          'input[name="activity_acronym"]',
          'input[placeholder*="acronym" i]',
          'input[placeholder*="abbreviation" i]',
          '[data-testid*="acronym"]'
        ];

        for (const selector of selectors) {
          const element = page.locator(selector).first();
          const count = await element.count();
          
          if (count > 0) {
            console.log(`   ✅ Found acronym field: ${selector}`);
            acronymFieldFound = true;
            workingLocation = location;
            
            // Analyze the field
            const isVisible = await element.isVisible().catch(() => false);
            const isEnabled = await element.isEnabled().catch(() => false);
            const isEditable = await element.isEditable().catch(() => false);
            const value = await element.inputValue().catch(() => 'ERROR');
            const placeholder = await element.getAttribute('placeholder').catch(() => null);
            const disabled = await element.getAttribute('disabled').catch(() => null);
            const className = await element.getAttribute('class').catch(() => null);
            
            fieldDetails = {
              selector,
              visible: isVisible,
              enabled: isEnabled,
              editable: isEditable,
              value,
              placeholder,
              disabled: disabled !== null,
              className
            };
            
            console.log(`      - Visible: ${isVisible ? '✅' : '❌'}`);
            console.log(`      - Enabled: ${isEnabled ? '✅' : '❌'}`);
            console.log(`      - Editable: ${isEditable ? '✅' : '❌'}`);
            console.log(`      - Value: "${value}"`);
            console.log(`      - Placeholder: "${placeholder}"`);
            console.log(`      - Disabled attr: ${disabled !== null ? '❌ YES' : '✅ NO'}`);
            
            break;
          }
        }

        if (!acronymFieldFound) {
          console.log(`   ❌ No acronym field found`);
          
          // List all input fields for debugging
          const allInputs = await page.locator('input').count();
          console.log(`   📝 Found ${allInputs} input fields:`);
          
          for (let i = 0; i < Math.min(allInputs, 10); i++) {
            const input = page.locator('input').nth(i);
            const name = await input.getAttribute('name').catch(() => '');
            const id = await input.getAttribute('id').catch(() => '');
            const placeholder = await input.getAttribute('placeholder').catch(() => '');
            const type = await input.getAttribute('type').catch(() => '');
            
            if (name || id || placeholder) {
              console.log(`      ${i+1}. name="${name}" id="${id}" placeholder="${placeholder}" type="${type}"`);
            }
          }
        }
      } catch (error) {
        console.log(`   ❌ Error checking ${location.name}: ${error}`);
      }

      if (acronymFieldFound) {
        console.log(`   🎯 Acronym field found! Continuing analysis at this location...`);
        break;
      }
    }

    // If we found the field, do detailed testing
    if (acronymFieldFound && workingLocation && fieldDetails) {
      console.log(`\n🧪 DETAILED FIELD TESTING AT: ${workingLocation.name}`);
      console.log('-'.repeat(50));
      
      const acronymField = page.locator(fieldDetails.selector).first();
      
      // Test different scenarios based on field state
      if (fieldDetails.enabled && fieldDetails.editable) {
        console.log(`✅ Field is enabled and editable - testing save behavior`);
        
        try {
          const testValue = `TEST${Date.now().toString().slice(-4)}`;
          console.log(`📝 Testing with value: "${testValue}"`);
          
          // Clear and set value
          await acronymField.clear();
          await acronymField.fill(testValue);
          console.log(`   ✅ Value set successfully`);
          
          // Trigger save by blurring
          await acronymField.blur();
          await page.waitForTimeout(500);
          
          // Check for save indicators
          const spinnerSelectors = ['.animate-spin', '[data-saving="true"]', '.text-orange-500'];
          const tickSelectors = ['.text-green-500', '.text-green-600', '[data-saved="true"]'];
          
          let spinnerSeen = false;
          let tickSeen = false;
          
          for (const sel of spinnerSelectors) {
            if (await page.locator(sel).first().isVisible().catch(() => false)) {
              spinnerSeen = true;
              console.log(`   🟠 Saving spinner detected: ${sel}`);
              break;
            }
          }
          
          await page.waitForTimeout(2000);
          
          for (const sel of tickSelectors) {
            if (await page.locator(sel).first().isVisible().catch(() => false)) {
              tickSeen = true;
              console.log(`   ✅ Success tick detected: ${sel}`);
              break;
            }
          }
          
          console.log(`   Save indicators: Spinner=${spinnerSeen ? '✅' : '❌'}, Tick=${tickSeen ? '✅' : '❌'}`);
          
          // Take screenshot after save attempt
          await page.screenshot({ path: 'test-results/acronym-after-save-attempt.png' });
          
          // Test persistence by refreshing
          console.log(`\n🔄 Testing persistence with page refresh...`);
          await page.reload();
          await page.waitForTimeout(2000);
          
          const fieldAfterRefresh = page.locator(fieldDetails.selector).first();
          const valueAfterRefresh = await fieldAfterRefresh.inputValue().catch(() => null);
          
          if (valueAfterRefresh === testValue) {
            console.log(`   ✅ Value persisted after refresh: "${valueAfterRefresh}"`);
          } else {
            console.log(`   ❌ Value lost after refresh: expected "${testValue}", got "${valueAfterRefresh}"`);
          }
          
          await page.screenshot({ path: 'test-results/acronym-after-refresh.png' });
          
        } catch (error) {
          console.log(`   ❌ Testing failed: ${error}`);
        }
        
      } else {
        console.log(`❌ Field is disabled/not editable`);
        
        if (fieldDetails.disabled) {
          console.log(`\n🔍 ANALYZING WHY FIELD IS DISABLED:`);
          
          // Check for required fields that might need to be filled first
          const requiredFields = await page.locator('input[required], input[aria-required="true"]').count();
          console.log(`   Required fields on page: ${requiredFields}`);
          
          // Check for form validation state
          const invalidFields = await page.locator('input:invalid').count();
          console.log(`   Invalid fields: ${invalidFields}`);
          
          // Check if title field has content (often required for acronym)
          const titleField = page.locator('input[name="title"], #title').first();
          if (await titleField.count() > 0) {
            const titleValue = await titleField.inputValue().catch(() => '');
            console.log(`   Title field value: "${titleValue}" ${titleValue ? '✅' : '❌ Empty - may be required for acronym'}`);
            
            // Try filling title to see if acronym becomes enabled
            if (!titleValue) {
              console.log(`\n🧪 TESTING: Fill title to enable acronym field`);
              try {
                await titleField.fill('Test Activity Title');
                await titleField.blur();
                await page.waitForTimeout(1000);
                
                const acronymNowEnabled = await acronymField.isEnabled().catch(() => false);
                console.log(`   Acronym enabled after title: ${acronymNowEnabled ? '✅ YES' : '❌ NO'}`);
                
                if (acronymNowEnabled) {
                  console.log(`   🎯 SOLUTION FOUND: Title field must be filled before acronym becomes editable!`);
                }
              } catch (e) {
                console.log(`   ❌ Could not test title requirement: ${e}`);
              }
            }
          }
        }
      }
    } else {
      console.log(`\n❌ ACRONYM FIELD NOT FOUND ON ANY TESTED PAGE`);
      console.log(`\nPossible reasons:`);
      console.log(`1. Field only appears on specific activity edit pages`);
      console.log(`2. Field requires authentication to be visible`);
      console.log(`3. Field is conditionally shown based on activity type/status`);
      console.log(`4. Field selector has changed in recent updates`);
    }

    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('🎯 INVESTIGATION SUMMARY');
    console.log('='.repeat(70));
    
    if (acronymFieldFound) {
      console.log(`✅ Acronym field located at: ${workingLocation.name}`);
      console.log(`📍 Selector: ${fieldDetails.selector}`);
      console.log(`🔧 State: ${fieldDetails.enabled ? 'Enabled' : 'Disabled'} | ${fieldDetails.editable ? 'Editable' : 'Not Editable'}`);
      
      if (!fieldDetails.enabled) {
        console.log(`\n🔴 ROOT CAUSE: Field is disabled`);
        console.log(`💡 Most likely reason: Required fields (like title) must be completed first`);
        console.log(`🎯 This explains the green tick + disappearing value behavior:`);
        console.log(`   1. Field becomes temporarily enabled when conditions are met`);
        console.log(`   2. User enters value and sees success feedback`);
        console.log(`   3. Field gets disabled again, losing the value`);
        console.log(`   4. Navigation/refresh shows the field empty because it was never truly saved`);
      }
    } else {
      console.log(`❌ Acronym field not found on tested pages`);
      console.log(`🔍 Need authentication or specific activity to continue analysis`);
    }
    
    console.log('\n📸 Screenshots saved for analysis in test-results/');
    console.log('='.repeat(70));
  });
});
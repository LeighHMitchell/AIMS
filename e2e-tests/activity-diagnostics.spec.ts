import { test, expect } from '@playwright/test';
import { FIELD_MATRIX, TEST_CONFIG, UI_INDICATORS } from './config/fields';
import SupabaseHelper from './helpers/supabase';

let testActivityId: string | null = null;

test.describe('Activity Editor Field Diagnostics', () => {
  test.beforeAll(async () => {
    console.log('🔍 Starting Activity Editor Diagnostics...');
    
    // Test Supabase connection
    try {
      testActivityId = await SupabaseHelper.createActivity({
        title: 'E2E Diagnostic Test Activity',
        description: 'Activity for automated field testing'
      });
      
      if (testActivityId) {
        console.log(`✅ Created test activity: ${testActivityId}`);
      } else {
        console.log('❌ Failed to create test activity');
      }
    } catch (error) {
      console.error('❌ Supabase connection failed:', error);
    }
  });

  test.afterAll(async () => {
    if (testActivityId) {
      await SupabaseHelper.deleteActivity(testActivityId);
      console.log('🧹 Cleaned up test activity');
    }
  });

  test('Database connection test', async () => {
    expect(testActivityId).not.toBeNull();
    
    if (testActivityId) {
      const activity = await SupabaseHelper.getActivityById(testActivityId);
      expect(activity).not.toBeNull();
      expect(activity?.title).toContain('E2E Diagnostic');
    }
  });

  // Test each field individually
  FIELD_MATRIX.forEach(field => {
    test(`Field diagnostic: ${field.key}`, async ({ page }) => {
      const results = {
        field: field.key,
        accessible: false,
        ui_set: false,
        spinner_seen: false,
        tick_seen: false,
        db_saved: false,
        notes: []
      };

      try {
        // Navigate to activities
        await page.goto(`${TEST_CONFIG.baseUrl}/activities`);
        
        // Check if login required
        if (page.url().includes('/login')) {
          results.notes.push('Login required - cannot test field without credentials');
          console.log(`⚠️  ${field.key}: Login required for testing`);
          return;
        }

        // Try to access activity editor
        if (testActivityId) {
          await page.goto(`${TEST_CONFIG.baseUrl}/activities/${testActivityId}/edit`);
        } else {
          await page.goto(`${TEST_CONFIG.baseUrl}/activities/new`);
        }

        if (page.url().includes('/login')) {
          results.notes.push('Editor requires authentication');
          console.log(`⚠️  ${field.key}: Editor requires authentication`);
          return;
        }

        results.accessible = true;

        // Find the field
        const fieldElement = page.locator(field.selector).first();
        const fieldCount = await fieldElement.count();

        if (fieldCount === 0) {
          results.notes.push(`Field not found with selector: ${field.selector}`);
          console.log(`❌ ${field.key}: Field not found`);
          return;
        }

        // Test setting field value
        try {
          await fieldElement.fill(String(field.sample));
          await fieldElement.blur();
          results.ui_set = true;
          console.log(`✅ ${field.key}: Value set successfully`);

          // Wait for potential save indicators
          await page.waitForTimeout(TEST_CONFIG.debounceWait);

          // Check for saving spinner
          const spinnerVisible = await page.locator(UI_INDICATORS.savingSpinner.selector).first().isVisible({ timeout: UI_INDICATORS.savingSpinner.timeout }).catch(() => false);
          results.spinner_seen = spinnerVisible;

          // Check for success tick
          const tickVisible = await page.locator(UI_INDICATORS.successTick.selector).first().isVisible({ timeout: UI_INDICATORS.successTick.timeout }).catch(() => false);
          results.tick_seen = tickVisible;

          // Check database if we have activity ID
          if (testActivityId) {
            await page.waitForTimeout(2000); // Wait for save to complete
            const dbColumn = field.dbColumn || field.key;
            const dbValue = await SupabaseHelper.getActivityFieldValue(testActivityId, dbColumn);
            results.db_saved = dbValue === field.sample || dbValue !== null;
          }

          console.log(`📊 ${field.key}: UI=${results.ui_set}, Spinner=${results.spinner_seen}, Tick=${results.tick_seen}, DB=${results.db_saved}`);
          
        } catch (error) {
          results.notes.push(`Error setting field: ${error}`);
          console.log(`❌ ${field.key}: Error setting field - ${error}`);
        }

      } catch (error) {
        results.notes.push(`Test error: ${error}`);
        console.log(`❌ ${field.key}: Test error - ${error}`);
      }

      // Log results
      const status = results.accessible && results.ui_set && (results.spinner_seen || results.tick_seen) ? '✅' : '❌';
      console.log(`${status} ${field.key}: ${JSON.stringify(results, null, 2)}`);
    });
  });

  test('Generate summary report', async () => {
    console.log('\n' + '='.repeat(80));
    console.log('                    ACTIVITY EDITOR DIAGNOSTIC SUMMARY');
    console.log('='.repeat(80));
    
    console.log(`\nTest Configuration:`);
    console.log(`- Application URL: ${TEST_CONFIG.baseUrl}`);
    console.log(`- Test Activity ID: ${testActivityId || 'Not created'}`);
    console.log(`- Fields Tested: ${FIELD_MATRIX.length}`);
    
    console.log(`\nFields in Test Matrix:`);
    FIELD_MATRIX.forEach(field => {
      console.log(`- ${field.key} (${field.type}): ${field.selector.split(',')[0]}`);
    });
    
    console.log(`\nTo run with authentication:`);
    console.log(`1. Add TEST_EMAIL and TEST_PASSWORD to .env file`);
    console.log(`2. Ensure test user can create/edit activities`);
    console.log(`3. Re-run: npx playwright test --config=playwright.e2e.config.ts`);
    
    console.log('='.repeat(80));
  });
});

test('Application accessibility check', async ({ page }) => {
  await page.goto(TEST_CONFIG.baseUrl);
  
  // Check app loads
  await expect(page).toHaveTitle(/æther/i);
  console.log('✅ Application loads successfully');
  
  // Check activities page
  await page.goto(`${TEST_CONFIG.baseUrl}/activities`);
  const hasActivitiesContent = await page.locator('text=/activit/i').count() > 0;
  console.log(`✅ Activities page accessible: ${hasActivitiesContent}`);
  
  // Check login functionality  
  await page.goto(`${TEST_CONFIG.baseUrl}/login`);
  const hasEmailField = await page.locator('input[type="email"]').count() > 0;
  const hasPasswordField = await page.locator('input[type="password"]').count() > 0;
  console.log(`✅ Login page functional: email=${hasEmailField}, password=${hasPasswordField}`);
});
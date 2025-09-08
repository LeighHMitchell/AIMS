import { test, expect } from '@playwright/test';
import { FIELD_MATRIX, TEST_CONFIG, TestField } from './config/fields';
import SupabaseHelper from './helpers/supabase';
import AuthHelper from './helpers/auth';
import { ReportGenerator, TestResult } from './helpers/report';
import { TestUtils } from './helpers/test-utils';
import * as fs from 'fs';
import * as path from 'path';

// Initialize report generator
const reportGenerator = new ReportGenerator();
let testActivityId: string | null = null;

// Configure test settings
test.use({
  video: 'retain-on-failure',
  screenshot: 'only-on-failure',
  trace: 'retain-on-failure',
  baseURL: TEST_CONFIG.baseUrl
});

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  // Clean up any existing test activities
  await SupabaseHelper.cleanupTestActivities();
  
  // Create a fresh test activity
  testActivityId = await SupabaseHelper.createActivity({
    title: 'E2E Test Activity - Field Diagnostics',
    description: 'Activity created for automated field testing'
  });
  
  if (!testActivityId) {
    throw new Error('Failed to create test activity');
  }
  
  console.log(`Created test activity with ID: ${testActivityId}`);
});

test.afterAll(async () => {
  // Generate reports
  const csvPath = await reportGenerator.generateCSVReport();
  const jsonPath = await reportGenerator.generateJSONReport();
  const summary = reportGenerator.generateHumanReadableSummary();
  
  console.log(summary);
  console.log(`Reports saved to: ${reportGenerator.getArtifactsDirectory()}`);
  
  // Clean up test activity
  if (testActivityId) {
    await SupabaseHelper.deleteActivity(testActivityId);
  }
});

// Main parameterized test for each field
FIELD_MATRIX.forEach(field => {
  test.describe(`Field: ${field.key}`, () => {
    let utils: TestUtils;
    let testResult: TestResult;
    
    test.beforeEach(async ({ page }) => {
      utils = new TestUtils(page);
      testResult = {
        field_key: field.key,
        ui_saved_initial: false,
        db_saved_initial: false,
        ui_saved_after_nav_back: false,
        db_saved_after_nav_back: false,
        ui_saved_after_refresh: false,
        db_saved_after_refresh: false,
        spinner_seen: false,
        tick_seen: false,
        tick_while_empty: false,
        rapid_edit_success: false,
        notes: ''
      };
      
      // Ensure authenticated
      const isAuthenticated = await AuthHelper.ensureAuthenticated(page);
      if (!isAuthenticated) {
        throw new Error('Failed to authenticate');
      }
      
      // Navigate to activity editor
      await utils.navigateToActivityEditor(testActivityId!);
      
      // Navigate to the appropriate tab if specified
      if (field.tab) {
        await utils.navigateToTab(field.tab);
      }
    });
    
    test.afterEach(async ({ page }, testInfo) => {
      // Capture screenshot on failure
      if (testInfo.status !== 'passed') {
        const screenshot = await utils.takeScreenshot(`${field.key}_failure`);
        const screenshotPath = reportGenerator.saveScreenshot(field.key, screenshot);
        testResult.screencap_path = screenshotPath;
        
        // Get video path if available
        const video = page.video();
        if (video) {
          const videoPath = await video.path();
          if (videoPath) {
            const newVideoPath = path.join(
              reportGenerator.getArtifactsDirectory(),
              `${field.key}_failure.webm`
            );
            fs.copyFileSync(videoPath, newVideoPath);
            testResult.video_path = newVideoPath;
          }
        }
      }
      
      // Add result to report
      reportGenerator.addResult(testResult);
    });
    
    test('Initial save and UI indicators', async ({ page }) => {
      const fieldElement = await utils.findFieldElement(field);
      expect(fieldElement).not.toBeNull();
      
      // Monitor network calls during save
      const networkRequests = await utils.monitorNetworkSave(async () => {
        // Set field value
        const setValue = await utils.setFieldValue(field, field.sample);
        expect(setValue).toBe(true);
        
        // Watch for saving spinner
        const spinnerResult = await utils.waitForSavingSpinner();
        testResult.spinner_seen = spinnerResult.seen;
        testResult.spinner_timestamp = spinnerResult.timestamp;
        
        // Watch for success tick
        const tickResult = await utils.waitForSuccessTick();
        testResult.tick_seen = tickResult.seen;
        testResult.tick_timestamp = tickResult.timestamp;
      });
      
      // Verify UI shows the saved value
      const uiValue = await utils.getFieldValue(field);
      testResult.ui_saved_initial = uiValue === field.sample || 
                                    JSON.stringify(uiValue) === JSON.stringify(field.sample);
      
      // Verify database has the saved value
      const dbColumn = field.dbColumn || field.key;
      const dbResult = await SupabaseHelper.monitorSaveOperation(
        testActivityId!,
        dbColumn,
        field.sample,
        5000
      );
      testResult.db_saved_initial = dbResult.success;
      
      // Check for errors
      const hasError = await utils.hasError();
      if (hasError) {
        const errorMsg = await utils.getErrorMessage();
        testResult.error_details = errorMsg || 'Unknown error';
        testResult.notes = `Error during initial save: ${errorMsg}`;
      }
      
      // Log network requests for debugging
      if (networkRequests.length > 0) {
        console.log(`Network requests for ${field.key}:`, networkRequests.length);
      }
      
      // Assertions
      expect(testResult.spinner_seen).toBe(true);
      expect(testResult.tick_seen).toBe(true);
      expect(testResult.ui_saved_initial).toBe(true);
      expect(testResult.db_saved_initial).toBe(true);
    });
    
    test('Navigation persistence', async ({ page }) => {
      // Set the field value first
      await utils.setFieldValue(field, field.sample);
      await page.waitForTimeout(2000); // Wait for save to complete
      
      // Navigate away and back
      await utils.navigateForwardAndBack();
      
      // Navigate back to the appropriate tab
      if (field.tab) {
        await utils.navigateToTab(field.tab);
      }
      
      // Check UI value after navigation
      const uiValue = await utils.getFieldValue(field);
      testResult.ui_saved_after_nav_back = uiValue === field.sample || 
                                           JSON.stringify(uiValue) === JSON.stringify(field.sample);
      
      // Check DB value
      const dbColumn = field.dbColumn || field.key;
      const dbValue = await SupabaseHelper.getActivityFieldValue(testActivityId!, dbColumn);
      testResult.db_saved_after_nav_back = dbValue === field.sample || 
                                           JSON.stringify(dbValue) === JSON.stringify(field.sample);
      
      // Assertions
      expect(testResult.ui_saved_after_nav_back).toBe(true);
      expect(testResult.db_saved_after_nav_back).toBe(true);
    });
    
    test('Refresh persistence', async ({ page }) => {
      // Set the field value first
      await utils.setFieldValue(field, field.sample);
      await page.waitForTimeout(2000); // Wait for save to complete
      
      // Perform hard refresh
      await utils.performHardRefresh();
      
      // Re-authenticate if needed after refresh
      await AuthHelper.ensureAuthenticated(page);
      
      // Navigate back to the appropriate tab
      if (field.tab) {
        await utils.navigateToTab(field.tab);
      }
      
      // Check UI value after refresh
      const uiValue = await utils.getFieldValue(field);
      testResult.ui_saved_after_refresh = uiValue === field.sample || 
                                          JSON.stringify(uiValue) === JSON.stringify(field.sample);
      
      // Check DB value
      const dbColumn = field.dbColumn || field.key;
      const dbValue = await SupabaseHelper.getActivityFieldValue(testActivityId!, dbColumn);
      testResult.db_saved_after_refresh = dbValue === field.sample || 
                                          JSON.stringify(dbValue) === JSON.stringify(field.sample);
      
      // Assertions
      expect(testResult.ui_saved_after_refresh).toBe(true);
      expect(testResult.db_saved_after_refresh).toBe(true);
    });
    
    test('Empty field behavior', async ({ page }) => {
      // Clear the field
      await utils.clearFieldValue(field);
      await page.waitForTimeout(1000);
      
      // Check if tick appears for empty field
      testResult.tick_while_empty = await utils.isTickShownForEmptyField();
      
      // Assertion - tick should not appear for empty field
      expect(testResult.tick_while_empty).toBe(false);
      
      // Restore the value for other tests
      await utils.setFieldValue(field, field.sample);
      await page.waitForTimeout(2000);
    });
    
    test('Rapid edit race condition', async ({ page }) => {
      // Perform rapid edits
      const testValues = [
        `${field.sample} - Edit 1`,
        `${field.sample} - Edit 2`,
        `${field.sample} - Final`
      ];
      
      const finalValue = field.type === 'select' || field.type === 'multiselect' 
        ? field.sample // Select fields don't support concatenation
        : testValues[testValues.length - 1];
      
      const lastSetValue = await utils.performRapidEdits(
        field,
        field.type === 'select' || field.type === 'multiselect' ? [field.sample] : testValues
      );
      
      // Wait for debounce and save to complete
      await page.waitForTimeout(3000);
      
      // Check if the final value is saved correctly
      const dbColumn = field.dbColumn || field.key;
      const dbValue = await SupabaseHelper.getActivityFieldValue(testActivityId!, dbColumn);
      
      if (field.type === 'select' || field.type === 'multiselect') {
        testResult.rapid_edit_success = dbValue === field.sample || 
                                        JSON.stringify(dbValue) === JSON.stringify(field.sample);
      } else {
        testResult.rapid_edit_success = dbValue === finalValue;
      }
      
      if (!testResult.rapid_edit_success) {
        testResult.notes = `Rapid edit failed. Expected: ${finalValue}, Got: ${dbValue}`;
      }
      
      // Assertion
      expect(testResult.rapid_edit_success).toBe(true);
    });
  });
});

// Additional test for overall system behavior
test('System health check', async ({ page }) => {
  const utils = new TestUtils(page);
  
  // Ensure authenticated
  await AuthHelper.ensureAuthenticated(page);
  
  // Navigate to activity editor
  await utils.navigateToActivityEditor(testActivityId!);
  
  // Check that all tabs are accessible
  const tabs = ['basic', 'classification', 'location', 'financial', 'organizations'];
  for (const tab of tabs) {
    const canNavigate = await utils.navigateToTab(tab);
    if (!canNavigate) {
      console.warn(`Could not navigate to tab: ${tab}`);
    }
  }
  
  // Verify activity exists in database
  const activity = await SupabaseHelper.getActivityById(testActivityId!);
  expect(activity).not.toBeNull();
  expect(activity.title).toContain('E2E Test Activity');
});
/**
 * Playwright Configuration for IATI Import Tests
 *
 * Specialized configuration for testing IATI import functionality.
 * Tests run against localhost by default.
 */

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

export default defineConfig({
  // Test directory for IATI import tests
  testDir: './e2e/iati-import',

  // Extended timeout for import operations
  timeout: 120000, // 2 minutes per test

  // Expect timeout for assertions
  expect: {
    timeout: 30000, // 30 seconds for expect assertions
  },

  // Run tests sequentially to avoid database conflicts
  fullyParallel: false,

  // Fail fast on CI
  forbidOnly: !!process.env.CI,

  // Retry failed tests once
  retries: process.env.CI ? 1 : 0,

  // Single worker for consistent state
  workers: 1,

  // Test reporters
  reporter: [
    ['list'],
    ['html', {
      outputFolder: 'test-reports/iati-import/playwright',
      open: 'never'
    }],
    ['json', {
      outputFile: 'test-reports/iati-import/playwright/results.json'
    }]
  ],

  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',

    // Collect trace on failure
    trace: 'retain-on-failure',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'retain-on-failure',

    // Browser context options
    contextOptions: {
      ignoreHTTPSErrors: true,
    },

    // Slow down actions for visibility (helpful for debugging)
    // launchOptions: { slowMo: 50 }
  },

  // Projects (browsers to test)
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    // Uncomment to test in Firefox and Safari
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Web server configuration
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000, // 2 minutes to start server
  },

  // Output directory for test artifacts
  outputDir: 'test-reports/iati-import/playwright-artifacts',
});

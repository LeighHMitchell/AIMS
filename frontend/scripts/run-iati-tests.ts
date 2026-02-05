#!/usr/bin/env tsx
/**
 * IATI Import Test Runner
 *
 * Runs all IATI import tests and generates a comprehensive HTML report.
 * Usage: npm run test:iati:full
 */

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  generateHTMLReport,
  saveReport,
  createEmptyReport,
  addSuite,
  addTestResult,
  TestReport,
  TestResult,
  TestSuite
} from '../src/test-utils/iati-report-generator';

const REPORT_DIR = path.join(process.cwd(), 'test-reports', 'iati-import');

interface VitestResult {
  testResults: Array<{
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    assertionResults: Array<{
      fullName: string;
      status: 'passed' | 'failed' | 'skipped';
      duration: number;
      failureMessages?: string[];
    }>;
  }>;
}

async function runVitestTests(): Promise<{ passed: number; failed: number; results: TestSuite[] }> {
  console.log('\n📝 Running Unit and Integration Tests (Vitest)...\n');

  const resultFile = path.join(REPORT_DIR, 'vitest-results.json');

  try {
    // Run vitest with JSON reporter
    execSync(
      `npx vitest run --dir src/__tests__/lib/iati --dir src/__tests__/api/iati --reporter=json --outputFile=${resultFile}`,
      {
        stdio: 'inherit',
        cwd: process.cwd()
      }
    );
  } catch (error) {
    console.log('Vitest completed with some failures');
  }

  // Parse results
  const suites: TestSuite[] = [];
  let totalPassed = 0;
  let totalFailed = 0;

  if (fs.existsSync(resultFile)) {
    try {
      const rawResults = JSON.parse(fs.readFileSync(resultFile, 'utf-8'));

      // Process vitest output
      if (rawResults.testResults) {
        for (const testFile of rawResults.testResults) {
          const suiteName = path.basename(testFile.name, '.test.ts');
          const suite: TestSuite = {
            name: suiteName,
            tests: [],
            timestamp: new Date(),
            duration: testFile.duration || 0
          };

          for (const assertion of testFile.assertionResults || []) {
            const status = assertion.status === 'passed' ? 'passed' :
                          assertion.status === 'failed' ? 'failed' : 'skipped';

            if (status === 'passed') totalPassed++;
            if (status === 'failed') totalFailed++;

            const testResult: TestResult = {
              name: assertion.fullName || assertion.title || 'Unknown test',
              testCase: assertion.ancestorTitles?.join(' > ') || '',
              status,
              duration: assertion.duration || 0,
              error: assertion.failureMessages?.join('\n')
            };

            suite.tests.push(testResult);
          }

          if (suite.tests.length > 0) {
            suites.push(suite);
          }
        }
      }
    } catch (e) {
      console.error('Error parsing vitest results:', e);
    }
  }

  return { passed: totalPassed, failed: totalFailed, results: suites };
}

async function runPlaywrightTests(): Promise<{ passed: number; failed: number; results: TestSuite[] }> {
  console.log('\n🎭 Running E2E Tests (Playwright)...\n');

  const resultFile = path.join(REPORT_DIR, 'playwright-results.json');

  try {
    // Run playwright with JSON reporter
    execSync(
      `npx playwright test --config playwright.iati.config.ts --reporter=json`,
      {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: {
          ...process.env,
          PLAYWRIGHT_JSON_OUTPUT_NAME: resultFile
        }
      }
    );
  } catch (error) {
    console.log('Playwright completed with some failures');
  }

  const suites: TestSuite[] = [];
  let totalPassed = 0;
  let totalFailed = 0;

  if (fs.existsSync(resultFile)) {
    try {
      const rawResults = JSON.parse(fs.readFileSync(resultFile, 'utf-8'));

      if (rawResults.suites) {
        for (const pwSuite of rawResults.suites) {
          const suite: TestSuite = {
            name: pwSuite.title || 'E2E Tests',
            tests: [],
            timestamp: new Date(),
            duration: 0
          };

          // Process specs
          const processSpecs = (specs: any[]) => {
            for (const spec of specs || []) {
              for (const test of spec.tests || []) {
                const status = test.status === 'passed' ? 'passed' :
                              test.status === 'failed' ? 'failed' : 'skipped';

                if (status === 'passed') totalPassed++;
                if (status === 'failed') totalFailed++;

                const duration = test.results?.[0]?.duration || 0;
                suite.duration += duration;

                const testResult: TestResult = {
                  name: spec.title || 'Unknown test',
                  testCase: test.title || '',
                  status,
                  duration,
                  error: test.results?.[0]?.error?.message,
                  screenshot: test.results?.[0]?.attachments?.find((a: any) => a.contentType?.includes('image'))?.path
                };

                suite.tests.push(testResult);
              }
            }
          };

          processSpecs(pwSuite.specs);

          // Process nested suites
          for (const nestedSuite of pwSuite.suites || []) {
            processSpecs(nestedSuite.specs);
          }

          if (suite.tests.length > 0) {
            suites.push(suite);
          }
        }
      }
    } catch (e) {
      console.error('Error parsing playwright results:', e);
    }
  }

  return { passed: totalPassed, failed: totalFailed, results: suites };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         IATI Import Comprehensive Test Suite               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Ensure report directory exists
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  const startTime = Date.now();

  // Run tests
  const vitestResults = await runVitestTests();
  const playwrightResults = await runPlaywrightTests();

  const totalDuration = Date.now() - startTime;

  // Create comprehensive report
  const report: TestReport = createEmptyReport(
    'IATI Import Comprehensive Test Report',
    process.env.TEST_BASE_URL || 'http://localhost:3000'
  );

  // Add vitest suites
  for (const suite of vitestResults.results) {
    report.suites.push(suite);
  }

  // Add playwright suites
  for (const suite of playwrightResults.results) {
    report.suites.push(suite);
  }

  // Generate HTML report
  const htmlContent = generateHTMLReport(report);
  const reportPath = saveReport(htmlContent, 'index.html', REPORT_DIR);

  // Print summary
  const totalPassed = vitestResults.passed + playwrightResults.passed;
  const totalFailed = vitestResults.failed + playwrightResults.failed;
  const total = totalPassed + totalFailed;

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST RESULTS SUMMARY                    ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Unit/Integration Tests:                                   ║`);
  console.log(`║    ✓ Passed: ${vitestResults.passed.toString().padEnd(4)}    ✗ Failed: ${vitestResults.failed.toString().padEnd(4)}                    ║`);
  console.log(`║  E2E Tests:                                                ║`);
  console.log(`║    ✓ Passed: ${playwrightResults.passed.toString().padEnd(4)}    ✗ Failed: ${playwrightResults.failed.toString().padEnd(4)}                    ║`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  TOTAL:  ${total} tests  |  ✓ ${totalPassed} passed  |  ✗ ${totalFailed} failed        ║`);
  console.log(`║  Pass Rate: ${total > 0 ? ((totalPassed / total) * 100).toFixed(1) : '0'}%                                          ║`);
  console.log(`║  Duration: ${(totalDuration / 1000).toFixed(1)}s                                           ║`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  HTML Report: ${reportPath.slice(-45).padEnd(45)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Exit with appropriate code
  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(console.error);

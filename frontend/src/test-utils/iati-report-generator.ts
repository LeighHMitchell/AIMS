/**
 * HTML Test Report Generator for IATI Import Tests
 *
 * Generates comprehensive HTML reports with:
 * - Summary statistics
 * - Individual test results
 * - Error details and screenshots
 * - Response data samples
 */

import * as fs from 'fs';
import * as path from 'path';

export interface TestResult {
  name: string;
  testCase: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  errorStack?: string;
  screenshot?: string;
  requestData?: any;
  responseData?: any;
  assertions?: Array<{ description: string; passed: boolean; actual?: any; expected?: any }>;
}

export interface TestSuite {
  name: string;
  description?: string;
  tests: TestResult[];
  timestamp: Date;
  duration: number;
}

export interface TestReport {
  title: string;
  suites: TestSuite[];
  environment: {
    baseUrl: string;
    nodeVersion: string;
    timestamp: Date;
  };
}

/**
 * Generate a comprehensive HTML test report
 */
export function generateHTMLReport(report: TestReport): string {
  const totalTests = report.suites.reduce((acc, s) => acc + s.tests.length, 0);
  const passedTests = report.suites.reduce(
    (acc, s) => acc + s.tests.filter(t => t.status === 'passed').length, 0
  );
  const failedTests = report.suites.reduce(
    (acc, s) => acc + s.tests.filter(t => t.status === 'failed').length, 0
  );
  const skippedTests = report.suites.reduce(
    (acc, s) => acc + s.tests.filter(t => t.status === 'skipped').length, 0
  );
  const totalDuration = report.suites.reduce((acc, s) => acc + s.duration, 0);
  const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.title}</title>
  <style>
    :root {
      --color-passed: #22c55e;
      --color-failed: #ef4444;
      --color-skipped: #f59e0b;
      --color-bg: #f8fafc;
      --color-card: #ffffff;
      --color-border: #e2e8f0;
      --color-text: #1e293b;
      --color-muted: #64748b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--color-bg);
      color: var(--color-text);
      line-height: 1.6;
      padding: 24px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 28px; margin-bottom: 8px; }
    h2 { font-size: 20px; margin-bottom: 12px; }
    h3 { font-size: 16px; margin-bottom: 8px; }
    .timestamp { color: var(--color-muted); font-size: 14px; margin-bottom: 24px; }

    /* Summary Card */
    .summary {
      background: var(--color-card);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }
    .stat {
      text-align: center;
      padding: 16px;
      border-radius: 8px;
      background: var(--color-bg);
    }
    .stat-value { font-size: 32px; font-weight: bold; }
    .stat-label { font-size: 14px; color: var(--color-muted); }
    .stat.passed .stat-value { color: var(--color-passed); }
    .stat.failed .stat-value { color: var(--color-failed); }
    .stat.skipped .stat-value { color: var(--color-skipped); }

    /* Progress Bar */
    .progress-bar {
      height: 12px;
      background: var(--color-border);
      border-radius: 6px;
      overflow: hidden;
      display: flex;
    }
    .progress-passed { background: var(--color-passed); }
    .progress-failed { background: var(--color-failed); }
    .progress-skipped { background: var(--color-skipped); }

    /* Test Suites */
    .suite {
      background: var(--color-card);
      border-radius: 12px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .suite-header {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      color: white;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .suite-stats {
      display: flex;
      gap: 12px;
      font-size: 14px;
    }
    .suite-stats span {
      padding: 4px 8px;
      border-radius: 4px;
      background: rgba(255,255,255,0.1);
    }

    /* Tests */
    .test {
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border);
      transition: background 0.2s;
    }
    .test:last-child { border-bottom: none; }
    .test:hover { background: var(--color-bg); }
    .test-header {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
    }
    .test-status {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      color: white;
      flex-shrink: 0;
    }
    .test-status.passed { background: var(--color-passed); }
    .test-status.failed { background: var(--color-failed); }
    .test-status.skipped { background: var(--color-skipped); }
    .test-name { flex: 1; font-weight: 500; }
    .test-case { color: var(--color-muted); font-size: 12px; font-family: monospace; }
    .test-duration { color: var(--color-muted); font-size: 14px; }

    /* Test Details */
    .test-details {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--color-border);
      display: none;
    }
    .test.expanded .test-details { display: block; }

    .error-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 12px;
      margin-top: 12px;
    }
    .error-box pre {
      font-size: 12px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .data-box {
      background: #f1f5f9;
      border-radius: 8px;
      padding: 12px;
      margin-top: 12px;
    }
    .data-box pre {
      font-size: 12px;
      overflow-x: auto;
      max-height: 300px;
      overflow-y: auto;
    }
    .data-box-title {
      font-weight: 600;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .screenshot {
      max-width: 100%;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      margin-top: 12px;
    }

    /* Assertions */
    .assertions {
      margin-top: 12px;
    }
    .assertion {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
      font-size: 14px;
    }
    .assertion-icon {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: white;
    }
    .assertion-icon.passed { background: var(--color-passed); }
    .assertion-icon.failed { background: var(--color-failed); }

    /* Environment */
    .environment {
      background: var(--color-card);
      border-radius: 12px;
      padding: 16px 20px;
      margin-top: 24px;
      font-size: 14px;
    }
    .env-item { display: flex; gap: 8px; padding: 4px 0; }
    .env-label { color: var(--color-muted); min-width: 120px; }

    /* Collapsible toggle */
    .toggle-all {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      margin-bottom: 16px;
    }
    .toggle-all:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${report.title}</h1>
    <p class="timestamp">Generated: ${report.environment.timestamp.toISOString()}</p>

    <div class="summary">
      <h2>Summary</h2>
      <div class="stats">
        <div class="stat">
          <div class="stat-value">${totalTests}</div>
          <div class="stat-label">Total Tests</div>
        </div>
        <div class="stat passed">
          <div class="stat-value">${passedTests}</div>
          <div class="stat-label">Passed</div>
        </div>
        <div class="stat failed">
          <div class="stat-value">${failedTests}</div>
          <div class="stat-label">Failed</div>
        </div>
        <div class="stat skipped">
          <div class="stat-value">${skippedTests}</div>
          <div class="stat-label">Skipped</div>
        </div>
        <div class="stat">
          <div class="stat-value">${passRate}%</div>
          <div class="stat-label">Pass Rate</div>
        </div>
        <div class="stat">
          <div class="stat-value">${formatDuration(totalDuration)}</div>
          <div class="stat-label">Duration</div>
        </div>
      </div>

      <div class="progress-bar">
        <div class="progress-passed" style="width: ${(passedTests / totalTests) * 100}%"></div>
        <div class="progress-failed" style="width: ${(failedTests / totalTests) * 100}%"></div>
        <div class="progress-skipped" style="width: ${(skippedTests / totalTests) * 100}%"></div>
      </div>
    </div>

    <button class="toggle-all" onclick="toggleAllTests()">Expand/Collapse All</button>

    ${report.suites.map(suite => generateSuiteHTML(suite)).join('')}

    <div class="environment">
      <h3>Test Environment</h3>
      <div class="env-item">
        <span class="env-label">Base URL:</span>
        <span>${report.environment.baseUrl}</span>
      </div>
      <div class="env-item">
        <span class="env-label">Node Version:</span>
        <span>${report.environment.nodeVersion}</span>
      </div>
      <div class="env-item">
        <span class="env-label">Run Date:</span>
        <span>${report.environment.timestamp.toLocaleString()}</span>
      </div>
    </div>
  </div>

  <script>
    function toggleTest(element) {
      element.closest('.test').classList.toggle('expanded');
    }

    function toggleAllTests() {
      const tests = document.querySelectorAll('.test');
      const anyExpanded = Array.from(tests).some(t => t.classList.contains('expanded'));
      tests.forEach(t => {
        if (anyExpanded) {
          t.classList.remove('expanded');
        } else {
          t.classList.add('expanded');
        }
      });
    }
  </script>
</body>
</html>
  `;
}

function generateSuiteHTML(suite: TestSuite): string {
  const passed = suite.tests.filter(t => t.status === 'passed').length;
  const failed = suite.tests.filter(t => t.status === 'failed').length;
  const skipped = suite.tests.filter(t => t.status === 'skipped').length;

  return `
    <div class="suite">
      <div class="suite-header">
        <div>
          <h3>${suite.name}</h3>
          ${suite.description ? `<small>${suite.description}</small>` : ''}
        </div>
        <div class="suite-stats">
          <span style="color: var(--color-passed);">${passed} passed</span>
          <span style="color: var(--color-failed);">${failed} failed</span>
          <span style="color: var(--color-skipped);">${skipped} skipped</span>
          <span>${formatDuration(suite.duration)}</span>
        </div>
      </div>
      ${suite.tests.map(test => generateTestHTML(test)).join('')}
    </div>
  `;
}

function generateTestHTML(test: TestResult): string {
  const statusIcon = test.status === 'passed' ? '✓' : test.status === 'failed' ? '✗' : '○';

  return `
    <div class="test ${test.status === 'failed' ? 'expanded' : ''}">
      <div class="test-header" onclick="toggleTest(this)">
        <div class="test-status ${test.status}">${statusIcon}</div>
        <div>
          <div class="test-name">${test.name}</div>
          <div class="test-case">${test.testCase}</div>
        </div>
        <div class="test-duration">${test.duration}ms</div>
      </div>
      <div class="test-details">
        ${test.error ? `
          <div class="error-box">
            <strong>Error:</strong>
            <pre>${escapeHtml(test.error)}</pre>
            ${test.errorStack ? `<pre>${escapeHtml(test.errorStack)}</pre>` : ''}
          </div>
        ` : ''}

        ${test.assertions && test.assertions.length > 0 ? `
          <div class="assertions">
            <strong>Assertions:</strong>
            ${test.assertions.map(a => `
              <div class="assertion">
                <div class="assertion-icon ${a.passed ? 'passed' : 'failed'}">${a.passed ? '✓' : '✗'}</div>
                <span>${escapeHtml(a.description)}</span>
                ${!a.passed && a.expected !== undefined ? `
                  <span style="color: var(--color-muted); font-size: 12px;">
                    (expected: ${JSON.stringify(a.expected)}, got: ${JSON.stringify(a.actual)})
                  </span>
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${test.requestData ? `
          <div class="data-box">
            <div class="data-box-title">Request Data</div>
            <pre>${escapeHtml(JSON.stringify(test.requestData, null, 2))}</pre>
          </div>
        ` : ''}

        ${test.responseData ? `
          <div class="data-box">
            <div class="data-box-title">Response Data</div>
            <pre>${escapeHtml(JSON.stringify(test.responseData, null, 2))}</pre>
          </div>
        ` : ''}

        ${test.screenshot ? `
          <img class="screenshot" src="${test.screenshot}" alt="Test screenshot"/>
        ` : ''}
      </div>
    </div>
  `;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Save the HTML report to a file
 */
export function saveReport(content: string, filename: string, reportDir?: string): string {
  const dir = reportDir || path.join(process.cwd(), 'test-reports', 'iati-import');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content);

  return filePath;
}

/**
 * Create an empty test report structure
 */
export function createEmptyReport(title: string, baseUrl: string): TestReport {
  return {
    title,
    suites: [],
    environment: {
      baseUrl,
      nodeVersion: process.version,
      timestamp: new Date()
    }
  };
}

/**
 * Add a test suite to the report
 */
export function addSuite(report: TestReport, name: string, description?: string): TestSuite {
  const suite: TestSuite = {
    name,
    description,
    tests: [],
    timestamp: new Date(),
    duration: 0
  };
  report.suites.push(suite);
  return suite;
}

/**
 * Add a test result to a suite
 */
export function addTestResult(suite: TestSuite, result: TestResult): void {
  suite.tests.push(result);
  suite.duration += result.duration;
}

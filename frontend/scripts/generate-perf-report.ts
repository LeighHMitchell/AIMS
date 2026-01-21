#!/usr/bin/env tsx
/**
 * Performance Report Generator
 * Generates an HTML report comparing benchmark results
 *
 * Usage: npm run perf:report
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

interface BenchmarkResult {
  endpoint: string;
  method: string;
  params?: string;
  runs: number;
  durations: number[];
  responseSizes: number[];
  statusCodes: number[];
  errors: string[];
  stats: {
    min: number;
    max: number;
    mean: number;
    median: number;
    p95: number;
    p99: number;
    stdDev: number;
  };
  avgResponseSize: number;
  timestamp: string;
}

interface FullBenchmarkReport {
  baseUrl: string;
  timestamp: string;
  runsPerEndpoint: number;
  results: BenchmarkResult[];
  summary: {
    totalEndpoints: number;
    totalRequests: number;
    totalDuration: number;
    avgResponseTime: number;
    slowestEndpoint: string;
    fastestEndpoint: string;
  };
}

function loadBenchmarkResults(): { baseline: FullBenchmarkReport | null; latest: FullBenchmarkReport | null; all: FullBenchmarkReport[] } {
  const resultsDir = join(process.cwd(), 'benchmark-results');

  if (!existsSync(resultsDir)) {
    console.log('No benchmark results directory found. Run `npm run benchmark` first.');
    return { baseline: null, latest: null, all: [] };
  }

  const files = readdirSync(resultsDir)
    .filter(f => f.endsWith('.json') && f !== 'latest.json' && f !== 'baseline.json')
    .sort();

  const all: FullBenchmarkReport[] = [];

  for (const file of files) {
    try {
      const content = readFileSync(join(resultsDir, file), 'utf-8');
      all.push(JSON.parse(content));
    } catch (e) {
      console.warn(`Failed to parse ${file}:`, e);
    }
  }

  // Load baseline if exists
  let baseline: FullBenchmarkReport | null = null;
  const baselinePath = join(resultsDir, 'baseline.json');
  if (existsSync(baselinePath)) {
    try {
      baseline = JSON.parse(readFileSync(baselinePath, 'utf-8'));
    } catch {
      // Ignore
    }
  }

  // Load latest
  let latest: FullBenchmarkReport | null = null;
  const latestPath = join(resultsDir, 'latest.json');
  if (existsSync(latestPath)) {
    try {
      latest = JSON.parse(readFileSync(latestPath, 'utf-8'));
    } catch {
      // Ignore
    }
  }

  return { baseline, latest, all };
}

function generateComparisonData(baseline: FullBenchmarkReport | null, latest: FullBenchmarkReport | null): Array<{
  endpoint: string;
  params: string;
  baselineMean: number | null;
  latestMean: number | null;
  baselineP95: number | null;
  latestP95: number | null;
  changePercent: number | null;
  improved: boolean;
}> {
  if (!latest) return [];

  const comparisons = [];

  for (const result of latest.results) {
    const baselineResult = baseline?.results.find(
      r => r.endpoint === result.endpoint && r.params === result.params
    );

    const changePercent = baselineResult
      ? ((result.stats.mean - baselineResult.stats.mean) / baselineResult.stats.mean) * 100
      : null;

    comparisons.push({
      endpoint: result.endpoint,
      params: result.params || '',
      baselineMean: baselineResult?.stats.mean ?? null,
      latestMean: result.stats.mean,
      baselineP95: baselineResult?.stats.p95 ?? null,
      latestP95: result.stats.p95,
      changePercent,
      improved: changePercent !== null && changePercent < 0
    });
  }

  return comparisons.sort((a, b) => (b.latestMean || 0) - (a.latestMean || 0));
}

function generateHTML(baseline: FullBenchmarkReport | null, latest: FullBenchmarkReport | null, all: FullBenchmarkReport[]): string {
  const comparisons = generateComparisonData(baseline, latest);

  const formatDuration = (ms: number | null): string => {
    if (ms === null) return 'N/A';
    if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusColor = (ms: number | null): string => {
    if (ms === null) return '#666';
    if (ms < 200) return '#22c55e'; // Green
    if (ms < 500) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  };

  const getChangeColor = (percent: number | null): string => {
    if (percent === null) return '#666';
    if (percent < -10) return '#22c55e'; // Significant improvement
    if (percent < 0) return '#86efac'; // Minor improvement
    if (percent < 10) return '#fde047'; // Minor regression
    return '#ef4444'; // Significant regression
  };

  // Generate chart data for trends
  const trendData: Record<string, { timestamp: string; mean: number }[]> = {};

  for (const report of all) {
    for (const result of report.results) {
      const key = `${result.endpoint}${result.params || ''}`;
      if (!trendData[key]) {
        trendData[key] = [];
      }
      trendData[key].push({
        timestamp: report.timestamp,
        mean: result.stats.mean
      });
    }
  }

  const chartDataJSON = JSON.stringify(trendData);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AIMS Performance Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      line-height: 1.6;
      padding: 2rem;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      color: #f1f5f9;
    }

    .timestamp {
      color: #94a3b8;
      margin-bottom: 2rem;
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .card {
      background: #1e293b;
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid #334155;
    }

    .card-title {
      color: #94a3b8;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }

    .card-value {
      font-size: 1.75rem;
      font-weight: 600;
      color: #f1f5f9;
    }

    .card-change {
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .improved { color: #22c55e; }
    .regressed { color: #ef4444; }
    .neutral { color: #94a3b8; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2rem;
    }

    th, td {
      padding: 1rem;
      text-align: left;
      border-bottom: 1px solid #334155;
    }

    th {
      background: #1e293b;
      color: #94a3b8;
      font-weight: 500;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    tr:hover {
      background: #1e293b;
    }

    .endpoint-name {
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 0.875rem;
      color: #38bdf8;
    }

    .params {
      color: #94a3b8;
      font-size: 0.75rem;
    }

    .metric {
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 0.875rem;
    }

    .status-badge {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 0.5rem;
    }

    .change-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .chart-container {
      background: #1e293b;
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid #334155;
      margin-bottom: 2rem;
    }

    .chart-title {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      color: #f1f5f9;
    }

    .legend {
      display: flex;
      gap: 2rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .legend-color {
      width: 16px;
      height: 4px;
      border-radius: 2px;
    }

    h2 {
      font-size: 1.5rem;
      margin: 2rem 0 1rem;
      color: #f1f5f9;
    }

    .targets {
      display: flex;
      gap: 1.5rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .target {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #94a3b8;
    }

    .target-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .target-dot.green { background: #22c55e; }
    .target-dot.yellow { background: #eab308; }
    .target-dot.red { background: #ef4444; }

    footer {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid #334155;
      color: #64748b;
      font-size: 0.875rem;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 AIMS Performance Report</h1>
    <p class="timestamp">Generated: ${new Date().toLocaleString()} | Baseline: ${baseline?.timestamp ? new Date(baseline.timestamp).toLocaleString() : 'Not set'}</p>

    <div class="summary-cards">
      <div class="card">
        <div class="card-title">Endpoints Tested</div>
        <div class="card-value">${latest?.summary.totalEndpoints || 0}</div>
      </div>
      <div class="card">
        <div class="card-title">Total Requests</div>
        <div class="card-value">${latest?.summary.totalRequests || 0}</div>
      </div>
      <div class="card">
        <div class="card-title">Avg Response Time</div>
        <div class="card-value">${formatDuration(latest?.summary.avgResponseTime ?? null)}</div>
        ${baseline ? `<div class="card-change ${((latest?.summary.avgResponseTime || 0) < (baseline.summary.avgResponseTime || 0)) ? 'improved' : 'regressed'}">
          ${((((latest?.summary.avgResponseTime || 0) - (baseline.summary.avgResponseTime || 0)) / (baseline.summary.avgResponseTime || 1)) * 100).toFixed(1)}% vs baseline
        </div>` : ''}
      </div>
      <div class="card">
        <div class="card-title">Slowest Endpoint</div>
        <div class="card-value" style="font-size: 1rem; word-break: break-all;">${latest?.summary.slowestEndpoint || 'N/A'}</div>
      </div>
    </div>

    <div class="targets">
      <div class="target">
        <span class="target-dot green"></span>
        <span>&lt; 200ms (Good)</span>
      </div>
      <div class="target">
        <span class="target-dot yellow"></span>
        <span>200-500ms (Acceptable)</span>
      </div>
      <div class="target">
        <span class="target-dot red"></span>
        <span>&gt; 500ms (Needs Improvement)</span>
      </div>
    </div>

    <h2>Endpoint Performance</h2>

    <table>
      <thead>
        <tr>
          <th>Endpoint</th>
          <th>Baseline Mean</th>
          <th>Current Mean</th>
          <th>P95</th>
          <th>Change</th>
        </tr>
      </thead>
      <tbody>
        ${comparisons.map(c => `
          <tr>
            <td>
              <span class="status-badge" style="background: ${getStatusColor(c.latestMean)}"></span>
              <span class="endpoint-name">${c.endpoint}</span>
              ${c.params ? `<span class="params">${c.params}</span>` : ''}
            </td>
            <td class="metric">${formatDuration(c.baselineMean)}</td>
            <td class="metric">${formatDuration(c.latestMean)}</td>
            <td class="metric">${formatDuration(c.latestP95)}</td>
            <td>
              ${c.changePercent !== null ? `
                <span class="change-badge" style="background: ${getChangeColor(c.changePercent)}; color: #000;">
                  ${c.changePercent > 0 ? '+' : ''}${c.changePercent.toFixed(1)}%
                </span>
              ` : '<span class="neutral">—</span>'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="chart-container">
      <h3 class="chart-title">Response Time Distribution</h3>
      <canvas id="barChart" height="300"></canvas>
    </div>

    ${all.length > 1 ? `
    <div class="chart-container">
      <h3 class="chart-title">Performance Trends Over Time</h3>
      <canvas id="trendChart" height="400"></canvas>
    </div>
    ` : ''}

    <footer>
      <p>AIMS Performance Benchmarking Suite | Run <code>npm run benchmark</code> to generate new results</p>
      <p>To set current results as baseline: <code>cp benchmark-results/latest.json benchmark-results/baseline.json</code></p>
    </footer>
  </div>

  <script>
    const chartData = ${chartDataJSON};
    const comparisons = ${JSON.stringify(comparisons)};

    // Bar chart for current results
    const barCtx = document.getElementById('barChart').getContext('2d');
    new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: comparisons.map(c => c.endpoint.replace('/api/', '') + (c.params ? c.params.substring(0, 20) : '')),
        datasets: [
          {
            label: 'Baseline (Mean)',
            data: comparisons.map(c => c.baselineMean),
            backgroundColor: 'rgba(148, 163, 184, 0.5)',
            borderColor: 'rgba(148, 163, 184, 1)',
            borderWidth: 1
          },
          {
            label: 'Current (Mean)',
            data: comparisons.map(c => c.latestMean),
            backgroundColor: comparisons.map(c => {
              if (c.latestMean < 200) return 'rgba(34, 197, 94, 0.7)';
              if (c.latestMean < 500) return 'rgba(234, 179, 8, 0.7)';
              return 'rgba(239, 68, 68, 0.7)';
            }),
            borderColor: comparisons.map(c => {
              if (c.latestMean < 200) return 'rgba(34, 197, 94, 1)';
              if (c.latestMean < 500) return 'rgba(234, 179, 8, 1)';
              return 'rgba(239, 68, 68, 1)';
            }),
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Response Time (ms)',
              color: '#94a3b8'
            },
            grid: {
              color: '#334155'
            },
            ticks: {
              color: '#94a3b8'
            }
          },
          x: {
            grid: {
              color: '#334155'
            },
            ticks: {
              color: '#94a3b8',
              maxRotation: 45
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#94a3b8'
            }
          }
        }
      }
    });

    // Trend chart if we have multiple data points
    ${all.length > 1 ? `
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    const colors = [
      '#38bdf8', '#a78bfa', '#f472b6', '#22c55e', '#fbbf24',
      '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#10b981'
    ];

    const datasets = Object.entries(chartData).map(([key, values], i) => ({
      label: key.replace('/api/', ''),
      data: values.map(v => ({ x: new Date(v.timestamp), y: v.mean })),
      borderColor: colors[i % colors.length],
      backgroundColor: colors[i % colors.length] + '33',
      fill: false,
      tension: 0.1
    }));

    new Chart(trendCtx, {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'hour'
            },
            grid: {
              color: '#334155'
            },
            ticks: {
              color: '#94a3b8'
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Response Time (ms)',
              color: '#94a3b8'
            },
            grid: {
              color: '#334155'
            },
            ticks: {
              color: '#94a3b8'
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#94a3b8'
            }
          }
        }
      }
    });
    ` : ''}
  </script>
</body>
</html>`;
}

async function main() {
  console.log('📊 Generating Performance Report...');

  const { baseline, latest, all } = loadBenchmarkResults();

  if (!latest) {
    console.error('❌ No benchmark results found. Run `npm run benchmark` first.');
    process.exit(1);
  }

  const html = generateHTML(baseline, latest, all);

  const outputPath = join(process.cwd(), 'benchmark-results', 'report.html');
  writeFileSync(outputPath, html);

  console.log(`\n✅ Report generated: ${outputPath}`);
  console.log('\nTo view the report, open it in a browser:');
  console.log(`   open ${outputPath}`);

  if (!baseline) {
    console.log('\n💡 Tip: Set current results as baseline for future comparisons:');
    console.log('   cp benchmark-results/latest.json benchmark-results/baseline.json');
  }
}

main();

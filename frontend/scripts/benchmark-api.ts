#!/usr/bin/env tsx
/**
 * API Benchmark Runner
 * Tests critical API endpoints and measures performance
 *
 * Usage: npm run benchmark
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const BASE_URL = process.env.BENCHMARK_URL || 'http://localhost:3000';
const RUNS_PER_ENDPOINT = parseInt(process.env.BENCHMARK_RUNS || '10', 10);
const WARMUP_RUNS = 2;

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

// Critical endpoints to benchmark
const ENDPOINTS = [
  // NEW: Slim list endpoint
  {
    path: '/api/activities-list',
    method: 'GET',
    params: '?page=1&limit=20',
    name: 'Activities List SLIM (20)'
  },
  {
    path: '/api/activities-list',
    method: 'GET',
    params: '?page=1&limit=50',
    name: 'Activities List SLIM (50)'
  },
  // Original optimized endpoint for comparison
  {
    path: '/api/activities-optimized',
    method: 'GET',
    params: '?page=1&limit=20',
    name: 'Activities Optimized (20)'
  },
  {
    path: '/api/activities-optimized',
    method: 'GET',
    params: '?page=1&limit=50',
    name: 'Activities Optimized (50)'
  },
  {
    path: '/api/activities-optimized',
    method: 'GET',
    params: '?page=1&limit=20&search=health',
    name: 'Activities Search'
  },
  // Organizations - NEW SLIM endpoint
  {
    path: '/api/organizations-list',
    method: 'GET',
    params: '?limit=100',
    name: 'Organizations SLIM (100)'
  },
  // Organizations - Original bulk-stats endpoint for comparison
  {
    path: '/api/organizations/bulk-stats',
    method: 'GET',
    params: '?limit=100',
    name: 'Organizations Bulk Stats (100)'
  },
  // Organizations - Basic endpoint
  {
    path: '/api/organizations',
    method: 'GET',
    params: '',
    name: 'Organizations Basic'
  },
  // NEW: Slim transactions endpoint
  {
    path: '/api/transactions-list',
    method: 'GET',
    params: '?page=1&limit=20',
    name: 'Transactions SLIM (20)'
  },
  {
    path: '/api/transactions-list',
    method: 'GET',
    params: '?page=1&limit=50',
    name: 'Transactions SLIM (50)'
  },
  // Original transactions for comparison
  {
    path: '/api/transactions',
    method: 'GET',
    params: '?page=1&limit=20',
    name: 'Transactions Original (20)'
  },
  {
    path: '/api/transactions',
    method: 'GET',
    params: '?page=1&limit=50',
    name: 'Transactions Original (50)'
  },
  // Dashboard endpoints
  {
    path: '/api/dashboard/actions-required',
    method: 'GET',
    params: '',
    name: 'Dashboard Actions Required'
  }
];

function calculateStats(values: number[]): BenchmarkResult['stats'] {
  if (values.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, p95: 0, p99: 0, stdDev: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;

  const squaredDiffs = sorted.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / sorted.length;
  const stdDev = Math.sqrt(variance);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1],
    p99: sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1],
    stdDev
  };
}

async function benchmarkEndpoint(
  endpoint: { path: string; method: string; params: string; name: string },
  runs: number
): Promise<BenchmarkResult> {
  const url = `${BASE_URL}${endpoint.path}${endpoint.params}`;
  const durations: number[] = [];
  const responseSizes: number[] = [];
  const statusCodes: number[] = [];
  const errors: string[] = [];

  console.log(`\n📊 Benchmarking: ${endpoint.name}`);
  console.log(`   URL: ${url}`);
  console.log(`   Runs: ${runs} (+ ${WARMUP_RUNS} warmup)`);

  // Warmup runs
  for (let i = 0; i < WARMUP_RUNS; i++) {
    try {
      await fetch(url, {
        method: endpoint.method,
        headers: { 'Accept': 'application/json' }
      });
    } catch {
      // Ignore warmup errors
    }
  }

  // Actual benchmark runs
  for (let i = 0; i < runs; i++) {
    const start = performance.now();

    try {
      const response = await fetch(url, {
        method: endpoint.method,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      const end = performance.now();
      const duration = end - start;

      durations.push(duration);
      statusCodes.push(response.status);

      // Get response size
      const text = await response.text();
      responseSizes.push(text.length);

      // Progress indicator
      process.stdout.write(`   Run ${i + 1}/${runs}: ${duration.toFixed(0)}ms\r`);

    } catch (error) {
      const end = performance.now();
      durations.push(end - start);
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      statusCodes.push(0);
    }
  }

  const stats = calculateStats(durations);
  const avgResponseSize = responseSizes.length > 0
    ? responseSizes.reduce((a, b) => a + b, 0) / responseSizes.length
    : 0;

  console.log(`\n   Results: mean=${stats.mean.toFixed(0)}ms, p95=${stats.p95.toFixed(0)}ms, min=${stats.min.toFixed(0)}ms, max=${stats.max.toFixed(0)}ms`);

  return {
    endpoint: endpoint.path,
    method: endpoint.method,
    params: endpoint.params,
    runs,
    durations,
    responseSizes,
    statusCodes,
    errors,
    stats,
    avgResponseSize,
    timestamp: new Date().toISOString()
  };
}

async function runBenchmarks(): Promise<FullBenchmarkReport> {
  console.log('🚀 Starting API Benchmark Suite');
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Runs per endpoint: ${RUNS_PER_ENDPOINT}`);
  console.log(`   Total endpoints: ${ENDPOINTS.length}`);
  console.log('='.repeat(60));

  const startTime = performance.now();
  const results: BenchmarkResult[] = [];

  // Check if server is running
  try {
    const healthCheck = await fetch(`${BASE_URL}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    if (!healthCheck.ok) {
      console.log('⚠️  Health check returned non-OK, proceeding anyway...');
    }
  } catch (error) {
    console.log('⚠️  Could not reach health endpoint, trying first benchmark endpoint...');
  }

  for (const endpoint of ENDPOINTS) {
    try {
      const result = await benchmarkEndpoint(endpoint, RUNS_PER_ENDPOINT);
      results.push(result);
    } catch (error) {
      console.error(`❌ Failed to benchmark ${endpoint.name}:`, error);
      results.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        params: endpoint.params,
        runs: 0,
        durations: [],
        responseSizes: [],
        statusCodes: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        stats: { min: 0, max: 0, mean: 0, median: 0, p95: 0, p99: 0, stdDev: 0 },
        avgResponseSize: 0,
        timestamp: new Date().toISOString()
      });
    }
  }

  const totalDuration = performance.now() - startTime;

  // Calculate summary
  const validResults = results.filter(r => r.durations.length > 0);
  const allDurations = validResults.flatMap(r => r.durations);

  const slowest = validResults.reduce(
    (max, r) => r.stats.mean > max.stats.mean ? r : max,
    validResults[0]
  );
  const fastest = validResults.reduce(
    (min, r) => r.stats.mean < min.stats.mean ? r : min,
    validResults[0]
  );

  const report: FullBenchmarkReport = {
    baseUrl: BASE_URL,
    timestamp: new Date().toISOString(),
    runsPerEndpoint: RUNS_PER_ENDPOINT,
    results,
    summary: {
      totalEndpoints: ENDPOINTS.length,
      totalRequests: allDurations.length,
      totalDuration,
      avgResponseTime: allDurations.length > 0
        ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length
        : 0,
      slowestEndpoint: slowest?.endpoint || 'N/A',
      fastestEndpoint: fastest?.endpoint || 'N/A'
    }
  };

  return report;
}

function saveReport(report: FullBenchmarkReport): string {
  const outputDir = join(process.cwd(), 'benchmark-results');

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `benchmark-${timestamp}.json`;
  const filepath = join(outputDir, filename);

  writeFileSync(filepath, JSON.stringify(report, null, 2));

  // Also save a "latest" version
  const latestPath = join(outputDir, 'latest.json');
  writeFileSync(latestPath, JSON.stringify(report, null, 2));

  return filepath;
}

function printSummary(report: FullBenchmarkReport): void {
  console.log('\n' + '='.repeat(60));
  console.log('📋 BENCHMARK SUMMARY');
  console.log('='.repeat(60));

  console.log(`\nTotal time: ${(report.summary.totalDuration / 1000).toFixed(2)}s`);
  console.log(`Total requests: ${report.summary.totalRequests}`);
  console.log(`Average response time: ${report.summary.avgResponseTime.toFixed(0)}ms`);

  console.log('\n📊 Results by Endpoint:');
  console.log('-'.repeat(60));

  // Sort by mean duration (slowest first)
  const sortedResults = [...report.results].sort((a, b) => b.stats.mean - a.stats.mean);

  for (const result of sortedResults) {
    const indicator = result.stats.mean > 500 ? '🔴' : result.stats.mean > 200 ? '🟡' : '🟢';
    console.log(`${indicator} ${result.endpoint}${result.params || ''}`);
    console.log(`   Mean: ${result.stats.mean.toFixed(0)}ms | P95: ${result.stats.p95.toFixed(0)}ms | Size: ${(result.avgResponseSize / 1024).toFixed(1)}KB`);
  }

  console.log('\n🎯 Performance Targets:');
  console.log('   🟢 < 200ms | 🟡 200-500ms | 🔴 > 500ms');
}

// Main execution
async function main() {
  try {
    const report = await runBenchmarks();
    const filepath = saveReport(report);
    printSummary(report);
    console.log(`\n💾 Full report saved to: ${filepath}`);
    console.log('\n✅ Benchmark complete!');
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  }
}

main();

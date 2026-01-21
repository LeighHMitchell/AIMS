/**
 * Performance Measurement Library
 * Provides utilities for timing, tracing, and benchmarking
 */

export interface PerformanceMeasurement {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
  children?: PerformanceMeasurement[];
}

export interface BenchmarkResult {
  endpoint: string;
  method: string;
  runs: number;
  measurements: {
    min: number;
    max: number;
    mean: number;
    median: number;
    p95: number;
    p99: number;
    stdDev: number;
  };
  rawDurations: number[];
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// In-memory storage for measurements
const measurements: PerformanceMeasurement[] = [];
const benchmarkResults: BenchmarkResult[] = [];

/**
 * Start a performance measurement
 */
export function startMeasurement(name: string, metadata?: Record<string, unknown>): PerformanceMeasurement {
  const measurement: PerformanceMeasurement = {
    name,
    startTime: performance.now(),
    metadata,
    children: []
  };
  return measurement;
}

/**
 * End a performance measurement
 */
export function endMeasurement(measurement: PerformanceMeasurement): PerformanceMeasurement {
  measurement.endTime = performance.now();
  measurement.duration = measurement.endTime - measurement.startTime;
  measurements.push(measurement);
  return measurement;
}

/**
 * Create a scoped timer that auto-ends when the function completes
 */
export async function withTiming<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  measurements.push({
    name,
    startTime: start,
    endTime: start + duration,
    duration,
    metadata
  });

  return { result, duration };
}

/**
 * Synchronous timing wrapper
 */
export function withTimingSync<T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, unknown>
): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;

  measurements.push({
    name,
    startTime: start,
    endTime: start + duration,
    duration,
    metadata
  });

  return { result, duration };
}

/**
 * Calculate statistics from an array of numbers
 */
export function calculateStats(values: number[]): {
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  stdDev: number;
} {
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

/**
 * Get all measurements
 */
export function getMeasurements(): PerformanceMeasurement[] {
  return [...measurements];
}

/**
 * Get all benchmark results
 */
export function getBenchmarkResults(): BenchmarkResult[] {
  return [...benchmarkResults];
}

/**
 * Add a benchmark result
 */
export function addBenchmarkResult(result: BenchmarkResult): void {
  benchmarkResults.push(result);
}

/**
 * Clear all measurements
 */
export function clearMeasurements(): void {
  measurements.length = 0;
}

/**
 * Clear all benchmark results
 */
export function clearBenchmarkResults(): void {
  benchmarkResults.length = 0;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Generate a summary report of measurements
 */
export function generateMeasurementReport(): string {
  const grouped = new Map<string, number[]>();

  for (const m of measurements) {
    if (m.duration !== undefined) {
      const existing = grouped.get(m.name) || [];
      existing.push(m.duration);
      grouped.set(m.name, existing);
    }
  }

  let report = '=== Performance Measurement Report ===\n\n';

  for (const [name, durations] of grouped) {
    const stats = calculateStats(durations);
    report += `${name}:\n`;
    report += `  Count: ${durations.length}\n`;
    report += `  Min: ${formatDuration(stats.min)}\n`;
    report += `  Max: ${formatDuration(stats.max)}\n`;
    report += `  Mean: ${formatDuration(stats.mean)}\n`;
    report += `  Median: ${formatDuration(stats.median)}\n`;
    report += `  P95: ${formatDuration(stats.p95)}\n`;
    report += `  StdDev: ${formatDuration(stats.stdDev)}\n\n`;
  }

  return report;
}

// Browser-specific markers
export const browserMarkers = {
  mark(name: string): void {
    if (typeof window !== 'undefined' && window.performance?.mark) {
      window.performance.mark(name);
    }
  },

  measure(name: string, startMark: string, endMark?: string): void {
    if (typeof window !== 'undefined' && window.performance?.measure) {
      try {
        window.performance.measure(name, startMark, endMark);
      } catch (e) {
        // Mark may not exist
      }
    }
  },

  getMarks(): PerformanceEntry[] {
    if (typeof window !== 'undefined' && window.performance?.getEntriesByType) {
      return window.performance.getEntriesByType('mark');
    }
    return [];
  },

  getMeasures(): PerformanceEntry[] {
    if (typeof window !== 'undefined' && window.performance?.getEntriesByType) {
      return window.performance.getEntriesByType('measure');
    }
    return [];
  },

  clearMarks(): void {
    if (typeof window !== 'undefined' && window.performance?.clearMarks) {
      window.performance.clearMarks();
    }
  },

  clearMeasures(): void {
    if (typeof window !== 'undefined' && window.performance?.clearMeasures) {
      window.performance.clearMeasures();
    }
  }
};

// Console timing helpers (cross-environment)
export const consoleTimers = {
  start(label: string): void {
    console.time(label);
  },

  end(label: string): void {
    console.timeEnd(label);
  },

  log(label: string, ...args: unknown[]): void {
    console.timeLog(label, ...args);
  }
};

/**
 * API Instrumentation Wrapper
 * Wraps API handlers to automatically measure performance
 */

import { NextRequest, NextResponse } from 'next/server';

export interface APIPerformanceMetrics {
  route: string;
  method: string;
  totalDuration: number;
  phases: {
    name: string;
    duration: number;
    startOffset: number;
  }[];
  queryCount?: number;
  resultSize?: number;
  timestamp: string;
}

// Store for metrics (in production, this would go to a time-series database)
const metricsStore: APIPerformanceMetrics[] = [];

/**
 * Wraps an API handler with performance instrumentation
 */
export function withPerformanceTracking<T extends (...args: any[]) => Promise<NextResponse>>(
  route: string,
  handler: T
): T {
  const wrappedHandler = async (...args: Parameters<T>): Promise<NextResponse> => {
    const startTime = performance.now();
    const phases: APIPerformanceMetrics['phases'] = [];

    // Create a tracer object to pass to the handler
    const tracer = {
      startPhase: (name: string) => {
        const phaseStart = performance.now();
        return {
          end: () => {
            phases.push({
              name,
              duration: performance.now() - phaseStart,
              startOffset: phaseStart - startTime
            });
          }
        };
      }
    };

    try {
      // Get request method from first argument if it's a NextRequest
      const request = args[0] as NextRequest | undefined;
      const method = request?.method || 'UNKNOWN';

      // Call the original handler
      const response = await handler(...args);

      const totalDuration = performance.now() - startTime;

      // Extract response size if possible
      let resultSize: number | undefined;
      try {
        const clone = response.clone();
        const body = await clone.text();
        resultSize = body.length;
      } catch {
        // Can't clone response
      }

      const metrics: APIPerformanceMetrics = {
        route,
        method,
        totalDuration,
        phases,
        resultSize,
        timestamp: new Date().toISOString()
      };

      metricsStore.push(metrics);

      // Add performance headers to response
      const headers = new Headers(response.headers);
      headers.set('X-Response-Time', `${totalDuration.toFixed(2)}ms`);
      headers.set('X-Performance-Phases', JSON.stringify(phases.map(p => ({
        n: p.name,
        d: Math.round(p.duration)
      }))));

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (error) {
      const totalDuration = performance.now() - startTime;

      metricsStore.push({
        route,
        method: 'ERROR',
        totalDuration,
        phases,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  };

  return wrappedHandler as T;
}

/**
 * Get all collected metrics
 */
export function getAPIMetrics(): APIPerformanceMetrics[] {
  return [...metricsStore];
}

/**
 * Clear metrics store
 */
export function clearAPIMetrics(): void {
  metricsStore.length = 0;
}

/**
 * Get metrics summary for a specific route
 */
export function getRouteMetricsSummary(route: string): {
  route: string;
  requestCount: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  avgResponseSize: number;
  phaseBreakdown: Map<string, { avgDuration: number; count: number }>;
} | null {
  const routeMetrics = metricsStore.filter(m => m.route === route);

  if (routeMetrics.length === 0) return null;

  const durations = routeMetrics.map(m => m.totalDuration);
  const sortedDurations = [...durations].sort((a, b) => a - b);

  const responseSizes = routeMetrics
    .filter(m => m.resultSize !== undefined)
    .map(m => m.resultSize!);

  const phaseBreakdown = new Map<string, { totalDuration: number; count: number }>();

  for (const metric of routeMetrics) {
    for (const phase of metric.phases) {
      const existing = phaseBreakdown.get(phase.name) || { totalDuration: 0, count: 0 };
      existing.totalDuration += phase.duration;
      existing.count += 1;
      phaseBreakdown.set(phase.name, existing);
    }
  }

  const phaseAverages = new Map<string, { avgDuration: number; count: number }>();
  for (const [name, data] of phaseBreakdown) {
    phaseAverages.set(name, {
      avgDuration: data.totalDuration / data.count,
      count: data.count
    });
  }

  return {
    route,
    requestCount: routeMetrics.length,
    avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    minDuration: sortedDurations[0],
    maxDuration: sortedDurations[sortedDurations.length - 1],
    p95Duration: sortedDurations[Math.floor(sortedDurations.length * 0.95)] || sortedDurations[sortedDurations.length - 1],
    avgResponseSize: responseSizes.length > 0
      ? responseSizes.reduce((a, b) => a + b, 0) / responseSizes.length
      : 0,
    phaseBreakdown: phaseAverages
  };
}

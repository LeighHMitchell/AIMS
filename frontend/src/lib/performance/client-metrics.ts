/**
 * Client-side Performance Metrics
 * Instruments critical user flows in the browser
 */

export interface PageLoadMetrics {
  route: string;
  timestamp: string;
  timings: {
    navigationStart: number;
    domContentLoaded: number;
    loadComplete: number;
    firstPaint?: number;
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
    firstInputDelay?: number;
    cumulativeLayoutShift?: number;
    timeToInteractive?: number;
  };
  resourceTimings: {
    type: string;
    name: string;
    duration: number;
    size: number;
  }[];
  customMarks: {
    name: string;
    startTime: number;
  }[];
}

export interface InteractionMetrics {
  type: string;
  target: string;
  duration: number;
  timestamp: string;
}

// Storage for metrics
const pageLoadMetrics: PageLoadMetrics[] = [];
const interactionMetrics: InteractionMetrics[] = [];

// Current page tracking
let currentPageStart: number | null = null;
let currentRoute: string | null = null;

/**
 * Initialize performance monitoring for a page
 */
export function initPageMetrics(route: string): void {
  currentRoute = route;
  currentPageStart = performance.now();

  // Clear previous marks
  if (typeof window !== 'undefined' && window.performance) {
    try {
      window.performance.clearMarks();
      window.performance.clearMeasures();
    } catch {
      // Ignore errors
    }
  }

  // Set start mark
  mark('page-start');

  // Track Core Web Vitals
  observeWebVitals();
}

/**
 * Record a performance mark
 */
export function mark(name: string): void {
  if (typeof window !== 'undefined' && window.performance?.mark) {
    try {
      window.performance.mark(`aims-${name}`);
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Measure between two marks
 */
export function measure(name: string, startMark: string, endMark?: string): number | null {
  if (typeof window !== 'undefined' && window.performance?.measure) {
    try {
      const measureName = `aims-measure-${name}`;
      window.performance.measure(
        measureName,
        `aims-${startMark}`,
        endMark ? `aims-${endMark}` : undefined
      );

      const entries = window.performance.getEntriesByName(measureName);
      if (entries.length > 0) {
        return entries[entries.length - 1].duration;
      }
    } catch {
      // Marks may not exist
    }
  }
  return null;
}

/**
 * Observe Core Web Vitals
 */
function observeWebVitals(): void {
  if (typeof window === 'undefined' || !window.PerformanceObserver) return;

  // Largest Contentful Paint
  try {
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
      if (lastEntry) {
        mark(`lcp-${lastEntry.startTime.toFixed(0)}`);
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // Not supported
  }

  // First Input Delay
  try {
    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      for (const entry of entries) {
        const fidEntry = entry as PerformanceEntry & { processingStart: number; startTime: number };
        const fid = fidEntry.processingStart - fidEntry.startTime;
        mark(`fid-${fid.toFixed(0)}`);
      }
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch {
    // Not supported
  }

  // Cumulative Layout Shift
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const clsEntry = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
        if (!clsEntry.hadRecentInput) {
          clsValue += clsEntry.value;
        }
      }
      mark(`cls-${clsValue.toFixed(3)}`);
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // Not supported
  }
}

/**
 * Finalize page metrics collection
 */
export function finalizePageMetrics(): PageLoadMetrics | null {
  if (typeof window === 'undefined' || !currentRoute) return null;

  const timing = window.performance?.timing;
  const navigation = window.performance?.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;

  // Get paint timings
  const paintEntries = window.performance?.getEntriesByType('paint') || [];
  const firstPaint = paintEntries.find(e => e.name === 'first-paint')?.startTime;
  const firstContentfulPaint = paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime;

  // Get custom marks
  const customMarks = window.performance?.getEntriesByType('mark')
    .filter(e => e.name.startsWith('aims-'))
    .map(e => ({ name: e.name.replace('aims-', ''), startTime: e.startTime })) || [];

  // Get resource timings
  const resourceTimings = (window.performance?.getEntriesByType('resource') || [])
    .slice(0, 50) // Limit to 50 resources
    .map(e => {
      const entry = e as PerformanceResourceTiming;
      return {
        type: entry.initiatorType,
        name: entry.name.split('/').pop() || entry.name,
        duration: entry.duration,
        size: entry.transferSize || 0
      };
    });

  const metrics: PageLoadMetrics = {
    route: currentRoute,
    timestamp: new Date().toISOString(),
    timings: {
      navigationStart: navigation?.startTime || 0,
      domContentLoaded: navigation?.domContentLoadedEventEnd || (timing?.domContentLoadedEventEnd - timing?.navigationStart) || 0,
      loadComplete: navigation?.loadEventEnd || (timing?.loadEventEnd - timing?.navigationStart) || 0,
      firstPaint,
      firstContentfulPaint
    },
    resourceTimings,
    customMarks
  };

  pageLoadMetrics.push(metrics);

  return metrics;
}

/**
 * Track user interaction
 */
export function trackInteraction(type: string, target: string): () => void {
  const start = performance.now();

  return () => {
    const duration = performance.now() - start;
    interactionMetrics.push({
      type,
      target,
      duration,
      timestamp: new Date().toISOString()
    });

    // Console log for debugging
    if (duration > 100) {
      console.log(`[Perf] Slow interaction: ${type} on ${target} took ${duration.toFixed(0)}ms`);
    }
  };
}

/**
 * Track API call from client
 */
export function trackAPICall(endpoint: string): () => { duration: number } {
  const start = performance.now();

  return () => {
    const duration = performance.now() - start;

    // Log slow API calls
    if (duration > 500) {
      console.warn(`[Perf] Slow API call: ${endpoint} took ${duration.toFixed(0)}ms`);
    }

    return { duration };
  };
}

/**
 * Get all page load metrics
 */
export function getPageLoadMetrics(): PageLoadMetrics[] {
  return [...pageLoadMetrics];
}

/**
 * Get all interaction metrics
 */
export function getInteractionMetrics(): InteractionMetrics[] {
  return [...interactionMetrics];
}

/**
 * Clear all metrics
 */
export function clearClientMetrics(): void {
  pageLoadMetrics.length = 0;
  interactionMetrics.length = 0;
}

/**
 * Generate console.time based instrumentation
 */
export const timeLog = {
  start: (label: string) => {
    if (typeof console !== 'undefined') {
      console.time(`[AIMS Perf] ${label}`);
    }
  },

  end: (label: string) => {
    if (typeof console !== 'undefined') {
      console.timeEnd(`[AIMS Perf] ${label}`);
    }
  },

  log: (label: string, ...args: unknown[]) => {
    if (typeof console !== 'undefined' && console.timeLog) {
      console.timeLog(`[AIMS Perf] ${label}`, ...args);
    }
  }
};

/**
 * Performance decorator for React hooks
 */
export function usePerformanceMarker(name: string): void {
  if (typeof window !== 'undefined') {
    mark(`${name}-render`);
  }
}

/**
 * Utility to log all performance entries to console
 */
export function dumpPerformanceEntries(): void {
  if (typeof window === 'undefined' || !window.performance) return;

  console.group('📊 Performance Entries');

  console.log('Navigation:');
  console.table(window.performance.getEntriesByType('navigation'));

  console.log('Marks:');
  console.table(window.performance.getEntriesByType('mark'));

  console.log('Measures:');
  console.table(window.performance.getEntriesByType('measure'));

  console.log('Resources (top 20 by duration):');
  const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const sortedResources = resources
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 20)
    .map(r => ({
      name: r.name.split('/').pop(),
      type: r.initiatorType,
      duration: `${r.duration.toFixed(0)}ms`,
      size: `${(r.transferSize / 1024).toFixed(1)}KB`
    }));
  console.table(sortedResources);

  console.groupEnd();
}

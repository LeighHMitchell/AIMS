/**
 * Shared utility functions for chart components
 * Centralizes formatting and styling for visual consistency
 */

/**
 * Format currency in compact notation (e.g., $1.2M, $500K)
 */
export function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1_000_000_000) {
    return `${sign}$${(absValue / 1_000_000_000).toFixed(1)}B`;
  } else if (absValue >= 1_000_000) {
    return `${sign}$${(absValue / 1_000_000).toFixed(1)}M`;
  } else if (absValue >= 1_000) {
    return `${sign}$${(absValue / 1_000).toFixed(1)}K`;
  }
  return `${sign}$${absValue.toFixed(0)}`;
}

/**
 * Format currency with full number (e.g., $1,234,567)
 */
export function formatCurrencyFull(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  return `${sign}$${absValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Format currency with USD suffix (e.g., 1.2M USD)
 */
export function formatCurrencyUSD(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1_000_000_000) {
    return `${sign}${(absValue / 1_000_000_000).toFixed(1)}B USD`;
  } else if (absValue >= 1_000_000) {
    return `${sign}${(absValue / 1_000_000).toFixed(1)}M USD`;
  } else if (absValue >= 1_000) {
    return `${sign}${(absValue / 1_000).toFixed(1)}K USD`;
  }
  return `${sign}${absValue.toFixed(0)} USD`;
}

/**
 * Format percentage from value and total
 */
export function formatPercent(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

/**
 * Standard chart configuration values
 */
export const CHART_CONFIG = {
  // Standard chart height in pixels
  height: 280,
  
  // Standard dropdown width
  dropdownWidth: "w-[160px]",
  
  // Standard font sizes
  fontSize: {
    axis: 11,
    label: 10,
    tooltip: 12,
  },
  
  // Standard margins
  margins: {
    top: 20,
    right: 20,
    left: 20,
    bottom: 20,
  },
  
  // Standard bar settings
  bar: {
    radius: [4, 4, 0, 0] as [number, number, number, number],
    maxBarSize: 60,
  },
  
  // Standard pie settings
  pie: {
    innerRadius: 40,
    outerRadius: 75,
  },
} as const;

/**
 * Standard tooltip class names
 */
export const TOOLTIP_CLASSES = "bg-white p-3 border border-slate-200 rounded-lg shadow-lg";

/**
 * Standard empty state class names
 */
export const EMPTY_STATE_CLASSES = "h-[280px] flex items-center justify-center text-muted-foreground";

/**
 * Utility functions for Financial Completeness Check
 */

export type Severity = 'mild' | 'moderate' | 'severe';

export interface FinancialCompletenessMetrics {
  overspendUsd: number;
  percentageSpent: number;
  severity: Severity | null;  // null when not overspending (< 100%)
}

/**
 * Calculate the overspend amount (disbursed - budgeted)
 */
export function calculateOverspend(disbursed: number, budgeted: number): number {
  return disbursed - budgeted;
}

/**
 * Calculate percentage spent (disbursed / budgeted * 100)
 * Returns Infinity if budgeted is 0 but disbursed > 0
 */
export function calculatePercentageSpent(disbursed: number, budgeted: number): number {
  if (budgeted === 0) {
    return disbursed > 0 ? Infinity : 0;
  }
  return (disbursed / budgeted) * 100;
}

/**
 * Determine severity level based on percentage spent
 * - null: <100% (not overspending)
 * - mild: 100-150% (overspent but not dramatically)
 * - moderate: 150-200% (significant overspend)
 * - severe: >200% (critical overspend)
 */
export function getSeverity(percentageSpent: number): Severity | null {
  // Not overspending - return null to indicate no severity issue
  if (percentageSpent < 100) return null;
  if (percentageSpent < 150) return 'mild';
  if (percentageSpent < 200) return 'moderate';
  return 'severe';
}

/**
 * Get the color associated with a severity level
 * Returns green for null (no overspending), slate-400 for unknown
 */
export function getSeverityColor(severity: Severity | null): string {
  switch (severity) {
    case null:
      return '#22c55e'; // green-500 - no overspending issue
    case 'mild':
      return '#fbbf24'; // amber-400
    case 'moderate':
      return '#f97316'; // orange-500
    case 'severe':
      return '#ef4444'; // red-500
    default:
      return '#94a3b8'; // slate-400
  }
}

/**
 * Get severity color directly from percentage
 * Returns green for < 100%, amber for mild, orange for moderate, red for severe
 */
export function getSeverityColorFromPercentage(percentageSpent: number): string {
  const severity = getSeverity(percentageSpent);
  return getSeverityColor(severity);
}

/**
 * Format currency in compact form for chart axes
 * e.g., $1.5M, $500K, $1.2B
 */
export function formatCurrencyCompact(value: number): string {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return '$0';
  }
  
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1e9) {
    return `${sign}$${(absValue / 1e9).toFixed(1)}B`;
  }
  if (absValue >= 1e6) {
    return `${sign}$${(absValue / 1e6).toFixed(1)}M`;
  }
  if (absValue >= 1e3) {
    return `${sign}$${(absValue / 1e3).toFixed(0)}K`;
  }
  return `${sign}$${absValue.toFixed(0)}`;
}

/**
 * Format currency with full precision for tooltips and tables
 * e.g., $1,234,567.89
 */
export function formatCurrencyFull(value: number): string {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return '$0.00';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  if (value === Infinity || value >= 999) {
    return '>999%';
  }
  return `${value.toFixed(1)}%`;
}

/**
 * Calculate all financial completeness metrics for an activity
 */
export function calculateMetrics(disbursed: number, budgeted: number): FinancialCompletenessMetrics {
  const overspendUsd = calculateOverspend(disbursed, budgeted);
  const percentageSpent = calculatePercentageSpent(disbursed, budgeted);
  const severity = getSeverity(percentageSpent);
  
  return {
    overspendUsd,
    percentageSpent,
    severity
  };
}







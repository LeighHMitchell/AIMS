/**
 * Centralized color palette for all charts in the application
 * Deep dark blues and slate tones for a professional, cohesive look
 */

// Primary color palette - Deep blues and slates
export const CHART_COLORS = {
  // Primary blues (darkest to lighter)
  primary: {
    darkest: '#0F172A',   // slate-900 - Darkest blue-black
    darker: '#1E293B',    // slate-800 - Deep navy
    dark: '#334155',      // slate-700 - Dark slate blue
    medium: '#475569',    // slate-600 - Medium slate
    light: '#64748B',     // slate-500 - Light slate
    lighter: '#94A3B8',   // slate-400 - Lighter slate
  },

  // Accent colors - Deep blues with variety
  accent: {
    navy: '#1E3A8A',      // blue-900 - Deep navy blue
    royal: '#1D4ED8',     // blue-700 - Royal blue
    sky: '#2563EB',       // blue-600 - Sky blue
    cyan: '#0891B2',      // cyan-600 - Deep cyan
    teal: '#0F766E',      // teal-700 - Deep teal
    indigo: '#4338CA',    // indigo-700 - Deep indigo
  },

  // Semantic colors (status-related)
  semantic: {
    success: '#0F766E',   // teal-700 - Success/positive
    warning: '#B45309',   // amber-700 - Warning
    danger: '#991B1B',    // red-800 - Danger/error
    info: '#1D4ED8',      // blue-700 - Information
  }
}

// Chart-specific color arrays for multi-series data
export const CHART_COLOR_PALETTE = [
  CHART_COLORS.primary.darkest,   // #0F172A
  CHART_COLORS.accent.navy,       // #1E3A8A
  CHART_COLORS.primary.dark,      // #334155
  CHART_COLORS.accent.royal,      // #1D4ED8
  CHART_COLORS.primary.medium,    // #475569
  CHART_COLORS.accent.sky,        // #2563EB
  CHART_COLORS.accent.cyan,       // #0891B2
  CHART_COLORS.accent.teal,       // #0F766E
  CHART_COLORS.primary.light,     // #64748B
  CHART_COLORS.accent.indigo,     // #4338CA
  CHART_COLORS.primary.lighter,   // #94A3B8
] as const

// Specific color assignments for common data types
export const DATA_COLORS = {
  budget: CHART_COLORS.accent.navy,          // #1E3A8A - Navy for budget/commitments
  disbursements: CHART_COLORS.accent.sky,    // #2563EB - Sky blue for disbursements
  expenditures: CHART_COLORS.accent.cyan,    // #0891B2 - Cyan for expenditures
  actual: CHART_COLORS.accent.royal,         // #1D4ED8 - Royal blue for actual values
  planned: CHART_COLORS.primary.light,       // #64748B - Light slate for planned values
  totalSpending: CHART_COLORS.primary.darkest, // #0F172A - Darkest for totals
  commitments: CHART_COLORS.accent.indigo,   // #4338CA - Indigo for commitments

  // Organization types
  government: CHART_COLORS.accent.navy,      // #1E3A8A
  ngo: CHART_COLORS.accent.royal,            // #1D4ED8
  multilateral: CHART_COLORS.accent.cyan,    // #0891B2
  private: CHART_COLORS.primary.dark,        // #334155

  // Transaction types
  incoming: CHART_COLORS.accent.teal,        // #0F766E
  outgoing: CHART_COLORS.accent.royal,       // #1D4ED8
}

// Gradient definitions for area charts
export const CHART_GRADIENTS = {
  budget: {
    start: CHART_COLORS.accent.navy,
    end: `${CHART_COLORS.accent.navy}20`, // 20 = 12.5% opacity
  },
  disbursements: {
    start: CHART_COLORS.accent.sky,
    end: `${CHART_COLORS.accent.sky}20`,
  },
  expenditures: {
    start: CHART_COLORS.accent.cyan,
    end: `${CHART_COLORS.accent.cyan}20`,
  },
}

// Hover/interaction states
export const INTERACTION_COLORS = {
  hover: CHART_COLORS.accent.royal,          // #1D4ED8
  selected: CHART_COLORS.accent.sky,         // #2563EB
  disabled: CHART_COLORS.primary.lighter,    // #94A3B8
}

// Grid and axis colors
export const CHART_STRUCTURE_COLORS = {
  grid: '#E2E8F0',           // slate-200 - Light grid lines
  axis: CHART_COLORS.primary.medium,   // #475569 - Axis lines and labels
  background: '#FFFFFF',     // White background
  tooltipBg: CHART_COLORS.primary.darkest,  // #0F172A - Dark tooltip
  tooltipText: '#FFFFFF',    // White text in tooltips
}

// Helper function to get color by index
export function getChartColor(index: number): string {
  return CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length]
}

// Helper function to get a lighter version of a color (for hover states)
export function getLighterColor(color: string, amount: number = 20): string {
  return `${color}${amount.toString(16).padStart(2, '0')}`
}

/**
 * Centralized color palette for all charts in the application
 * Color palette: Primary Scarlet, Pale Slate, Blue Slate, Cool Steel, Platinum
 */

// Primary color palette
export const CHART_COLORS = {
  // Primary palette colors
  primary: {
    scarlet: '#dc2625',   // Primary Scarlet - main accent color
    blueSlate: '#4c5568', // Blue Slate - dark secondary
    coolSteel: '#7b95a7', // Cool Steel - medium secondary
    paleSlate: '#cfd0d5', // Pale Slate - light gray
    platinum: '#f1f4f8',  // Platinum - off-white/background
    // Legacy mappings for compatibility
    darkest: '#4c5568',   // Blue Slate
    darker: '#4c5568',    // Blue Slate
    dark: '#4c5568',      // Blue Slate
    medium: '#7b95a7',    // Cool Steel
    light: '#cfd0d5',     // Pale Slate
    lighter: '#f1f4f8',   // Platinum
  },

  // Accent colors mapped to palette
  accent: {
    navy: '#4c5568',      // Blue Slate
    royal: '#dc2625',     // Primary Scarlet
    sky: '#7b95a7',       // Cool Steel
    cyan: '#7b95a7',      // Cool Steel
    teal: '#4c5568',      // Blue Slate
    indigo: '#4c5568',    // Blue Slate
  },

  // Semantic colors (status-related)
  semantic: {
    success: '#4c5568',   // Blue Slate
    warning: '#dc2625',   // Primary Scarlet
    danger: '#dc2625',    // Primary Scarlet
    info: '#7b95a7',      // Cool Steel
  }
}

// Chart-specific color arrays for multi-series data
// Primary Scarlet, Blue Slate, Cool Steel, Pale Slate, Platinum
export const CHART_COLOR_PALETTE = [
  '#dc2625',  // Primary Scarlet
  '#4c5568',  // Blue Slate
  '#7b95a7',  // Cool Steel
  '#cfd0d5',  // Pale Slate
  '#f1f4f8',  // Platinum
] as const

// Specific color assignments for common data types
export const DATA_COLORS = {
  budget: '#dc2625',          // Primary Scarlet - for budget
  disbursements: '#4c5568',   // Blue Slate - for disbursements
  expenditures: '#7b95a7',    // Cool Steel - for expenditures
  actual: '#4c5568',          // Blue Slate - for actual values
  planned: '#cfd0d5',         // Pale Slate - for planned values
  totalSpending: '#dc2625',   // Primary Scarlet - for totals
  commitments: '#7b95a7',     // Cool Steel - for commitments

  // Organization types
  government: '#dc2625',      // Primary Scarlet
  ngo: '#4c5568',             // Blue Slate
  multilateral: '#7b95a7',    // Cool Steel
  private: '#cfd0d5',         // Pale Slate

  // Transaction types
  incoming: '#dc2625',        // Primary Scarlet
  outgoing: '#4c5568',        // Blue Slate
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

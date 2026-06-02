/**
 * Centralized color palette for all charts in the application.
 *
 * Financial-series coloring (IATI transaction types, Budget, Planned
 * Disbursement, Commitment, Total Spending) is a SINGLE SOURCE OF TRUTH.
 * Every chart / table / legend / badge / tooltip across the Analytics
 * Dashboard, Profile pages, Org profile pages and Activity profile pages
 * MUST resolve these colors through this module — never a local palette,
 * hardcoded hex, or recharts default. This is what kills the
 * "same series, different color on a different page" bug.
 */

// Primary brand color palette (structural / non-financial use)
export const CHART_COLORS = {
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

  accent: {
    navy: '#4c5568',      // Blue Slate
    royal: '#dc2625',     // Primary Scarlet
    sky: '#7b95a7',       // Cool Steel
    cyan: '#7b95a7',      // Cool Steel
    teal: '#4c5568',      // Blue Slate
    indigo: '#4c5568',    // Blue Slate
  },

  semantic: {
    success: '#4c5568',   // Blue Slate
    warning: '#dc2625',   // Primary Scarlet
    danger: '#dc2625',    // Primary Scarlet
    info: '#7b95a7',      // Cool Steel
  }
}

// Generic multi-series palette (use ONLY for non-financial categorical data
// that has no canonical color — e.g. ad-hoc breakdowns). Financial series
// MUST use the resolvers below instead.
export const CHART_COLOR_PALETTE = [
  '#dc2625',  // Primary Scarlet
  '#4c5568',  // Blue Slate
  '#7b95a7',  // Cool Steel
  '#cfd0d5',  // Pale Slate
  '#f1f4f8',  // Platinum
] as const

// Monochromatic slate ramp for ranked / share-of-whole charts where the
// only visual signal needed is "darker = higher". Used for things like
// Top 10 rankings and sector pies. Use OTHERS_COLOR for any "All Others".
export const CHART_RANKED_PALETTE = [
  '#334155',  // slate-700
  '#475569',  // slate-600
  '#64748b',  // slate-500
  '#94a3b8',  // slate-400
  '#cbd5e1',  // slate-300
  '#e2e8f0',  // slate-200
  '#f1f5f9',  // slate-100
] as const

export const OTHERS_COLOR = '#94a3b8'  // slate-400 — "All Others" bucket

// Economist-style extended palette for high-cardinality categorical breakdowns
// (e.g. ~20+ DAC sectors on the Aid Distribution by Sector chart). Anchored on
// the same Economist hues used by FinancialTotalsBarChart and the transaction-
// type palette so this stays brand-coherent; tonal variants extend it to 20
// visually distinct colors.
export const ECONOMIST_EXTENDED_PALETTE = [
  '#db444b', // red (anchor — disbursement)
  '#006ba2', // blue (anchor — budget)
  '#ebb434', // yellow (anchor — planned disbursement)
  '#379a8b', // teal (anchor — commitment)
  '#9a607f', // purple (anchor — expenditure)
  '#3ebcd2', // cyan (anchor — incoming funds)
  '#b4ba39', // olive
  '#d1b07c', // gold/tan
  '#758d99', // grey
  '#a81829', // deep red
  '#1a4f75', // deep blue
  '#b48420', // deep yellow
  '#266d62', // deep teal
  '#78405f', // deep purple
  '#00788d', // deep cyan
  '#818a00', // dark olive
  '#e88087', // soft red
  '#4d94c2', // soft blue
  '#65b6a8', // soft teal
  '#b889a4', // soft purple
] as const

/**
 * Resolve a color for the Nth slice of a high-cardinality sector chart.
 * Wraps `ECONOMIST_EXTENDED_PALETTE` so charts with more than 20 slices keep
 * cycling rather than crash.
 */
export function getSectorColor(index: number): string {
  return ECONOMIST_EXTENDED_PALETTE[((index % ECONOMIST_EXTENDED_PALETTE.length) + ECONOMIST_EXTENDED_PALETTE.length) % ECONOMIST_EXTENDED_PALETTE.length]
}

// ---------------------------------------------------------------------------
// FINANCIAL SERIES COLORS — SINGLE SOURCE OF TRUTH
//
// Strategy: THE ECONOMIST data-visualisation palette (per the user-supplied
// Economist chart-colour spec). The nine Economist "MAIN" hues — red, blue,
// cyan, green, yellow, olive, purple, gold, grey — are assigned to the most
// commonly co-charted series so they are maximally distinct; rarer
// transaction types use darker/lighter steps from The Economist's
// equal-lightness scales, so the whole system stays on-brand-Economist.
// Economist convention: red is the emphasis colour → reserved for the
// headline actual-spend metric (Disbursement). Blue (the Economist
// workhorse) anchors Budget.
//
//   1  Incoming Funds        cyan        #3ebcd2  (Economist MAIN)
//   2  Outgoing Commitment   green/teal  #379a8b  (Economist MAIN)
//   3  Disbursement          red         #db444b  (Economist MAIN — hero)
//   4  Expenditure           purple      #9a607f  (Economist MAIN)
//   5  Interest Payment      gold/tan    #d1b07c  (Economist MAIN)
//   6  Loan Repayment        grey        #758d99  (Economist MAIN)
//   7  Reimbursement         deep red    #a81829  (Economist scale)
//   8  Purchase of Equity    deep purple #78405f  (Economist scale)
//   9  Sale of Equity        deep cyan   #00788d  (Economist scale)
//   10 Credit Guarantee      dark olive  #818a00  (Economist scale)
//   11 Incoming Commitment   olive       #b4ba39  (Economist MAIN)
//   12 Outgoing Pledge       light steel #89a2ae  (Economist scale)
//   13 Incoming Pledge       mid blue    #3d89c3  (Economist scale)
//   --  Budget               blue        #006ba2  (Economist MAIN)
//   --  Planned Disbursement yellow      #ebb434  (Economist MAIN)
//   --  Total Spending       dark grey   #3f5661  (Economist scale)
// ---------------------------------------------------------------------------

export const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  '1':  '#3ebcd2', // Incoming Funds — Economist cyan
  '2':  '#379a8b', // Outgoing Commitment — Economist green/teal
  '3':  '#db444b', // Disbursement — Economist red (hero)
  '4':  '#9a607f', // Expenditure — Economist purple
  '5':  '#d1b07c', // Interest Payment — Economist gold/tan
  '6':  '#758d99', // Loan Repayment — Economist grey
  '7':  '#a81829', // Reimbursement — Economist deep red
  '8':  '#78405f', // Purchase of Equity — Economist deep purple
  '9':  '#00788d', // Sale of Equity — Economist deep cyan
  '10': '#818a00', // Credit Guarantee — Economist dark olive
  '11': '#b4ba39', // Incoming Commitment — Economist olive
  '12': '#89a2ae', // Outgoing Pledge — Economist light steel
  '13': '#3d89c3', // Incoming Pledge — Economist mid blue
}

// Non-transaction financial series (planned/aggregate views)
export const BUDGET_COLOR = '#006ba2'               // Economist blue (MAIN) — anchor
export const PLANNED_DISBURSEMENT_COLOR = '#ebb434' // Economist yellow (MAIN)
export const TOTAL_SPENDING_COLOR = '#3f5661'       // Economist dark grey — aggregate total
export const PERFECT_SPEND_COLOR = '#a4bdc9'        // Economist light steel — reference/guide line

// Human-readable IATI transaction type labels (codes 1–13)
export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  '1': 'Incoming Funds',
  '2': 'Outgoing Commitment',
  '3': 'Disbursement',
  '4': 'Expenditure',
  '5': 'Interest Payment',
  '6': 'Loan Repayment',
  '7': 'Reimbursement',
  '8': 'Purchase of Equity',
  '9': 'Sale of Equity',
  '10': 'Credit Guarantee',
  '11': 'Incoming Commitment',
  '12': 'Outgoing Pledge',
  '13': 'Incoming Pledge',
}

/**
 * Authoritative color for an IATI transaction type code (1–13).
 * Falls back to the neutral "others" slate for unknown/empty codes so charts
 * never crash on dirty data. Use this everywhere instead of local palettes.
 */
export function getTransactionTypeColor(
  code: string | number | null | undefined,
  // Legacy 2nd arg (series index). The palette is now fully deterministic per
  // IATI code, so index is intentionally ignored — kept only so existing
  // getTransactionTypeColor(type, index) call sites stay valid.
  _index?: number,
): string {
  if (code === null || code === undefined) return OTHERS_COLOR
  return TRANSACTION_TYPE_COLORS[String(code)] ?? OTHERS_COLOR
}

/**
 * Authoritative color for a named financial series. Resolves any human
 * series label ("Budget", "Planned Disbursements", "Cumulative
 * Disbursements", "Commitments", "Expenditure", "Total Spending",
 * "Perfect spend trajectory", …) to the SAME color the equivalent IATI
 * transaction type uses, so a "Disbursement" bar and a transaction-type-3
 * slice are always the same color across every chart.
 *
 * Order of checks is significant — most specific phrases first.
 */
export function getFinancialSeriesColor(rawName: string | null | undefined): string {
  if (!rawName) return OTHERS_COLOR
  const n = String(rawName).toLowerCase().trim()

  if (n.includes('planned disbursement')) return PLANNED_DISBURSEMENT_COLOR
  if (n.includes('budget')) return BUDGET_COLOR

  if (n.includes('incoming commitment')) return TRANSACTION_TYPE_COLORS['11']
  if (n.includes('incoming pledge')) return TRANSACTION_TYPE_COLORS['13']
  if (n.includes('incoming fund') || n.includes('incoming')) return TRANSACTION_TYPE_COLORS['1']
  if (n.includes('outgoing pledge')) return TRANSACTION_TYPE_COLORS['12']
  if (n.includes('outgoing commitment') || n.includes('commitment')) return TRANSACTION_TYPE_COLORS['2']

  if (n.includes('expenditure')) return TRANSACTION_TYPE_COLORS['4']
  if (n.includes('disbursement') || n.includes('disbursed')) return TRANSACTION_TYPE_COLORS['3']

  if (n.includes('interest')) return TRANSACTION_TYPE_COLORS['5']
  if (n.includes('loan repayment') || n.includes('repayment')) return TRANSACTION_TYPE_COLORS['6']
  if (n.includes('reimbursement')) return TRANSACTION_TYPE_COLORS['7']
  if (n.includes('purchase of equity')) return TRANSACTION_TYPE_COLORS['8']
  if (n.includes('sale of equity')) return TRANSACTION_TYPE_COLORS['9']
  if (n.includes('equity')) return TRANSACTION_TYPE_COLORS['8']
  if (n.includes('guarantee')) return TRANSACTION_TYPE_COLORS['10']

  if (n.includes('perfect spend') || n.includes('trajectory') ||
      n.includes('expected') || n.includes('target')) return PERFECT_SPEND_COLOR
  if (n.includes('total spend') || n.includes('total spending') || n === 'total') {
    return TOTAL_SPENDING_COLOR
  }

  return OTHERS_COLOR
}

// Specific color assignments for common data types. Financial keys delegate
// to the resolvers above so there is exactly one place a color is defined.
export const DATA_COLORS = {
  budget: BUDGET_COLOR,                       // Budget — blue-slate (brand)
  disbursements: TRANSACTION_TYPE_COLORS['3'], // Disbursement — scarlet
  expenditures: TRANSACTION_TYPE_COLORS['4'],  // Expenditure — orange
  actual: TRANSACTION_TYPE_COLORS['3'],        // Actual ≈ disbursement — scarlet
  planned: PLANNED_DISBURSEMENT_COLOR,         // Planned Disbursement — gold
  totalSpending: TOTAL_SPENDING_COLOR,         // Total Spending — slate-900
  commitments: TRANSACTION_TYPE_COLORS['2'],   // Commitment — teal

  // Organization types (non-financial categorical — kept brand-cohesive)
  government: '#dc2625',      // Primary Scarlet
  ngo: '#4c5568',             // Blue Slate
  multilateral: '#7b95a7',    // Cool Steel
  private: '#cfd0d5',         // Pale Slate

  // Transaction direction
  incoming: TRANSACTION_TYPE_COLORS['1'],      // Incoming Funds — blue
  outgoing: TRANSACTION_TYPE_COLORS['2'],      // Outgoing Commitment — teal
}

// Gradient definitions for area charts
export const CHART_GRADIENTS = {
  budget: {
    start: BUDGET_COLOR,
    end: `${BUDGET_COLOR}20`, // 20 = 12.5% opacity
  },
  disbursements: {
    start: TRANSACTION_TYPE_COLORS['3'],
    end: `${TRANSACTION_TYPE_COLORS['3']}20`,
  },
  expenditures: {
    start: TRANSACTION_TYPE_COLORS['4'],
    end: `${TRANSACTION_TYPE_COLORS['4']}20`,
  },
}

// Hover/interaction states
export const INTERACTION_COLORS = {
  hover: CHART_COLORS.accent.royal,
  selected: CHART_COLORS.accent.sky,
  disabled: CHART_COLORS.primary.lighter,
}

// Grid and axis colors
export const CHART_STRUCTURE_COLORS = {
  grid: '#E2E8F0',           // slate-200 - Light grid lines
  axis: CHART_COLORS.primary.medium,   // Axis lines and labels
  background: '#FFFFFF',     // White background
  tooltipBg: CHART_COLORS.primary.darkest,  // Dark tooltip
  tooltipText: '#FFFFFF',    // White text in tooltips
}

// Helper function to get color by index (non-financial categorical only)
export function getChartColor(index: number): string {
  return CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length]
}

// Helper function to get a lighter version of a color (for hover states)
export function getLighterColor(color: string, amount: number = 20): string {
  return `${color}${amount.toString(16).padStart(2, '0')}`
}

/**
 * Excel-style "color scale" background for table conditional formatting.
 *
 * A single-hue intensity ramp (darker = larger) expressed as an *alpha tint of
 * one hue* over the cell's own background — deliberately NOT an opaque color.
 * Because the tint is semi-transparent over the theme-aware cell background, it
 * adapts to light AND dark mode with no branching, and the (also theme-aware)
 * foreground text stays legible since alpha is capped well below opaque.
 *
 * @param t normalized position in [0, 1] — 0 = column minimum, 1 = column maximum.
 * @returns an `hsl(... / a)` string, or `'transparent'` for out-of-range input.
 */
export function getColorScaleBackground(t: number): string {
  if (!Number.isFinite(t)) return 'transparent'
  const clamped = Math.max(0, Math.min(1, t))
  // 0.05 floor keeps the smallest value faintly tinted so the scale reads as a
  // continuous ramp rather than "blank → colored"; 0.42 ceiling preserves the
  // text-to-background contrast needed for readability in both themes.
  const alpha = 0.05 + clamped * 0.37
  // Blue (≈ tailwind blue-600) — a neutral "magnitude" hue that doesn't imply
  // the good/bad judgement a red↔green scale would.
  return `hsl(217 91% 50% / ${alpha.toFixed(3)})`
}

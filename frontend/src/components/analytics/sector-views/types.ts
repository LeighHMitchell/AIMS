export type SectorLevel = 'category' | 'sector' | 'subsector'

export type SectorView = 'pie' | 'bar' | 'sunburst' | 'sankey'

// Per-year metrics returned by /api/analytics/disbursements-by-sector.
// `actual` is a back-compat alias of `tx_3`.
export interface ApiSectorYear {
  year: number
  label: string
  planned: number
  actual: number
  budgets: number
  tx_1: number
  tx_2: number
  tx_3: number
  tx_4: number
  tx_5: number
  tx_6: number
  tx_7: number
  tx_8: number
  tx_9: number
  tx_10: number
  tx_11: number
  tx_12: number
  tx_13: number
}

// Shape returned by /api/analytics/disbursements-by-sector
export interface ApiSector {
  sectorCode: string
  sectorName: string
  groupCode: string
  groupName: string
  categoryCode: string
  categoryName: string
  years: ApiSectorYear[]
}

// Distinct-activity counts keyed by code, one map per hierarchy level.
export interface SectorActivityCounts {
  byGroup: Record<string, number>
  byCategory: Record<string, number>
  bySector: Record<string, number>
}

// One slice / bar / segment in the active view, aggregated to the chosen level.
export interface SectorSlice {
  code: string
  name: string
  // Sum across the user-selected metrics — drives pie / sunburst / sankey size.
  value: number
  // Per-metric summed values (keyed by Metric, e.g. 'budgets', 'tx_3') — drives
  // the grouped bars in the bar view.
  metrics: Record<string, number>
  // Distinct activities linked to this code at the current level.
  activityCount: number
  // Hierarchy ancestors retained so sunburst/sankey can group without re-fetching.
  groupCode: string
  groupName: string
  categoryCode: string
  categoryName: string
  color: string
}

// Hierarchical row used to feed Nivo Sunburst / Sankey, derived from ApiSector[].
export interface HierarchyRow {
  groupCode: string
  groupName: string
  categoryCode: string
  categoryName: string
  sectorCode: string
  sectorName: string
  // Sum across selected metrics.
  value: number
  // Per-metric summed values.
  metrics: Record<string, number>
}

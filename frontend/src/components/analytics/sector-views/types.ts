export type SectorLevel = 'category' | 'sector' | 'subsector'

export type SectorView = 'pie' | 'bar' | 'sunburst' | 'sankey'

// Shape returned by /api/analytics/disbursements-by-sector
export interface ApiSector {
  sectorCode: string
  sectorName: string
  groupCode: string
  groupName: string
  categoryCode: string
  categoryName: string
  years: Array<{
    year: number
    label: string
    planned: number
    actual: number
  }>
}

// One slice / bar / segment in the active view, aggregated to the chosen level.
export interface SectorSlice {
  code: string
  name: string
  value: number
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
  value: number
}

/**
 * Coordination Analytics Types
 * Types for the "Aid Distribution by Sector" circle-pack visualisation.
 */

// Retained for backwards compatibility with the legacy small-card on the
// analytics dashboard (CoordinationCirclePack still accepts a `view` prop).
export type CoordinationView = 'sectors' | 'organizations';

// Which level of the DAC sector hierarchy we aggregate to.
//   category   → DAC 3-digit group     (e.g. "110 Education")
//   sector     → DAC 3-digit category  (e.g. "111 Education, Level Unspecified")
//   subSector  → DAC 5-digit purpose   (e.g. "11110 Education policy")
export type CoordinationLevel = 'category' | 'sector' | 'subSector';

// Selectable metrics. Transaction codes map 1:1 to IATI transaction types.
// `activities` and `donors` are count metrics; `avgSize` is dollars per activity.
export type CoordinationMeasure =
  | 'budgets'
  | 'planned'
  | 'tx_1' | 'tx_2' | 'tx_3' | 'tx_4' | 'tx_5' | 'tx_6' | 'tx_7'
  | 'tx_8' | 'tx_9' | 'tx_10' | 'tx_11' | 'tx_12' | 'tx_13'
  | 'activities'
  | 'donors'
  | 'avgSize';

export interface CoordinationTopDonor {
  id: string;
  name: string;
  acronym: string | null;
  value: number;
}

export interface CoordinationBubble {
  id: string;
  name: string;
  code?: string;
  value: number;
  activityCount: number;
  donorCount: number;
  topDonors: CoordinationTopDonor[];
}

// Backwards-compatible alias — the dashboard's compact card still nests bubbles.
export interface CoordinationParentNode extends CoordinationBubble {
  totalValue: number;
  children: CoordinationBubble[];
}

export interface CoordinationHierarchy {
  name: string;
  children: CoordinationParentNode[];
}

export interface CoordinationSummary {
  totalValue: number;
  measureLabel: string;
  categoryCount: number;
  sectorCount: number;
  subSectorCount: number;
  organizationCount: number;
  activityCount: number;
}

export interface CoordinationResponse {
  success: boolean;
  level: CoordinationLevel;
  measure: CoordinationMeasure;
  measureLabel: string;
  /** Optional date label, e.g. "2024" or "2020 – 2024", for the dynamic subtitle. */
  periodLabel?: string;
  data: CoordinationHierarchy;
  summary: CoordinationSummary;
  error?: string;
}

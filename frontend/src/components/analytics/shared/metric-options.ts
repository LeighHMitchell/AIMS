// Single source of truth for the financial metric multi-select used by the
// External Development Partners Financial Overview chart
// (`AllDonorsHorizontalBarChart`) and the Sector Disbursements Over Time chart
// (`SectorDisbursementOverTime`). Both expose the same 15 IATI-aligned metrics
// — keeping the definitions here so the two dropdowns can't drift.

import { BUDGET_COLOR, PLANNED_DISBURSEMENT_COLOR, getTransactionTypeColor } from '@/lib/chart-colors'

// `tx_<code>` keys map 1:1 to IATI transaction type codes 1–13; `budgets` and
// `planned` are the non-transaction metrics.
export type Metric =
  | 'budgets'
  | 'planned'
  | 'tx_1' | 'tx_2' | 'tx_3' | 'tx_4' | 'tx_5' | 'tx_6' | 'tx_7'
  | 'tx_8' | 'tx_9' | 'tx_10' | 'tx_11' | 'tx_12' | 'tx_13'

export interface MetricDef {
  key: Metric
  label: string
  code?: string
}

// Ordered. `code` renders as the badge in the dropdown for the 13 IATI
// transaction types; budgets and planned have no code badge.
export const METRIC_DEFS: MetricDef[] = [
  { key: 'budgets', label: 'Total Budgets' },
  { key: 'planned', label: 'Total Planned Disbursements' },
  { key: 'tx_1', label: 'Incoming Funds', code: '1' },
  { key: 'tx_2', label: 'Outgoing Commitments', code: '2' },
  { key: 'tx_3', label: 'Disbursements', code: '3' },
  { key: 'tx_4', label: 'Expenditures', code: '4' },
  { key: 'tx_5', label: 'Interest Payments', code: '5' },
  { key: 'tx_6', label: 'Loan Repayments', code: '6' },
  { key: 'tx_7', label: 'Reimbursements', code: '7' },
  { key: 'tx_8', label: 'Purchases of Equity', code: '8' },
  { key: 'tx_9', label: 'Sales of Equity', code: '9' },
  { key: 'tx_10', label: 'Credit Guarantees', code: '10' },
  { key: 'tx_11', label: 'Incoming Commitments', code: '11' },
  { key: 'tx_12', label: 'Outgoing Pledges', code: '12' },
  { key: 'tx_13', label: 'Incoming Pledges', code: '13' },
]

export const METRIC_LABEL: Record<Metric, string> = METRIC_DEFS.reduce((acc, m) => {
  acc[m.key] = m.label
  return acc
}, {} as Record<Metric, string>)

export const ALL_METRIC_KEYS: Metric[] = METRIC_DEFS.map(m => m.key)

// Canonical colour for a metric — budgets/planned use their brand constants;
// transaction types resolve through the shared transaction-type palette so
// every chart that surfaces these metrics renders them in the same hue.
export const metricColor = (m: Metric): string => {
  if (m === 'budgets') return BUDGET_COLOR
  if (m === 'planned') return PLANNED_DISBURSEMENT_COLOR
  return getTransactionTypeColor(m.slice(3))
}

/**
 * IATI BudgetStatus Codelist
 * Used for budget @status attribute
 * https://iatistandard.org/en/iati-standard/203/codelists/budgetstatus/
 */

export interface BudgetStatus {
  code: '1' | '2';
  name: string;
  description: string;
}

export const BUDGET_STATUSES: BudgetStatus[] = [
  {
    code: '1',
    name: 'Indicative',
    description: 'A planned estimate \u2014 not yet binding.'
  },
  {
    code: '2',
    name: 'Committed',
    description: 'Formally approved and binding for this period.'
  }
];

/**
 * Get budget status name by code
 */
export function getBudgetStatusName(code: '1' | '2' | string): string {
  const status = BUDGET_STATUSES.find(s => s.code === code);
  return status?.name || 'Unknown';
}


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
    description: 'A non-binding estimate for the described budget period'
  },
  {
    code: '2',
    name: 'Committed',
    description: 'A binding commitment for the described budget period'
  }
];

/**
 * Get budget status name by code
 */
export function getBudgetStatusName(code: '1' | '2' | string): string {
  const status = BUDGET_STATUSES.find(s => s.code === code);
  return status?.name || 'Unknown';
}


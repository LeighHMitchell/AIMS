/**
 * IATI BudgetType Codelist
 * Used for planned-disbursement @type attribute
 * https://iatistandard.org/en/iati-standard/203/codelists/budgettype/
 */

export interface BudgetType {
  code: '1' | '2';
  name: string;
  description: string;
}

export const BUDGET_TYPES: BudgetType[] = [
  {
    code: '1',
    name: 'Original',
    description: 'The original budget allocated to the planned disbursement'
  },
  {
    code: '2',
    name: 'Revised',
    description: 'A revised budget for the planned disbursement'
  }
];

/**
 * Get budget type name by code
 */
export function getBudgetTypeName(code: '1' | '2' | string): string {
  const type = BUDGET_TYPES.find(t => t.code === code);
  return type?.name || 'Unknown';
}

/**
 * Get budget type description by code
 */
export function getBudgetTypeDescription(code: '1' | '2' | string): string {
  const type = BUDGET_TYPES.find(t => t.code === code);
  return type?.description || '';
}

/**
 * Get budget types as options for select components
 */
export function getBudgetTypeOptions() {
  return BUDGET_TYPES.map(type => ({
    code: type.code,
    name: type.name,
    description: type.description
  }));
}

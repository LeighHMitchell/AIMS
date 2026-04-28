/**
 * IATI BudgetNotProvided Codelist
 * Used for iati-activity/@budget-not-provided attribute
 * https://iatistandard.org/en/iati-standard/203/codelists/budgetnotprovided/
 */

export interface BudgetNotProvided {
  code: '1' | '2' | '3' | '4' | '5';
  name: string;
  description: string;
}

export const BUDGET_NOT_PROVIDED: BudgetNotProvided[] = [
  { code: '1', name: 'Commercial Reasons', description: 'Budget not provided due to commercial confidentiality.' },
  { code: '2', name: 'Policy Reasons', description: 'Budget not provided due to organisational policy.' },
  { code: '3', name: 'Country Strategy Limitations', description: 'Budget not provided due to country-strategy constraints.' },
  { code: '4', name: 'Activity not Country Allocable', description: 'Activity is not country-allocable so no budget is provided.' },
  { code: '5', name: 'Other', description: 'Budget not provided for another reason.' },
];

export function getBudgetNotProvidedName(code: string | null | undefined): string {
  if (!code) return '';
  return BUDGET_NOT_PROVIDED.find(e => e.code === code)?.name ?? '';
}

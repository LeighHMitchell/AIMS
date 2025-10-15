/**
 * IATI BudgetIdentifierVocabulary Codelist
 * Used for country-budget-items @vocabulary attribute
 * https://iatistandard.org/en/iati-standard/203/codelists/budgetidentifiervocabulary/
 */

export interface BudgetIdentifierVocabulary {
  code: string;
  name: string;
  description: string;
  withdrawn?: boolean;
}

export const BUDGET_IDENTIFIER_VOCABULARIES: BudgetIdentifierVocabulary[] = [
  {
    code: '1',
    name: 'IATI',
    description: 'The budget identifier reported uses IATI budget identifier categories',
    withdrawn: true
  },
  {
    code: '2',
    name: 'Country Chart of Accounts',
    description: 'The budget identifier reported corresponds to the recipient country chart of accounts'
  },
  {
    code: '3',
    name: 'Other Country System',
    description: 'The budget identifier reported corresponds to a recipient country system other than the chart of accounts'
  },
  {
    code: '4',
    name: 'Reporting Organisation',
    description: 'The budget identifier reported corresponds to categories that are specific to the reporting organisation'
  },
  {
    code: '5',
    name: 'Other',
    description: 'The budget identifier reported uses a different vocabulary, not specified in the codelist'
  }
];


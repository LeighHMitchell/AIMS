// IATI Repayment Type Codes
// For use in loan-terms repayment-type element

import { RepaymentType } from '@/types/financing-terms';

export interface RepaymentTypeOption {
  code: RepaymentType;
  name: string;
  description: string;
}

export const REPAYMENT_TYPES: RepaymentTypeOption[] = [
  {
    code: '1',
    name: 'Equal Principal Payments',
    description: 'Repayments of principal are made in equal amounts over the repayment period'
  },
  {
    code: '2',
    name: 'Annuity',
    description: 'Equal payments combining principal and interest over the repayment period'
  },
  {
    code: '3',
    name: 'Lump sum',
    description: 'Principal is repaid in a single payment at the end of the loan period'
  },
  {
    code: '4',
    name: 'Other',
    description: 'Other repayment arrangement not covered by the standard types'
  }
];

// Helper function to get repayment type by code
export function getRepaymentType(code: string): RepaymentTypeOption | undefined {
  return REPAYMENT_TYPES.find(type => type.code === code);
}

// Helper function for dropdown options
export function getRepaymentTypeOptions() {
  return REPAYMENT_TYPES.map(type => ({
    value: type.code,
    label: type.name,
    description: type.description
  }));
}


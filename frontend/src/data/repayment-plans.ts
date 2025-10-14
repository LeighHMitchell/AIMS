// IATI Repayment Plan Codes
// For use in loan-terms repayment-plan element

import { RepaymentPlan } from '@/types/financing-terms';

export interface RepaymentPlanOption {
  code: RepaymentPlan;
  name: string;
  description: string;
}

export const REPAYMENT_PLANS: RepaymentPlanOption[] = [
  {
    code: '1',
    name: 'Annual',
    description: 'Repayments are made once per year'
  },
  {
    code: '2',
    name: 'Semi-annual',
    description: 'Repayments are made twice per year (every 6 months)'
  },
  {
    code: '3',
    name: 'Quarterly',
    description: 'Repayments are made four times per year (every 3 months)'
  },
  {
    code: '4',
    name: 'Other',
    description: 'Other repayment schedule not covered by the standard plans'
  }
];

// Helper function to get repayment plan by code
export function getRepaymentPlan(code: string): RepaymentPlanOption | undefined {
  return REPAYMENT_PLANS.find(plan => plan.code === code);
}

// Helper function for dropdown options
export function getRepaymentPlanOptions() {
  return REPAYMENT_PLANS.map(plan => ({
    value: plan.code,
    label: plan.name,
    description: plan.description
  }));
}


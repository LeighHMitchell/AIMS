// TypeScript types for Financing Terms (IATI CRS-add data)

// =====================================================
// IATI Code Types
// =====================================================

export type RepaymentType = '1' | '2' | '3' | '4';
export type RepaymentPlan = '1' | '2' | '3' | '4';

// =====================================================
// Labels and Descriptions
// =====================================================

export const REPAYMENT_TYPE_LABELS: Record<RepaymentType, string> = {
  '1': 'Equal Principal Payments',
  '2': 'Annuity',
  '3': 'Lump sum',
  '4': 'Other'
};

export const REPAYMENT_TYPE_DESCRIPTIONS: Record<RepaymentType, string> = {
  '1': 'Repayments of principal are made in equal amounts over the repayment period',
  '2': 'Equal payments combining principal and interest over the repayment period',
  '3': 'Principal is repaid in a single payment at the end of the loan period',
  '4': 'Other repayment arrangement not covered by the standard types'
};

export const REPAYMENT_PLAN_LABELS: Record<RepaymentPlan, string> = {
  '1': 'Annual',
  '2': 'Semi-annual',
  '3': 'Quarterly',
  '4': 'Other'
};

export const REPAYMENT_PLAN_DESCRIPTIONS: Record<RepaymentPlan, string> = {
  '1': 'Repayments are made once per year',
  '2': 'Repayments are made twice per year (every 6 months)',
  '3': 'Repayments are made four times per year (every 3 months)',
  '4': 'Other repayment schedule not covered by the standard plans'
};

// =====================================================
// Data Interfaces
// =====================================================

export interface OtherFlag {
  code: string;
  significance: string; // '0' = not applicable, '1' = applicable
}

export interface LoanTerms {
  id?: string;
  activity_id: string;
  rate_1?: number | null;
  rate_2?: number | null;
  repayment_type_code?: RepaymentType | null;
  repayment_plan_code?: RepaymentPlan | null;
  commitment_date?: string | null; // ISO date string
  repayment_first_date?: string | null; // ISO date string
  repayment_final_date?: string | null; // ISO date string
  other_flags?: OtherFlag[];
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface LoanStatus {
  id: string;
  activity_id: string;
  year: number;
  currency: string;
  value_date?: string | null; // ISO date string
  interest_received?: number | null;
  principal_outstanding?: number | null;
  principal_arrears?: number | null;
  interest_arrears?: number | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface FinancingTerms {
  loanTerms: LoanTerms | null;
  loanStatuses: LoanStatus[];
}

// =====================================================
// Form Data Types
// =====================================================

export interface CreateLoanTermsData {
  activity_id: string;
  rate_1?: number | null;
  rate_2?: number | null;
  repayment_type_code?: RepaymentType | null;
  repayment_plan_code?: RepaymentPlan | null;
  commitment_date?: string | null;
  repayment_first_date?: string | null;
  repayment_final_date?: string | null;
  other_flags?: OtherFlag[];
}

export interface UpdateLoanTermsData {
  rate_1?: number | null;
  rate_2?: number | null;
  repayment_type_code?: RepaymentType | null;
  repayment_plan_code?: RepaymentPlan | null;
  commitment_date?: string | null;
  repayment_first_date?: string | null;
  repayment_final_date?: string | null;
  other_flags?: OtherFlag[];
}

export interface CreateLoanStatusData {
  activity_id: string;
  year: number;
  currency: string;
  value_date?: string | null;
  interest_received?: number | null;
  principal_outstanding?: number | null;
  principal_arrears?: number | null;
  interest_arrears?: number | null;
}

export interface UpdateLoanStatusData {
  year?: number;
  currency?: string;
  value_date?: string | null;
  interest_received?: number | null;
  principal_outstanding?: number | null;
  principal_arrears?: number | null;
  interest_arrears?: number | null;
}

// =====================================================
// Component Props
// =====================================================

export interface FinancingTermsTabProps {
  activityId: string;
  readOnly?: boolean;
  className?: string;
  onFinancingTermsChange?: (hasData: boolean) => void;
}


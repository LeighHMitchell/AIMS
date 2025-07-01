// IATI-compliant Planned Disbursement types
export interface PlannedDisbursement {
  id?: string;
  activity_id: string;
  amount: number;
  currency: string;
  period_start: string;
  period_end: string;
  provider_org_id?: string;
  provider_org_name?: string;
  receiver_org_id?: string;
  receiver_org_name?: string;
  status?: 'original' | 'revised';
  value_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

// Form state extension
export interface PlannedDisbursementFormState extends PlannedDisbursement {
  isSaving?: boolean;
  hasError?: boolean;
}

// IATI XML export format
export interface IATIPlannedDisbursement {
  type: '1' | '2' | '3' | '4'; // IATI disbursement types
  period: {
    'period-start': {
      '@iso-date': string;
    };
    'period-end': {
      '@iso-date': string;
    };
  };
  value: {
    '@currency': string;
    '@value-date'?: string;
    '#text': number;
  };
  'provider-org'?: {
    '@ref'?: string;
    '@type'?: string;
    'narrative': string;
  };
  'receiver-org'?: {
    '@ref'?: string;
    '@type'?: string;
    'narrative': string;
  };
  description?: {
    narrative: string;
  };
}

// Summary statistics
export interface PlannedDisbursementStats {
  totalAmount: number;
  count: number;
  earliestDate: string;
  latestDate: string;
  currencies: string[];
  providers: string[];
  receivers: string[];
  originalCount: number;
  revisedCount: number;
} 
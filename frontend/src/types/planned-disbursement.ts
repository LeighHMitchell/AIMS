// IATI-compliant Planned Disbursement types
export interface PlannedDisbursement {
  id?: string;
  activity_id: string;
  
  // Financial fields
  amount: number;
  currency: string;
  value_date?: string;
  usd_amount?: number;  // USD-converted amount stored in database
  
  // Period fields
  period_start: string;
  period_end: string;
  
  // IATI type attribute (NEW - IATI BudgetType codelist)
  type?: '1' | '2';  // 1=Original, 2=Revised
  
  // Provider organization fields
  provider_org_id?: string;
  provider_org_name?: string;
  provider_org_ref?: string;          // IATI org identifier
  provider_org_type?: string;         // IATI org type code
  provider_activity_id?: string;      // IATI activity identifier (text)
  provider_activity_uuid?: string;    // NEW - Foreign key to activities table
  
  // Receiver organization fields
  receiver_org_id?: string;
  receiver_org_name?: string;
  receiver_org_ref?: string;          // IATI org identifier
  receiver_org_type?: string;         // IATI org type code
  receiver_activity_id?: string;      // IATI activity identifier (text)
  receiver_activity_uuid?: string;    // NEW - Foreign key to activities table
  
  // Internal status field
  status?: 'original' | 'revised';
  
  // Additional fields
  notes?: string;
  
  // Audit fields
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  
  // Computed fields (not in database)
  usdAmount?: number;
  isSaving?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

// Form state extension (no additional fields needed now, included in base interface)
export interface PlannedDisbursementFormState extends PlannedDisbursement {
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
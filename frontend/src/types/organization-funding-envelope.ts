// Organisation-level funding envelope types
// These represent indicative, organisation-perspective funding declarations
// Data is NOT nationally summable and must be clearly marked as indicative

export interface OrganizationFundingEnvelope {
  id?: string;
  organization_id: string;
  
  // Time period
  period_type: 'single_year' | 'multi_year';
  year_start: number;
  year_end?: number | null;
  
  // Financial
  amount: number;
  currency: string;
  amount_usd?: number | null;
  
  // Classification
  flow_direction: 'incoming' | 'outgoing';
  organization_role: 'original_funder' | 'fund_manager' | 'implementer';
  funding_type_flags: FundingTypeFlag[];
  
  // Status
  status: 'actual' | 'current' | 'indicative';
  confidence_level?: 'low' | 'medium' | 'high' | null;
  
  // Notes
  notes?: string | null;
  
  // Audit
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  
  // UI state
  isSaving?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

export type FundingTypeFlag = 
  | 'core_resources' 
  | 'earmarked_pooled' 
  | 'on_budget' 
  | 'off_budget' 
  | 'unknown';

export const FLOW_DIRECTIONS = [
  { value: 'incoming', label: 'Incoming (to this organisation)' },
  { value: 'outgoing', label: 'Outgoing (from this organisation)' }
] as const;

export const ORGANIZATION_ROLES = [
  { 
    value: 'original_funder', 
    label: 'Original Funder', 
    description: 'Source of the funds' 
  },
  { 
    value: 'fund_manager', 
    label: 'Fund Manager / Channel', 
    description: 'Managing or channeling funds' 
  },
  { 
    value: 'implementer', 
    label: 'Implementer', 
    description: 'Implementing activities with the funds' 
  }
] as const;

export const FUNDING_TYPE_FLAGS = [
  { value: 'core_resources', label: 'Core Resources' },
  { value: 'earmarked_pooled', label: 'Earmarked / Pooled Funds' },
  { value: 'on_budget', label: 'On-Budget' },
  { value: 'off_budget', label: 'Off-Budget' },
  { value: 'unknown', label: 'Unknown' }
] as const;

export const ENVELOPE_STATUSES = [
  { 
    value: 'actual', 
    label: 'Actual', 
    description: 'Historical confirmed figures' 
  },
  { 
    value: 'current', 
    label: 'Current', 
    description: 'Current year or active period' 
  },
  { 
    value: 'indicative', 
    label: 'Indicative / Planned', 
    description: 'Future projections' 
  }
] as const;

export const CONFIDENCE_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
] as const;

// Helper function to categorize envelope by temporal status
export function getTemporalCategory(
  envelope: OrganizationFundingEnvelope,
  currentYear: number = new Date().getFullYear()
): 'past' | 'current' | 'future' {
  const endYear = envelope.year_end || envelope.year_start;
  
  if (endYear < currentYear) {
    return 'past';
  } else if (envelope.year_start <= currentYear && endYear >= currentYear) {
    return 'current';
  } else {
    return 'future';
  }
}




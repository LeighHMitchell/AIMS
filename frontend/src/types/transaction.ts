// IATI-compliant Transaction Types

// Transaction Type codes based on IATI standard
export type TransactionType = 
  | '1'   // Incoming Commitment
  | '2'   // Outgoing Commitment  
  | '3'   // Disbursement
  | '4'   // Expenditure
  | '5'   // Interest Repayment
  | '6'   // Loan Repayment
  | '7'   // Reimbursement
  | '8'   // Purchase of Equity
  | '9'   // Sale of Equity
  | '11'  // Credit Guarantee
  | '12'  | '13'; // Incoming Funds, Commitment Cancellation

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  '1': 'Incoming Commitment',
  '2': 'Outgoing Commitment',
  '3': 'Disbursement',
  '4': 'Expenditure',
  '5': 'Interest Repayment',
  '6': 'Loan Repayment',
  '7': 'Reimbursement',
  '8': 'Purchase of Equity',
  '9': 'Sale of Equity',
  '11': 'Credit Guarantee',
  '12': 'Incoming Funds',
  '13': 'Commitment Cancellation'
};

export type TransactionStatus = 'draft' | 'submitted' | 'validated' | 'rejected' | 'published' | 'actual';

export type OrganizationType = 
  | '10'  // Government
  | '11'  // Local Government
  | '15'  // Other Public Sector
  | '21'  // International NGO
  | '22'  // National NGO
  | '23'  // Regional NGO
  | '24'  // Partner Country based NGO
  | '30'  // Public Private Partnership
  | '31'  // Private Sector
  | '40'  // Multilateral
  | '60'  // Foundation
  | '70'  // Academic, Training and Research
  | '80'; // Other

export type DisbursementChannel = 
  | '1'  // Money is disbursed through central Ministry of Finance or Treasury
  | '2'  // Money is disbursed directly to the implementing institution
  | '3'  // Aid in kind: Donors utilise third party agencies
  | '4'; // Not reported

export type FlowType = 
  | '10'  // ODA
  | '20'  // OOF
  | '21'  // Non-export credit OOF
  | '22'  // Officially supported export credits
  | '30'  // Private grants
  | '35'  // Private market
  | '36'  // Private Foreign Direct Investment
  | '37'  // Other private flows at market terms
  | '40'  // Non flow
  | '50'; // Other flows

export type FinanceType = 
  | '1'   // GNI: Gross National Income
  | '110' // Standard grant
  | '111' // Subsidies to national private investors
  | '210' // Interest subsidy
  | '211' // Interest subsidy to national private exporters
  | '310' // Deposit basis
  | '311' // Encashment basis
  | '410' // Aid loan excluding debt reorganisation
  | '411' // Investment-related loan to developing countries
  | '412' // Loan in a joint venture with the recipient
  | '413' // Loan to national private investor
  | '414' // Loan to national private exporter
  | '451' // Non-banks guaranteed export credits
  | '452' // Non-banks non-guaranteed portions of guaranteed export credits
  | '453' // Bank export credits
  | '510' // Debt forgiveness: ODA claims
  | '511' // Debt forgiveness: ODA claims (DSR)
  | '512' // Debt forgiveness: ODA claims (HIPC)
  | '513' // Debt forgiveness: ODA claims (MDRI)
  | '520' // Debt forgiveness: OOF claims
  | '530' // Debt forgiveness: Private claims
  | '600' // Debt rescheduling: ODA claims
  | '601' // Debt rescheduling: ODA claims (DSR)
  | '602' // Debt rescheduling: ODA claims (HIPC)
  | '603' // Debt rescheduling: ODA claims (MDRI)
  | '610' // Debt rescheduling: OOF claims
  | '620' // Debt rescheduling: Private claims
  | '621' // Debt rescheduling: Private claims (DSR)
  | '622' // Debt rescheduling: Private claims (HIPC)
  | '623' // Debt rescheduling: Private claims (MDRI)
  | '630' // Debt rescheduling: OOF claims (DSR)
  | '631' // Debt rescheduling: OOF claims (HIPC)
  | '632' // Debt rescheduling: OOF claims (MDRI)
  | '700' // Foreign direct investment
  | '810' // Bonds
  | '910' // Other securities/claims
  | '1100'; // Guarantees/insurance

export type TiedStatus = 
  | '3'  // Partially tied
  | '4'  // Tied
  | '5'; // Untied

// Main Transaction interface
export interface Transaction {
  // Core fields
  id: string; // Legacy field - use uuid as primary identifier
  uuid: string; // Primary identifier for API operations
  activity_id: string;
  transaction_type: TransactionType;
  transaction_date: string; // ISO date
  value: number;
  currency: string; // ISO 4217
  status: TransactionStatus;
  
  // Optional IATI fields
  transaction_reference?: string;
  value_date?: string; // ISO date
  description?: string;
  
  // Provider organization
  provider_org_id?: string;
  provider_org_type?: OrganizationType;
  provider_org_ref?: string; // IATI identifier
  provider_org_name?: string;
  
  // Receiver organization
  receiver_org_id?: string;
  receiver_org_type?: OrganizationType;
  receiver_org_ref?: string;
  receiver_org_name?: string;
  
  // Transaction details
  disbursement_channel?: DisbursementChannel;
  
  // Sector information
  sector_code?: string;
  sector_vocabulary?: string;
  
  // Geographic information
  recipient_country_code?: string; // ISO 3166-1 alpha-2
  recipient_region_code?: string;
  recipient_region_vocab?: string;
  
  // Flow types and classifications
  flow_type?: FlowType;
  finance_type?: FinanceType;
  aid_type?: string;
  aid_type_vocabulary?: string;
  tied_status?: TiedStatus;
  
  // Other
  is_humanitarian?: boolean;
  
  // Financial classification
  financing_classification?: string; // ODA Grant, ODA Loan, OOF Grant, OOF Loan, Other
  
  // Metadata
  created_at?: string;
  updated_at?: string;
  created_by?: string; // User ID who created the transaction (null for imports)
  updated_by?: string; // User ID who last updated the transaction
  organization_id?: string; // Organization that owns this transaction
  activity_iati_ref?: string; // IATI identifier of parent activity
  fx_differs?: boolean; // Flag if FX settlement date differs
  
  // Validation fields
  validated_by?: string; // User ID who validated the transaction
  validated_at?: string; // ISO timestamp when validated
  rejected_by?: string; // User ID who rejected the transaction
  rejected_at?: string; // ISO timestamp when rejected
  validation_comments?: string; // Comments from validator/rejector
  
  // Language fields for multilingual support
  description_language?: string;
  provider_org_language?: string;
  receiver_org_language?: string;
  
  // Humanitarian scope fields
  transaction_scope?: string;
  humanitarian_scope_type?: string;
  humanitarian_scope_code?: string;
  humanitarian_scope_vocabulary?: string;
  
  // UI helpers
  isNew?: boolean; // For frontend forms
  isEditing?: boolean;
  
  // Calculated/display fields (not stored)
  provider_org?: {
    id: string;
    name: string;
    type?: OrganizationType;
  };
  receiver_org?: {
    id: string;
    name: string;
    type?: OrganizationType;
  };
  // USD conversion fields (from backend)
  value_usd?: number;
  usd_convertible?: boolean;
  usd_conversion_date?: string;
  exchange_rate_used?: number;
  
  // Transaction sector lines (new feature)
  sector_lines?: TransactionSectorLine[];
}

// Helper type for creating new transactions
export type NewTransaction = Omit<Transaction, 'id' | 'created_at' | 'updated_at'>;

// IATI Code labels
export const DISBURSEMENT_CHANNEL_LABELS: Record<DisbursementChannel, string> = {
  '1': 'Through central Ministry of Finance/Treasury',
  '2': 'Direct to implementing institution',
  '3': 'Aid in kind through third party',
  '4': 'Not reported'
};

export const FLOW_TYPE_LABELS: Record<FlowType, string> = {
  '10': 'ODA',
  '20': 'OOF',
  '21': 'Non-export credit OOF',
  '22': 'Officially supported export credits',
  '30': 'Private grants',
  '35': 'Private market',
  '36': 'Private Foreign Direct Investment',
  '37': 'Other private flows at market terms',
  '40': 'Non flow',
  '50': 'Other flows'
};

export const TIED_STATUS_LABELS: Record<TiedStatus, string> = {
  '3': 'Partially tied',
  '4': 'Tied',
  '5': 'Untied'
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  'draft': 'Draft',
  'submitted': 'Submitted',
  'validated': 'Validated',
  'rejected': 'Rejected',
  'published': 'Published',
  'actual': 'Actual'
};

export const TRANSACTION_STATUS_COLORS: Record<TransactionStatus, string> = {
  'draft': 'gray',
  'submitted': 'blue',
  'validated': 'green',
  'rejected': 'red',
  'published': 'purple',
  'actual': 'emerald'
};

// Form validation schema (using a type for now, can be converted to Zod later)
export interface TransactionFormData {
  transaction_type: TransactionType;
  transaction_date: string;
  value: number;
  currency: string;
  status: TransactionStatus;
  description?: string;
  
  // Provider/Receiver can be selected from existing orgs or entered manually
  provider_org_id?: string;
  provider_org_name?: string;
  provider_org_ref?: string;
  provider_org_type?: OrganizationType;
  
  receiver_org_id?: string;
  receiver_org_name?: string;
  receiver_org_ref?: string;
  receiver_org_type?: OrganizationType;
  
  // Optional fields shown in "Advanced" section
  value_date?: string;
  transaction_reference?: string;
  disbursement_channel?: DisbursementChannel;
  sector_code?: string;
  recipient_country_code?: string;
  flow_type?: FlowType;
  finance_type?: FinanceType;
  aid_type?: string;
  tied_status?: TiedStatus;
  financing_classification?: string;
  is_humanitarian?: boolean;
}

// Transaction summary type for analytics
export interface TransactionSummary {
  total_commitment: number;
  total_disbursement: number;
  total_expenditure: number;
  by_type: Record<TransactionType, {
    count: number;
    total: number;
  }>;
  by_year: Record<string, {
    commitment: number;
    disbursement: number;
    expenditure: number;
  }>;
  by_provider: Array<{
    org_name: string;
    org_ref?: string;
    total: number;
    count: number;
  }>;
  by_receiver: Array<{
    org_name: string;
    org_ref?: string;
    total: number;
    count: number;
  }>;
}

// Transaction Sector Line interfaces for transaction-level sector allocation
export interface TransactionSectorLine {
  id: string;
  transaction_id: string;
  sector_vocabulary: string; // '1' = DAC 5-digit, '2' = DAC 3-digit, etc.
  sector_code: string; // e.g., '11220'
  sector_name: string; // e.g., 'Primary education'
  percentage: number; // 0-100, must sum to 100% across all lines
  amount_minor: number; // Amount in minor currency units (cents)
  sort_order?: number;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

// Validation interface for transaction sector allocations
export interface TransactionSectorValidation {
  isValid: boolean;
  errors: string[];
  totalPercentage: number;
  remainingPercentage: number;
  totalAmount: number; // Computed total in major units
  hasRoundingIssues?: boolean;
}

// Form data for creating/updating transaction sector lines
export interface TransactionSectorLineFormData {
  id?: string; // Optional for new lines
  sector_vocabulary?: string; // Defaults to '1' (DAC 5-digit)
  sector_code: string;
  sector_name?: string; // Auto-populated from sector lookup
  percentage: number;
}

// API response for transaction sectors
export interface TransactionSectorsResponse {
  sector_lines: TransactionSectorLine[];
  metadata: {
    transaction_id: string;
    transaction_value: number;
    transaction_currency: string;
    total_allocated_percentage: number;
    validation: TransactionSectorValidation;
  };
}

// API request for updating transaction sectors
export interface UpdateTransactionSectorsRequest {
  sector_lines: TransactionSectorLineFormData[];
}

// Copy from activity request
export interface CopyFromActivityRequest {
  activity_id: string;
  scale_to_transaction: boolean;
} 
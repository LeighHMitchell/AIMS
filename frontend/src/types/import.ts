export type ImportEntityType = 'activities' | 'organizations' | 'transactions';

export interface FileColumn {
  index: number;
  name: string;
  sampleValues: string[];
}

export interface SystemField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select';
  required: boolean;
  description?: string;
  format?: string;
  options?: Array<{ value: string; label: string }>;
}

export interface FieldMapping {
  systemFieldId: string;
  fileColumnIndex: number | null;
}

export interface ImportState {
  file: File | null;
  fileData: any[];
  columns: FileColumn[];
  mappings: FieldMapping[];
  validationErrors: ValidationError[];
  importResults?: ImportResults;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: any;
}

export interface ImportResults {
  successful: number;
  failed: number;
  errors: ValidationError[];
  importedIds?: string[];
}

export interface MappingTemplate {
  id: string;
  name: string;
  entityType: ImportEntityType;
  mappings: FieldMapping[];
  createdAt: Date;
}

// Field definitions for each entity type
export const ACTIVITY_FIELDS: SystemField[] = [
  { id: 'title', name: 'Activity Title', type: 'string', required: true, description: 'The name or title of the activity' },
  { id: 'description', name: 'Description', type: 'string', required: false, description: 'Detailed description of the activity' },
  { id: 'donor_name', name: 'Donor Organization', type: 'string', required: true, description: 'Name of the donor organization' },
  { id: 'implementing_org_name', name: 'Implementing Organization', type: 'string', required: false, description: 'Name of the implementing organization' },
  { id: 'start_date_planned', name: 'Start Date', type: 'date', required: true, description: 'Planned start date (YYYY-MM-DD)', format: 'YYYY-MM-DD' },
  { id: 'end_date_planned', name: 'End Date', type: 'date', required: true, description: 'Planned end date (YYYY-MM-DD)', format: 'YYYY-MM-DD' },
  { id: 'total_budget', name: 'Total Budget', type: 'number', required: true, description: 'Total budget amount in USD' },
  { id: 'activity_status', name: 'Status', type: 'select', required: false, description: 'Current status of the activity', options: [
    { value: 'pipeline', label: 'Pipeline/Identification' },
    { value: 'implementation', label: 'Implementation' },
    { value: 'completion', label: 'Completion' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'suspended', label: 'Suspended' }
  ]},
  { id: 'sector_name', name: 'Sector', type: 'string', required: false, description: 'Primary sector of the activity' },
  { id: 'recipient_country_name', name: 'Recipient Country', type: 'string', required: true, description: 'Country where the activity takes place' },
];

export const ORGANIZATION_FIELDS: SystemField[] = [
  { id: 'name', name: 'Organization Name', type: 'string', required: true, description: 'Full name of the organization' },
  { id: 'acronym', name: 'Acronym', type: 'string', required: false, description: 'Abbreviated name or acronym' },
  { id: 'iati_identifier', name: 'IATI Organization ID', type: 'string', required: false, description: 'IATI organization identifier' },
  { id: 'organization_type', name: 'Organization Type', type: 'select', required: true, description: 'Type of organization', options: [
    { value: 'government', label: 'Government Agency' },
    { value: 'ngo', label: 'Non-Governmental Organization' },
    { value: 'ingo', label: 'International NGO' },
    { value: 'un', label: 'UN Agency' },
    { value: 'bilateral', label: 'Bilateral Donor' },
    { value: 'multilateral', label: 'Multilateral Organization' },
    { value: 'private', label: 'Private Sector' },
    { value: 'academic', label: 'Academic Institution' },
    { value: 'other', label: 'Other' }
  ]},
  { id: 'country_name', name: 'Country', type: 'string', required: false, description: 'Country where the organization is based' },
  { id: 'website', name: 'Website', type: 'string', required: false, description: 'Organization website URL' },
  { id: 'contact_email', name: 'Contact Email', type: 'string', required: false, description: 'Primary contact email address' },
  { id: 'description', name: 'Description', type: 'string', required: false, description: 'Brief description of the organization' },
];

export const TRANSACTION_FIELDS: SystemField[] = [
  { id: 'project_title', name: 'Activity Title', type: 'string', required: true, description: 'Title of the activity this transaction belongs to' },
  { id: 'transaction_date', name: 'Transaction Date', type: 'date', required: true, description: 'Date of the transaction (YYYY-MM-DD)', format: 'YYYY-MM-DD' },
  { id: 'amount', name: 'Amount', type: 'number', required: true, description: 'Transaction amount' },
  { id: 'currency', name: 'Currency', type: 'select', required: false, description: 'Currency code (defaults to USD)', options: [
    { value: 'USD', label: 'US Dollar' },
    { value: 'EUR', label: 'Euro' },
    { value: 'GBP', label: 'British Pound' },
    { value: 'MMK', label: 'Myanmar Kyat' },
    { value: 'JPY', label: 'Japanese Yen' },
    { value: 'CNY', label: 'Chinese Yuan' },
    { value: 'THB', label: 'Thai Baht' }
  ]},
  { id: 'transaction_type', name: 'Transaction Type', type: 'select', required: true, description: 'Type of transaction', options: [
    { value: 'disbursement', label: 'Disbursement' },
    { value: 'expenditure', label: 'Expenditure' },
    { value: 'incoming_funds', label: 'Incoming Funds' },
    { value: 'loan_repayment', label: 'Loan Repayment' },
    { value: 'interest_payment', label: 'Interest Payment' }
  ]},
  { id: 'provider_organization_name', name: 'Provider Organization', type: 'string', required: false, description: 'Organization providing the funds' },
  { id: 'receiver_organization_name', name: 'Receiver Organization', type: 'string', required: false, description: 'Organization receiving the funds' },
  { id: 'description', name: 'Description', type: 'string', required: false, description: 'Transaction description or notes' },
  { id: 'reference', name: 'Reference Number', type: 'string', required: false, description: 'Transaction reference number' },
];

export const getFieldsForEntityType = (entityType: ImportEntityType): SystemField[] => {
  switch (entityType) {
    case 'activities':
      return ACTIVITY_FIELDS;
    case 'organizations':
      return ORGANIZATION_FIELDS;
    case 'transactions':
      return TRANSACTION_FIELDS;
    default:
      return [];
  }
};
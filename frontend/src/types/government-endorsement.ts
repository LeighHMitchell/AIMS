export interface GovernmentEndorsement {
  id: string;
  activity_id: string;
  
  // Core endorsement data
  effective_date?: string;
  validation_status?: 'validated' | 'rejected' | 'more_info_requested';
  validating_authority?: string;
  validation_notes?: string;
  validation_date?: string;
  
  // Document metadata (IATI-compliant)
  document_title?: string;
  document_description?: string;
  document_url?: string;
  document_category?: string;
  document_language?: string;
  document_date?: string;
  
  // Audit fields
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface GovernmentEndorsementFormData {
  effective_date?: string;
  validation_status?: 'validated' | 'rejected' | 'more_info_requested';
  validating_authority?: string;
  validation_notes?: string;
  validation_date?: string;
  document_title?: string;
  document_description?: string;
  document_url?: string;
  document_category?: string;
  document_language?: string;
  document_date?: string;
}

export const VALIDATION_STATUS_OPTIONS = [
  { value: 'validated', label: 'Validated', description: 'Government has approved and validated the activity' },
  { value: 'rejected', label: 'Rejected', description: 'Government has rejected the activity or endorsement' },
  { value: 'more_info_requested', label: 'More Info Requested', description: 'Government requires additional information before validation' }
] as const;

export const IATI_DOCUMENT_CATEGORIES = [
  { value: 'A09', label: 'Memorandum of understanding', description: 'MOU or similar agreement document' },
  { value: 'A10', label: 'Evaluation', description: 'Government evaluation or assessment' },
  { value: 'A11', label: 'Results, outcomes and outputs', description: 'Results documentation' },
  { value: 'B01', label: 'Budget', description: 'Budget-related documents' },
  { value: 'B02', label: 'Audit', description: 'Audit reports and documentation' },
  { value: 'B03', label: 'Procurement', description: 'Procurement-related documents' },
  { value: 'B04', label: 'Contract', description: 'Contracts and agreements' },
  { value: 'B05', label: 'Tender', description: 'Tender documents' },
  { value: 'B06', label: 'Conditions', description: 'Terms and conditions' },
  { value: 'B07', label: 'Budget amendment', description: 'Budget modifications' },
  { value: 'B08', label: 'Contract amendment', description: 'Contract modifications' },
  { value: 'B09', label: 'Tender amendment', description: 'Tender modifications' },
  { value: 'B10', label: 'Conditions amendment', description: 'Terms and conditions modifications' },
  { value: 'B11', label: 'Annual report', description: 'Annual reporting documents' },
  { value: 'B12', label: 'Institutional Strategy paper', description: 'Strategic planning documents' },
  { value: 'B13', label: 'Country Strategy paper', description: 'Country-level strategy documents' },
  { value: 'B14', label: 'Sector Strategy paper', description: 'Sector-specific strategy documents' },
  { value: 'B15', label: 'Thematic Strategy paper', description: 'Thematic strategy documents' },
  { value: 'B16', label: 'Country audit report', description: 'Country-level audit reports' },
  { value: 'B17', label: 'Sector audit report', description: 'Sector-specific audit reports' },
  { value: 'B18', label: 'Project audit report', description: 'Project-level audit reports' }
] as const;

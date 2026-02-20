import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a database column name (snake_case) to a human-readable label.
 * Uses explicit mappings for known fields, with a generic fallback.
 */
const FIELD_DISPLAY_NAMES: Record<string, string> = {
  // Organization fields
  organisation_type: 'Organisation Type',
  default_currency: 'Default Currency',
  default_language: 'Default Language',
  default_custom_year_id: 'Default Financial Year',
  residency_status: 'Residency Status',
  iati_org_id: 'IATI Organisation ID',
  // Working group fields
  group_type: 'Group Type',
  is_active: 'Active Status',
  icon_url: 'Icon',
  // Activity fields
  title_narrative: 'Activity Title',
  description_narrative: 'Activity Description',
  collaboration_type: 'Collaboration Type',
  activity_status: 'Activity Status',
  activity_scope: 'Activity Scope',
  default_aid_type: 'Default Aid Type',
  default_finance_type: 'Default Finance Type',
  default_flow_type: 'Default Flow Type',
  default_tied_status: 'Default Tied Status',
  planned_start_date: 'Planned Start Date',
  planned_end_date: 'Planned End Date',
  actual_start_date: 'Actual Start Date',
  actual_end_date: 'Actual End Date',
  iati_identifier: 'IATI Identifier',
  other_identifier_type: 'Other Identifier Type',
  other_identifier_code: 'Other Identifier Code',
  // Transaction fields
  transaction_type: 'Transaction Type',
  transaction_date: 'Transaction Date',
  provider_org: 'Provider Organisation',
  receiver_org: 'Receiver Organisation',
  disbursement_channel: 'Disbursement Channel',
  flow_type: 'Flow Type',
  finance_type: 'Finance Type',
  aid_type: 'Aid Type',
  tied_status: 'Tied Status',
};

export function humanizeFieldName(fieldName: string): string {
  if (FIELD_DISPLAY_NAMES[fieldName]) {
    return FIELD_DISPLAY_NAMES[fieldName];
  }

  // Generic fallback: strip _id suffix, replace underscores, title case
  return fieldName
    .replace(/_id$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

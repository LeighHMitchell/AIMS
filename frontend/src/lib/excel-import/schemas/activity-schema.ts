import type { ExcelFieldDefinition } from '../types';

/**
 * Activity import field definitions.
 * Single flat sheet: scalar fields + numbered repeating fields (up to 5 each).
 */

// Helper to generate numbered repeating field definitions
function repeatFields(
  group: string,
  fieldsPerItem: Omit<ExcelFieldDefinition, 'key' | 'label' | 'repeatGroup' | 'repeatIndex'>[],
  labels: string[],
  keys: string[],
  count = 5
): ExcelFieldDefinition[] {
  const result: ExcelFieldDefinition[] = [];
  for (let i = 1; i <= count; i++) {
    fieldsPerItem.forEach((field, fieldIdx) => {
      result.push({
        ...field,
        key: `${keys[fieldIdx]}_${i}`,
        label: `${labels[fieldIdx]} ${i}`,
        repeatGroup: group,
        repeatIndex: i,
      });
    });
  }
  return result;
}

// Scalar fields
const scalarFields: ExcelFieldDefinition[] = [
  { key: 'title', label: 'Activity Title', type: 'string', required: true },
  { key: 'acronym', label: 'Acronym', type: 'string', required: false },
  { key: 'description', label: 'Description', type: 'string', required: false },
  { key: 'iati_identifier', label: 'IATI Identifier', type: 'string', required: false },
  { key: 'activity_status', label: 'Activity Status', type: 'codelist', required: false, codelistKey: 'activity_status' },
  { key: 'collaboration_type', label: 'Collaboration Type', type: 'codelist', required: false, codelistKey: 'collaboration_type' },
  { key: 'activity_scope', label: 'Activity Scope', type: 'codelist', required: false, codelistKey: 'activity_scope' },
  { key: 'planned_start_date', label: 'Planned Start Date', type: 'date', required: false },
  { key: 'planned_end_date', label: 'Planned End Date', type: 'date', required: false },
  { key: 'actual_start_date', label: 'Actual Start Date', type: 'date', required: false },
  { key: 'actual_end_date', label: 'Actual End Date', type: 'date', required: false },
  { key: 'effective_date', label: 'Effective Date', type: 'date', required: false },
  { key: 'default_aid_type', label: 'Default Aid Type', type: 'codelist', required: false, codelistKey: 'aid_type' },
  { key: 'default_finance_type', label: 'Default Finance Type', type: 'codelist', required: false, codelistKey: 'finance_type' },
  { key: 'default_flow_type', label: 'Default Flow Type', type: 'codelist', required: false, codelistKey: 'flow_type' },
  { key: 'default_tied_status', label: 'Default Tied Status', type: 'codelist', required: false, codelistKey: 'tied_status' },
  { key: 'humanitarian', label: 'Humanitarian', type: 'boolean', required: false },
  { key: 'capital_spend_percentage', label: 'Capital Spend %', type: 'number', required: false },
  { key: 'budget_status', label: 'Budget Status', type: 'codelist', required: false, codelistKey: 'budget_status' },
  { key: 'on_budget_percentage', label: 'On Budget %', type: 'number', required: false },
];

// Repeating field groups
const sectorFields = repeatFields(
  'sector',
  [
    { type: 'codelist', required: false, codelistKey: 'sector' },
    { type: 'number', required: false },
  ],
  ['Sector Code', 'Sector %'],
  ['sector_code', 'sector_percentage']
);

const countryFields = repeatFields(
  'country',
  [
    { type: 'codelist', required: false, codelistKey: 'country' },
    { type: 'number', required: false },
  ],
  ['Country Code', 'Country %'],
  ['country_code', 'country_percentage']
);

const orgFields = repeatFields(
  'participating_org',
  [
    { type: 'string', required: false },
    { type: 'codelist', required: false, codelistKey: 'org_role' },
    { type: 'string', required: false },
  ],
  ['Org Name', 'Org Role', 'Org IATI Ref'],
  ['org_name', 'org_role', 'org_ref']
);

const contactFields = repeatFields(
  'contact',
  [
    { type: 'string', required: false },
    { type: 'string', required: false },
    { type: 'string', required: false },
    { type: 'string', required: false },
  ],
  ['Contact Name', 'Contact Email', 'Contact Phone', 'Contact Org'],
  ['contact_name', 'contact_email', 'contact_phone', 'contact_org']
);

const sdgFields = repeatFields(
  'sdg',
  [
    { type: 'codelist', required: false, codelistKey: 'sdg_goal' },
    { type: 'string', required: false },
    { type: 'number', required: false },
  ],
  ['SDG Goal', 'SDG Target', 'SDG %'],
  ['sdg_goal', 'sdg_target', 'sdg_percentage']
);

const policyMarkerFields = repeatFields(
  'policy_marker',
  [
    { type: 'string', required: false },
    { type: 'codelist', required: false, codelistKey: 'policy_significance' },
  ],
  ['Policy Marker Code', 'Policy Marker Significance'],
  ['policy_marker_code', 'policy_marker_significance']
);

export const ACTIVITY_IMPORT_FIELDS: ExcelFieldDefinition[] = [
  ...scalarFields,
  ...sectorFields,
  ...countryFields,
  ...orgFields,
  ...contactFields,
  ...sdgFields,
  ...policyMarkerFields,
];

/**
 * Names of repeating groups in display order, for section headers in the preview table.
 */
export const ACTIVITY_REPEAT_GROUPS: { key: string; label: string }[] = [
  { key: 'sector', label: 'Sectors (1-5)' },
  { key: 'country', label: 'Countries (1-5)' },
  { key: 'participating_org', label: 'Participating Organizations (1-5)' },
  { key: 'contact', label: 'Contacts (1-5)' },
  { key: 'sdg', label: 'SDG Alignment (1-5)' },
  { key: 'policy_marker', label: 'Policy Markers (1-5)' },
];

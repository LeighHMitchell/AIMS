import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory registry for now; could be sourced from schema files later
// Each entry describes an IATI element/attribute toggleable field
const REGISTRY_VERSION = 2;
const FIELD_REGISTRY = [
  // Core Activity Information
  { id: 'iati-activity/title', label: 'Title', category: 'Core', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/title/' },
  { id: 'iati-activity/description', label: 'Description', category: 'Core', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/description/' },
  { id: 'iati-activity/activity-status', label: 'Activity Status', category: 'Core', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/activity-status/' },
  { id: 'iati-activity/activity-scope', label: 'Activity Scope', category: 'Core', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/activity-scope/' },
  { id: 'iati-activity/activity-date[@type=start-planned]', label: 'Start Date (Planned)', category: 'Core', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/activity-date/' },
  { id: 'iati-activity/activity-date[@type=start-actual]', label: 'Start Date (Actual)', category: 'Core', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/activity-date/' },
  { id: 'iati-activity/activity-date[@type=end-planned]', label: 'End Date (Planned)', category: 'Core', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/activity-date/' },
  { id: 'iati-activity/activity-date[@type=end-actual]', label: 'End Date (Actual)', category: 'Core', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/activity-date/' },
  { id: 'iati-activity/contact-info', label: 'Contact Information', category: 'Core', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/contact-info/' },
  
  // Organizations
  { id: 'iati-activity/reporting-org', label: 'Reporting Organisation', category: 'Organizations', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/reporting-org/' },
  { id: 'iati-activity/participating-org', label: 'Participating Organisations', category: 'Organizations', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/participating-org/' },
  
  // Geography
  { id: 'iati-activity/recipient-country', label: 'Recipient Country', category: 'Geography', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/recipient-country/' },
  { id: 'iati-activity/recipient-region', label: 'Recipient Region', category: 'Geography', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/recipient-region/' },
  { id: 'iati-activity/location', label: 'Locations', category: 'Geography', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/location/' },
  
  // Classifications
  { id: 'iati-activity/sector', label: 'Sectors', category: 'Classifications', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/sector/' },
  { id: 'iati-activity/policy-marker', label: 'Policy Markers', category: 'Classifications', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/policy-marker/' },
  { id: 'iati-activity/collaboration-type', label: 'Collaboration Type', category: 'Classifications', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/collaboration-type/' },
  { id: 'iati-activity/default-flow-type', label: 'Default Flow Type', category: 'Classifications', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/default-flow-type/' },
  { id: 'iati-activity/default-aid-type', label: 'Default Aid Type', category: 'Classifications', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/default-aid-type/' },
  { id: 'iati-activity/default-finance-type', label: 'Default Finance Type', category: 'Classifications', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/default-finance-type/' },
  { id: 'iati-activity/default-tied-status', label: 'Default Tied Status', category: 'Classifications', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/default-tied-status/' },
  { id: 'iati-activity/country-budget-items', label: 'Country Budget Items', category: 'Classifications', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/country-budget-items/' },
  { id: 'iati-activity/humanitarian-scope', label: 'Humanitarian Scope', category: 'Classifications', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/humanitarian-scope/' },
  
  // Transaction-level Classifications (for reference, though these are typically handled at transaction level)
  { id: 'iati-activity/aid-type', label: 'Aid Type (Transaction-level)', category: 'Classifications', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/transaction/aid-type/' },
  { id: 'iati-activity/finance-type', label: 'Finance Type (Transaction-level)', category: 'Classifications', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/transaction/finance-type/' },
  { id: 'iati-activity/tied-status', label: 'Tied Status (Transaction-level)', category: 'Classifications', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/transaction/tied-status/' },
  
  // Financial
  { id: 'iati-activity/budget', label: 'Budgets', category: 'Financial', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/budget/' },
  { id: 'iati-activity/planned-disbursement', label: 'Planned Disbursements', category: 'Financial', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/planned-disbursement/' },
  { id: 'iati-activity/transaction', label: 'Transactions', category: 'Financial', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/transaction/' },
  { id: 'iati-activity/capital-spend', label: 'Capital Spend', category: 'Financial', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/capital-spend/' },
  
  // Results & Performance
  { id: 'iati-activity/result', label: 'Results', category: 'Results', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/results/' },
  
  // Documents
  { id: 'iati-activity/document-link', label: 'Documents', category: 'Documents', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/document-link/' },
  
  // Identifiers & Links
  { id: 'iati-activity/other-identifier', label: 'Other Identifiers', category: 'Identifiers', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/other-identifier/' },
  { id: 'iati-activity/tag', label: 'Tags', category: 'Identifiers', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/tag/' },
  { id: 'iati-activity/related-activity', label: 'Related Activities', category: 'Identifiers', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/related-activity/' },
  
  // Conditions & Terms
  { id: 'iati-activity/conditions', label: 'Conditions', category: 'Conditions & Terms', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/conditions/' },
  
  // Legacy & Specialized
  { id: 'iati-activity/legacy-data', label: 'Legacy Data', category: 'Legacy & Specialized', supported: false, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/legacy-data/' },
  { id: 'iati-activity/crs-add', label: 'CRS Additional Data', category: 'Legacy & Specialized', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/crs-add/' },
  { id: 'iati-activity/fss', label: 'Forward Spending Survey', category: 'Legacy & Specialized', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/fss/' },
];

export async function GET(_request: NextRequest) {
  const response = NextResponse.json({ version: REGISTRY_VERSION, fields: FIELD_REGISTRY });
  response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=900');
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}



import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory registry for now; could be sourced from schema files later
// Each entry describes an IATI element/attribute toggleable field
const REGISTRY_VERSION = 1;
const FIELD_REGISTRY = [
  { id: 'iati-activity/title', label: 'Title', category: 'Core', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/title/' },
  { id: 'iati-activity/description', label: 'Description', category: 'Core', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/description/' },
  { id: 'iati-activity/activity-date[@type=start-planned]', label: 'Start Date (Planned)', category: 'Core', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/activity-date/' },
  { id: 'iati-activity/activity-date[@type=end-planned]', label: 'End Date (Planned)', category: 'Core', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/activity-date/' },
  { id: 'iati-activity/participating-org', label: 'Participating Organisations', category: 'Organizations', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/participating-org/' },
  { id: 'iati-activity/recipient-country', label: 'Recipient Country', category: 'Geography', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/recipient-country/' },
  { id: 'iati-activity/recipient-region', label: 'Recipient Region', category: 'Geography', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/recipient-region/' },
  { id: 'iati-activity/sector', label: 'Sectors', category: 'Classifications', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/sector/' },
  { id: 'iati-activity/budget', label: 'Budgets', category: 'Financial', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/budget/' },
  { id: 'iati-activity/transaction', label: 'Transactions', category: 'Financial', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/transaction/' },
  { id: 'iati-activity/result', label: 'Results', category: 'Results', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/results/' },
  { id: 'iati-activity/document-link', label: 'Documents', category: 'Documents', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/document-link/' },
  { id: 'iati-activity/policy-marker', label: 'Policy Markers', category: 'Classifications', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/policy-marker/' },
  { id: 'iati-activity/collaboration-type', label: 'Collaboration Type', category: 'Classifications', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/collaboration-type/' },
  { id: 'iati-activity/aid-type', label: 'Aid Type', category: 'Classifications', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/aid-type/' },
  { id: 'iati-activity/finance-type', label: 'Finance Type', category: 'Classifications', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/finance-type/' },
  { id: 'iati-activity/tied-status', label: 'Tied Status', category: 'Classifications', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/tied-status/' },
  { id: 'iati-activity/other-identifier', label: 'Other Identifiers', category: 'Identifiers', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/other-identifier/' },
  { id: 'iati-activity/tag', label: 'Tags', category: 'Identifiers', supported: true, docs: 'https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/tag/' },
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



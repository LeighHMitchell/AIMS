/**
 * IATI DocumentCategory Codelist
 * Used for document-link/category/@code attribute
 * https://iatistandard.org/en/iati-standard/203/codelists/documentcategory/
 */

export interface DocumentCategory {
  code: string;
  name: string;
  description: string;
  category: 'A' | 'B';
}

export const DOCUMENT_CATEGORY: DocumentCategory[] = [
  // A — Activity-level documents
  { code: 'A01', name: 'Pre- and post-project impact appraisal', description: 'Assessment of activity\'s expected and actual impact.', category: 'A' },
  { code: 'A02', name: 'Objectives / Purpose of activity', description: 'Stated objectives or purpose of the activity.', category: 'A' },
  { code: 'A03', name: 'Intended ultimate beneficiaries', description: 'Description of intended ultimate beneficiaries.', category: 'A' },
  { code: 'A04', name: 'Conditions', description: 'Conditions associated with the activity.', category: 'A' },
  { code: 'A05', name: 'Budget', description: 'Activity budget document.', category: 'A' },
  { code: 'A06', name: 'Summary information about contract', description: 'Summary of contract terms.', category: 'A' },
  { code: 'A07', name: 'Review of project performance and evaluation', description: 'Performance review or evaluation report.', category: 'A' },
  { code: 'A08', name: 'Results, outcomes and outputs', description: 'Reports on results, outcomes and outputs.', category: 'A' },
  { code: 'A09', name: 'Memorandum of understanding', description: 'MoU between activity participants.', category: 'A' },
  { code: 'A10', name: 'Tender', description: 'Tender documentation.', category: 'A' },
  { code: 'A11', name: 'Contract', description: 'Contract documentation.', category: 'A' },
  { code: 'A12', name: 'Activity web page', description: 'A web page hosting activity information.', category: 'A' },
  // B — Organisation-level documents
  { code: 'B01', name: 'Annual report', description: 'Organisation\'s annual report.', category: 'B' },
  { code: 'B02', name: 'Institutional Strategy paper', description: 'Strategy or vision paper for the organisation.', category: 'B' },
  { code: 'B03', name: 'Country strategy paper', description: 'Strategy paper for a particular country.', category: 'B' },
  { code: 'B04', name: 'Aid Allocation Policy', description: 'Policy guiding aid allocation decisions.', category: 'B' },
  { code: 'B05', name: 'Procurement Policy and Procedure', description: 'Procurement policy and procedure document.', category: 'B' },
  { code: 'B06', name: 'Institutional Audit Report', description: 'Independent audit report for the organisation.', category: 'B' },
  { code: 'B07', name: 'Country Audit Report', description: 'Country-level audit report.', category: 'B' },
  { code: 'B08', name: 'Exclusions Policy', description: 'Policy on exclusion of certain types of activities.', category: 'B' },
  { code: 'B09', name: 'Institutional Evaluation Report', description: 'Evaluation report at the organisation level.', category: 'B' },
  { code: 'B10', name: 'Country Evaluation Report', description: 'Country-level evaluation report.', category: 'B' },
  { code: 'B11', name: 'Sector strategy', description: 'Strategy for a particular sector.', category: 'B' },
  { code: 'B12', name: 'Thematic strategy', description: 'Strategy for a particular thematic area.', category: 'B' },
  { code: 'B13', name: 'Country-level Memorandum of Understanding', description: 'Country-level MoU.', category: 'B' },
  { code: 'B14', name: 'Evaluations policy', description: 'Policy guiding evaluation activities.', category: 'B' },
  { code: 'B15', name: 'General Terms and Conditions', description: 'General terms and conditions.', category: 'B' },
  { code: 'B16', name: 'Organisation web page', description: 'Web page describing the organisation.', category: 'B' },
  { code: 'B17', name: 'Country/Region web page', description: 'Web page describing the organisation\'s work in a country or region.', category: 'B' },
  { code: 'B18', name: 'Sector web page', description: 'Web page describing the organisation\'s work in a sector.', category: 'B' },
];

export function getDocumentCategoryName(code: string | null | undefined): string {
  if (!code) return '';
  return DOCUMENT_CATEGORY.find(e => e.code === code)?.name ?? '';
}

import type { CodelistEntry } from './types';
import { ALL_CURRENCIES } from '@/data/currencies';
import { IATI_COUNTRIES } from '@/data/iati-countries';
import { IATI_ORGANIZATION_TYPES } from '@/data/iati-organization-types';
import { IATI_ACTIVITY_SCOPE } from '@/data/iati-activity-scope';
import { IATI_REGIONS } from '@/data/iati-regions';
import {
  AID_TYPE_DEFINITIONS,
  FINANCE_TYPE_DEFINITIONS,
  FLOW_TYPE_DEFINITIONS,
  TIED_STATUS_DEFINITIONS,
} from '@/data/codelist-definitions';
import dacSectorsData from '@/data/dac-sectors.json';

// Build codelist entries from existing data sources

const activityStatuses: CodelistEntry[] = [
  { code: '1', name: 'Pipeline' },
  { code: '2', name: 'Implementation' },
  { code: '3', name: 'Finalisation' },
  { code: '4', name: 'Closed' },
  { code: '5', name: 'Cancelled' },
  { code: '6', name: 'Suspended' },
];

const collaborationTypes: CodelistEntry[] = [
  { code: '1', name: 'Bilateral' },
  { code: '2', name: 'Multilateral (inflows)' },
  { code: '3', name: 'Multilateral (outflows)' },
  { code: '4', name: 'Bilateral, core contributions to NGOs and other private bodies' },
  { code: '6', name: 'Private sector outflows' },
  { code: '7', name: "Bilateral, ex-post reporting on NGOs' activities funded through core contributions" },
  { code: '8', name: 'Bilateral, triangular co-operation' },
];

const activityScopes: CodelistEntry[] = IATI_ACTIVITY_SCOPE.flatMap(group =>
  group.types.map(t => ({ code: t.code, name: t.name }))
);

const currencies: CodelistEntry[] = ALL_CURRENCIES.map(c => ({
  code: c.code,
  name: `${c.code} - ${c.name}`,
}));

const countries: CodelistEntry[] = IATI_COUNTRIES
  .filter(c => !c.withdrawn)
  .map(c => ({ code: c.code, name: c.name }));

const regions: CodelistEntry[] = IATI_REGIONS
  .filter(r => !r.withdrawn)
  .map(r => ({ code: r.code, name: r.name }));

// IATI Policy Marker codes (vocabulary 1 = OECD DAC CRS)
const policyMarkers: CodelistEntry[] = [
  { code: '1', name: 'Gender Equality' },
  { code: '2', name: 'Aid to Environment' },
  { code: '3', name: 'Participatory Development / Good Governance' },
  { code: '4', name: 'Trade Development' },
  { code: '5', name: 'Aid Targeting the Objectives of the Convention on Biological Diversity' },
  { code: '6', name: 'Aid Targeting the Objectives of the Framework Convention on Climate Change - Mitigation' },
  { code: '7', name: 'Aid Targeting the Objectives of the Framework Convention on Climate Change - Adaptation' },
  { code: '8', name: 'Aid Targeting the Objectives of the Convention to Combat Desertification' },
  { code: '9', name: 'Reproductive, Maternal, Newborn and Child Health (RMNCH)' },
  { code: '10', name: 'Disaster Risk Reduction (DRR)' },
  { code: '11', name: 'Disability' },
  { code: '12', name: 'Nutrition' },
];

const organizationTypes: CodelistEntry[] = IATI_ORGANIZATION_TYPES.map(t => ({
  code: t.code,
  name: t.name,
}));

function codelistFromDefinitions(
  defs: Record<string, { code: string; name: string }>
): CodelistEntry[] {
  return Object.values(defs).map(d => ({ code: d.code, name: d.name }));
}

const aidTypes = codelistFromDefinitions(AID_TYPE_DEFINITIONS);
const financeTypes = codelistFromDefinitions(FINANCE_TYPE_DEFINITIONS);
const flowTypes = codelistFromDefinitions(FLOW_TYPE_DEFINITIONS);
const tiedStatuses = codelistFromDefinitions(TIED_STATUS_DEFINITIONS);

// Flatten DAC sectors JSON: { "category": [{ code, name }] }
const sectors: CodelistEntry[] = Object.values(dacSectorsData as Record<string, Array<{ code: string; name: string }>>)
  .flat()
  .map(s => ({ code: s.code, name: s.name }));

const policySignificance: CodelistEntry[] = [
  { code: '0', name: 'Not targeted' },
  { code: '1', name: 'Significant objective' },
  { code: '2', name: 'Principal objective' },
];

const sdgGoals: CodelistEntry[] = [
  { code: '1', name: 'No Poverty' },
  { code: '2', name: 'Zero Hunger' },
  { code: '3', name: 'Good Health and Well-being' },
  { code: '4', name: 'Quality Education' },
  { code: '5', name: 'Gender Equality' },
  { code: '6', name: 'Clean Water and Sanitation' },
  { code: '7', name: 'Affordable and Clean Energy' },
  { code: '8', name: 'Decent Work and Economic Growth' },
  { code: '9', name: 'Industry, Innovation and Infrastructure' },
  { code: '10', name: 'Reduced Inequalities' },
  { code: '11', name: 'Sustainable Cities and Communities' },
  { code: '12', name: 'Responsible Consumption and Production' },
  { code: '13', name: 'Climate Action' },
  { code: '14', name: 'Life Below Water' },
  { code: '15', name: 'Life on Land' },
  { code: '16', name: 'Peace, Justice and Strong Institutions' },
  { code: '17', name: 'Partnerships for the Goals' },
];

const orgRoles: CodelistEntry[] = [
  { code: 'funding', name: 'Funding' },
  { code: 'implementing', name: 'Implementing' },
  { code: 'extending', name: 'Extending' },
  { code: 'accountable', name: 'Accountable' },
];

const budgetStatuses: CodelistEntry[] = [
  { code: '1', name: 'On budget' },
  { code: '2', name: 'Off budget' },
];

const transactionTypes: CodelistEntry[] = [
  { code: '1', name: 'Incoming Funds' },
  { code: '2', name: 'Outgoing Commitment' },
  { code: '3', name: 'Disbursement' },
  { code: '4', name: 'Expenditure' },
  { code: '5', name: 'Interest Payment' },
  { code: '6', name: 'Loan Repayment' },
  { code: '7', name: 'Reimbursement' },
  { code: '8', name: 'Purchase of Equity' },
  { code: '9', name: 'Sale of Equity' },
  { code: '10', name: 'Credit Guarantee' },
  { code: '11', name: 'Incoming Commitment' },
  { code: '12', name: 'Outgoing Pledge' },
  { code: '13', name: 'Incoming Pledge' },
];

const disbursementChannels: CodelistEntry[] = [
  { code: '1', name: 'Central Ministry of Finance/Treasury' },
  { code: '2', name: 'Directly to implementing institution' },
  { code: '3', name: 'Aid in kind via third party agencies' },
  { code: '4', name: 'Not reported' },
];

const transactionStatuses: CodelistEntry[] = [
  { code: 'draft', name: 'Draft' },
  { code: 'actual', name: 'Actual' },
];

// ---------- Registry ----------

const registry: Record<string, CodelistEntry[]> = {
  activity_status: activityStatuses,
  collaboration_type: collaborationTypes,
  activity_scope: activityScopes,
  currency: currencies,
  country: countries,
  region: regions,
  policy_marker: policyMarkers,
  organization_type: organizationTypes,
  aid_type: aidTypes,
  finance_type: financeTypes,
  flow_type: flowTypes,
  tied_status: tiedStatuses,
  sector: sectors,
  policy_significance: policySignificance,
  sdg_goal: sdgGoals,
  org_role: orgRoles,
  budget_status: budgetStatuses,
  transaction_type: transactionTypes,
  disbursement_channel: disbursementChannels,
  transaction_status: transactionStatuses,
};

/**
 * Get codelist entries for a given key.
 */
export function getCodelist(key: string): CodelistEntry[] {
  return registry[key] || [];
}

/**
 * Get all registered codelist keys.
 */
export function getAllCodelistKeys(): string[] {
  return Object.keys(registry);
}

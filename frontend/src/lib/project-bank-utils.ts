import type { ProjectPathway, ProjectStatus, RoutingResult, AppraisalStage, RoutingOutcome, FeasibilityStage, CategoryDecision, PPPSupportMechanism, ProjectStage, ProjectPhase, FS1Tab, FS2Tab } from '@/types/project-bank';

/**
 * Determines the routing pathway for a project based on FIRR and NDP alignment.
 * Implements the appraisal flowchart:
 * - No FIRR → enters pipeline for screening
 * - FIRR ≥ 10% + NDP aligned → private sector with state support
 * - FIRR ≥ 10% + not aligned → private sector, no state support
 * - FIRR < 10% + not aligned → rejected
 * - FIRR < 10% + NDP aligned → EIRR appraisal needed (ODA/PPP pathway)
 */
export function determineRouting(firr: number | null, ndpAligned: boolean): RoutingResult {
  if (firr === null || firr === undefined) {
    return {
      pathway: null,
      status: 'nominated',
      label: 'Enters pipeline for screening & feasibility study',
      description: 'No FIRR data yet. Project will be screened for MSDP alignment, then undergo feasibility study.',
      color: 'blue',
    };
  }

  if (firr >= 10 && ndpAligned) {
    return {
      pathway: 'private_supported',
      status: 'approved',
      label: 'Private sector with state support (Project Bank + Land Bank)',
      description: 'FIRR ≥ 10% and MSDP-aligned. Will be listed for private investment with state land/property support.',
      color: 'green',
    };
  }

  if (firr >= 10) {
    return {
      pathway: 'private_unsupported',
      status: 'approved',
      label: 'Private sector, no state support',
      description: 'FIRR ≥ 10% but outside MSDP. Open to private investment without state support.',
      color: 'green',
    };
  }

  if (!ndpAligned) {
    return {
      pathway: null,
      status: 'rejected',
      label: 'Rejected',
      description: 'FIRR < 10% and not MSDP-aligned. No basis for state support.',
      color: 'red',
    };
  }

  return {
    pathway: 'oda',
    status: 'appraisal',
    label: 'EIRR appraisal required — if ≥ 15%, enters PPP / ODA pathway',
    description: 'Not commercially viable but MSDP-aligned. If EIRR ≥ 15%, enters PPP mechanism. If ODA co-financing is sought, the project will also appear in the AIMS activity list.',
    color: 'purple',
  };
}

/** Status → Badge variant mapping */
export const STATUS_BADGE_VARIANT: Record<ProjectStatus, string> = {
  nominated: 'pb-entry',
  screening: 'pb-progress',
  appraisal: 'pb-review',
  approved: 'pb-approved',
  implementation: 'pb-active',
  completed: 'pb-done',
  rejected: 'pb-rejected',
};

/** Status display labels */
export const STATUS_LABELS: Record<ProjectStatus, string> = {
  nominated: 'Nominated',
  screening: 'Screening',
  appraisal: 'Appraisal',
  approved: 'Approved',
  implementation: 'Implementation',
  completed: 'Completed',
  rejected: 'Rejected',
};

/** Pipeline order for advancing status */
export const STATUS_ORDER: ProjectStatus[] = [
  'nominated', 'screening', 'appraisal', 'approved', 'implementation', 'completed',
];

/** Returns the next status in the pipeline */
export function getNextStatus(current: ProjectStatus): ProjectStatus | null {
  const idx = STATUS_ORDER.indexOf(current);
  if (idx === -1 || idx >= STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[idx + 1];
}

/** Pathway display labels */
export const PATHWAY_LABELS: Record<string, string> = {
  oda: 'ODA',
  ppp: 'PPP',
  private_supported: 'Private (Supported)',
  private_unsupported: 'Private',
  domestic_budget: 'Domestic Budget',
  unassigned: 'Unassigned',
};

/** PPP Contract Type labels */
export const PPP_CONTRACT_TYPE_LABELS: Record<string, string> = {
  availability_payment: 'Availability Payment',
  boo: 'Build–Own–Operate (BOO)',
  bot: 'Build–Operate–Transfer (BOT)',
  btl: 'Build–Transfer–Lease (BTL)',
  bto: 'Build–Transfer–Operate (BTO)',
  om: 'Operations & Maintenance (O&M)',
  other: 'Other',
};

/** PPP Contract Types with codes for dropdown display */
export const PPP_CONTRACT_TYPES = [
  { value: 'availability_payment', label: 'Availability Payment', code: 'AP' },
  { value: 'boo', label: 'Build–Own–Operate', code: 'BOO' },
  { value: 'bot', label: 'Build–Operate–Transfer', code: 'BOT' },
  { value: 'btl', label: 'Build–Transfer–Lease', code: 'BTL' },
  { value: 'bto', label: 'Build–Transfer–Operate', code: 'BTO' },
  { value: 'om', label: 'Operations & Maintenance', code: 'O&M' },
  { value: 'other', label: 'Other', code: 'OTH' },
] as const;

/** SEE Transfer Status labels */
export const SEE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  assessment: 'Assessment',
  valuation: 'Valuation',
  restructuring: 'Restructuring',
  tender: 'Tender',
  transferred: 'Transferred',
  cancelled: 'Cancelled',
};

/** SEE Transfer Mode labels */
export const SEE_TRANSFER_MODE_LABELS: Record<string, string> = {
  public_offering: 'Public Offering',
  auction: 'Auction',
  competitive_bid: 'Competitive Bid',
  swiss_challenge: 'Swiss Challenge',
  asset_sale: 'Asset Sale',
  management_buyout: 'Management Buyout',
  lease_concession: 'Lease/Concession',
  bot_boo: 'BOT/BOO',
  other: 'Other',
};

/** Monitoring report status labels */
export const MONITORING_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  submitted: 'Submitted',
  under_review: 'Under Review',
  reviewed: 'Reviewed',
  overdue: 'Overdue',
};

/** Compliance status labels */
export const COMPLIANCE_STATUS_LABELS: Record<string, string> = {
  compliant: 'Compliant',
  partially_compliant: 'Partially Compliant',
  non_compliant: 'Non-Compliant',
  not_assessed: 'Not Assessed',
};

/** Proposal status labels */
export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  received: 'Received',
  under_review: 'Under Review',
  rfp_published: 'RFP Published',
  counter_proposals_open: 'Counter Proposals Open',
  evaluation: 'Evaluation',
  awarded: 'Awarded',
  rejected: 'Rejected',
};

/** Pathway → color mapping */
export const PATHWAY_COLORS: Record<string, string> = {
  oda: 'text-blue-600',
  ppp: 'text-purple-600',
  private_supported: 'text-green-600',
  private_unsupported: 'text-green-600',
  domestic_budget: 'text-amber-600',
};

// ========================================================================
// Feasibility Study Framework
// ========================================================================

/** Feasibility stage display labels */
export const FEASIBILITY_STAGE_LABELS: Record<FeasibilityStage, string> = {
  registered: 'Registered',
  fs1_submitted: 'FS-1 Submitted',
  fs1_desk_screened: 'FS-1 Desk Screened',
  fs1_passed: 'FS-1 Passed',
  fs1_returned: 'FS-1 Returned',
  fs1_rejected: 'FS-1 Rejected',
  fs2_assigned: 'FS-2 Assigned',
  fs2_in_progress: 'FS-2 In Progress',
  fs2_completed: 'FS-2 Completed',
  fs2_desk_reviewed: 'FS-2 Desk Reviewed',
  fs2_senior_reviewed: 'FS-2 Senior Reviewed',
  fs2_returned: 'FS-2 Returned',
  categorized: 'Categorized',
  fs3_in_progress: 'FS-3 In Progress',
  fs3_completed: 'FS-3 Completed',
};

/** Feasibility stage badge styles — palette: Scarlet #dc2625, Pale Slate #cfd0d5, Blue Slate #4c5568, Cool Steel #7b95a7, Platinum #f1f4f8 */
export const FEASIBILITY_STAGE_BADGE_STYLES: Record<FeasibilityStage, { bg: string; text: string; border: string }> = {
  registered:          { bg: '#f1f4f8', text: '#4c5568', border: '#cfd0d5' },
  fs1_submitted:       { bg: '#f1f4f8', text: '#7b95a7', border: '#7b95a7' },
  fs1_desk_screened:   { bg: '#cfd0d5', text: '#4c5568', border: '#7b95a7' },
  fs1_passed:          { bg: '#4c5568', text: '#ffffff', border: '#4c5568' },
  fs1_returned:        { bg: '#f1f4f8', text: '#7b95a7', border: '#cfd0d5' },
  fs1_rejected:        { bg: '#fbe9e9', text: '#dc2625', border: '#dc2625' },
  fs2_assigned:        { bg: '#f1f4f8', text: '#7b95a7', border: '#7b95a7' },
  fs2_in_progress:     { bg: '#cfd0d5', text: '#4c5568', border: '#7b95a7' },
  fs2_completed:       { bg: '#7b95a7', text: '#ffffff', border: '#7b95a7' },
  fs2_desk_reviewed:   { bg: '#cfd0d5', text: '#4c5568', border: '#7b95a7' },
  fs2_senior_reviewed: { bg: '#4c5568', text: '#ffffff', border: '#4c5568' },
  fs2_returned:        { bg: '#f1f4f8', text: '#7b95a7', border: '#cfd0d5' },
  categorized:         { bg: '#4c5568', text: '#ffffff', border: '#4c5568' },
  fs3_in_progress:     { bg: '#cfd0d5', text: '#4c5568', border: '#7b95a7' },
  fs3_completed:       { bg: '#4c5568', text: '#ffffff', border: '#4c5568' },
};

/** Feasibility stage progression order */
export const FEASIBILITY_STAGE_ORDER: FeasibilityStage[] = [
  'registered',
  'fs1_submitted', 'fs1_desk_screened', 'fs1_passed',
  'fs2_assigned', 'fs2_in_progress', 'fs2_completed',
  'categorized',
  'fs3_in_progress', 'fs3_completed',
];

/** Category decision labels */
export const CATEGORY_LABELS: Record<CategoryDecision, string> = {
  category_a: 'Category A — Full Private',
  category_b: 'Category B — Government Budget',
  category_c: 'Category C — PPP',
};

/** Short category labels for badges */
export const CATEGORY_SHORT_LABELS: Record<CategoryDecision, string> = {
  category_a: 'Private (A)',
  category_b: 'Gov Budget (B)',
  category_c: 'PPP (C)',
};

/** PPP support mechanism labels */
export const PPP_SUPPORT_MECHANISM_LABELS: Record<PPPSupportMechanism, string> = {
  vgf: 'Viability Gap Funding (VGF)',
  mrg: 'Minimum Revenue Guarantee (MRG)',
  availability_payment: 'Availability Payment',
  interest_subsidy: 'Interest Subsidy',
  tax_incentive: 'Tax Incentive',
  land_grant: 'Land Grant',
  combined: 'Combined Mechanisms',
};

/** PPP support mechanisms with codes for dropdown display */
export const PPP_SUPPORT_MECHANISMS = [
  { value: 'vgf', label: 'Viability Gap Funding', code: 'VGF' },
  { value: 'mrg', label: 'Minimum Revenue Guarantee', code: 'MRG' },
  { value: 'availability_payment', label: 'Availability Payment', code: 'AP' },
  { value: 'interest_subsidy', label: 'Interest Subsidy', code: 'IS' },
  { value: 'tax_incentive', label: 'Tax Incentive', code: 'TI' },
  { value: 'land_grant', label: 'Land Grant', code: 'LG' },
  { value: 'combined', label: 'Combined Mechanisms', code: 'CMB' },
] as const;

/** VGF modalities with codes for dropdown display */
export const VGF_MODALITIES = [
  { value: 'capital_grant', label: 'Capital Grant (upfront)', code: 'CG' },
  { value: 'annuity', label: 'Annuity Payments', code: 'AP' },
  { value: 'interest_subsidy', label: 'Interest Subsidy', code: 'IS' },
  { value: 'tax_incentive', label: 'Tax Incentive', code: 'TI' },
  { value: 'land_grant', label: 'Land Grant (in-kind)', code: 'LG' },
] as const;

/** Budget allocation statuses with codes for dropdown display */
export const BUDGET_ALLOCATION_STATUSES = [
  { value: 'not_requested', label: 'Not Requested', code: '1' },
  { value: 'requested', label: 'Requested', code: '2' },
  { value: 'provisional', label: 'Provisional', code: '3' },
  { value: 'approved', label: 'Approved', code: '4' },
] as const;

/** Payment schedule types with codes for dropdown display */
export const PAYMENT_SCHEDULE_TYPES = [
  { value: 'monthly', label: 'Monthly', code: 'M' },
  { value: 'quarterly', label: 'Quarterly', code: 'Q' },
  { value: 'annual', label: 'Annual', code: 'A' },
] as const;

/** Public-good sectors that lean toward government budget (Category B) */
const PUBLIC_GOOD_SECTORS = ['Education', 'Health', 'Governance', 'Social Protection', 'WASH'];

/**
 * Determines the system's category recommendation based on FIRR/EIRR results.
 * - Category A (Private): FIRR >= 10% (commercially viable)
 * - Category C (PPP): FIRR < 10% + NDP-aligned + EIRR >= 15%
 * - Category B (Gov Budget): FIRR < 10% + NDP-aligned + EIRR < 15%, or public-good sectors
 */
export function determineCategoryRecommendation(
  firr: number | null,
  eirr: number | null,
  ndpAligned: boolean,
  sectorType?: string,
): CategoryDecision | null {
  if (firr === null) return null;

  // Commercially viable → private sector
  if (firr >= 10) return 'category_a';

  // Not NDP-aligned and FIRR < 10% → no recommendation (would be rejected)
  if (!ndpAligned) return null;

  // Public-good sectors lean toward government budget
  if (sectorType && PUBLIC_GOOD_SECTORS.includes(sectorType)) return 'category_b';

  // EIRR check for PPP vs government budget
  if (eirr !== null && eirr >= 15) return 'category_c';

  return 'category_b';
}

/**
 * Checks if a project from the same ministry was rejected within the cool-down period.
 * Client-side helper — the DB trigger enforces this server-side.
 */
export function checkCooldownViolation(
  rejectedAt: string | null,
  cooldownMonths: number = 6,
): { blocked: boolean; cooldownEnds: Date | null } {
  if (!rejectedAt) return { blocked: false, cooldownEnds: null };
  const rejectedDate = new Date(rejectedAt);
  const cooldownEnds = new Date(rejectedDate);
  cooldownEnds.setMonth(cooldownEnds.getMonth() + cooldownMonths);
  return {
    blocked: new Date() < cooldownEnds,
    cooldownEnds,
  };
}

/** Format currency value (e.g. $320M, $1.2B) */
export function formatCurrency(value: number | null | undefined, currency: string = 'USD'): string {
  if (value === null || value === undefined) return '—';
  const symbol = currency + ' ';
  if (value >= 1_000_000_000) {
    return `${symbol}${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${symbol}${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${symbol}${(value / 1_000).toFixed(0)}K`;
  }
  return `${symbol}${value.toLocaleString()}`;
}

/** Format currency as "USD 100M" with separate prefix and amount for split styling */
export function formatCurrencyParts(value: number | null | undefined, currency: string = 'USD'): { prefix: string; amount: string } | null {
  if (value === null || value === undefined) return null;
  const prefix = currency || 'USD';
  if (value >= 1_000_000_000) {
    return { prefix, amount: `${(value / 1_000_000_000).toFixed(1)}B` };
  }
  if (value >= 1_000_000) {
    return { prefix, amount: `${(value / 1_000_000).toFixed(1)}M` };
  }
  if (value >= 1_000) {
    return { prefix, amount: `${(value / 1_000).toFixed(0)}K` };
  }
  return { prefix, amount: value.toLocaleString() };
}

/** Format percentage with color class */
export function getPercentageColor(value: number | null, threshold: number): string {
  if (value === null) return 'text-muted-foreground';
  return value >= threshold ? 'text-green-600' : 'text-red-600';
}

/** OECD DAC sector codes commonly used */
export const SECTORS = [
  'Transport', 'Energy', 'Health', 'Education', 'Agriculture',
  'Water Resources', 'ICT', 'Industrial', 'Environment', 'WASH',
  'Governance', 'Multi-sector', 'Social Protection', 'Housing',
  'Banking & Finance', 'Trade', 'Tourism', 'Mining',
] as const;

/** Myanmar regions/states */
export const REGIONS = [
  'Nationwide', 'Yangon', 'Mandalay', 'Naypyitaw',
  'Kachin', 'Kayah', 'Kayin', 'Chin', 'Mon', 'Rakhine', 'Shan',
  'Sagaing', 'Tanintharyi', 'Bago', 'Magway', 'Ayeyarwady',
] as const;

/** Commitment status display labels */
export const COMMITMENT_STATUS_LABELS: Record<string, string> = {
  expression_of_interest: 'Expression of Interest',
  pipeline: 'Pipeline',
  pledged: 'Pledged',
  committed: 'Committed',
  disbursing: 'Disbursing',
  disbursed: 'Disbursed',
  cancelled: 'Cancelled',
};

/** Instrument type display labels */
export const INSTRUMENT_TYPE_LABELS: Record<string, string> = {
  grant: 'Grant',
  concessional_loan: 'Concessional Loan',
  loan: 'Loan',
  equity: 'Equity',
  guarantee: 'Guarantee',
  ta_grant: 'TA Grant',
  other: 'Other',
};

/** Donor type display labels */
export const DONOR_TYPE_LABELS: Record<string, string> = {
  bilateral: 'Bilateral',
  multilateral: 'Multilateral',
  un_agency: 'UN Agency',
  private: 'Private',
  ngo: 'NGO',
  other: 'Other',
};

// ========================================================================
// Appraisal Wizard Utilities
// ========================================================================

/** Display labels for each appraisal stage */
export const APPRAISAL_STAGE_LABELS: Record<AppraisalStage, string> = {
  intake: 'Project Intake',
  preliminary_fs: 'Preliminary Feasibility Study',
  msdp_screening: 'MSDP Screening',
  firr_assessment: 'Financial Analysis (FIRR)',
  eirr_assessment: 'Economic Analysis (EIRR)',
  vgf_assessment: 'PPP / VGF Structuring',
  dp_consultation: 'Review & Submit',
  routing_complete: 'Complete',
  rejected: 'Rejected',
};

/** Ordered stage sequence for the wizard */
export const APPRAISAL_STAGE_ORDER: AppraisalStage[] = [
  'intake',
  'preliminary_fs',
  'msdp_screening',
  'firr_assessment',
  'eirr_assessment',
  'vgf_assessment',
  'dp_consultation',
];

/** Project type dropdown options */
export const PROJECT_TYPES = [
  'Infrastructure',
  'Social Services',
  'Economic Development',
  'Environmental',
  'Institutional',
  'Emergency/Humanitarian',
  'Technical Assistance',
  'Other',
] as const;

/** Sub-sector mapping by sector */
export const SUB_SECTORS: Record<string, string[]> = {
  Transport: ['Roads & Highways', 'Railways', 'Ports & Waterways', 'Airports', 'Urban Transit', 'Rural Transport'],
  Energy: ['Power Generation', 'Transmission & Distribution', 'Renewable Energy', 'Rural Electrification', 'Oil & Gas'],
  Health: ['Primary Healthcare', 'Hospitals', 'Disease Control', 'Maternal Health', 'Nutrition', 'Health Systems'],
  Education: ['Primary Education', 'Secondary Education', 'Higher Education', 'TVET', 'Teacher Training'],
  Agriculture: ['Crop Production', 'Irrigation', 'Livestock', 'Fisheries', 'Agro-processing', 'Food Security'],
  'Water Resources': ['Water Supply', 'Sanitation', 'Flood Control', 'Watershed Management'],
  ICT: ['Telecommunications', 'E-Government', 'Digital Infrastructure', 'Internet Access'],
  Industrial: ['SEZ Development', 'Manufacturing', 'SME Development', 'Industrial Parks'],
  Environment: ['Forest Conservation', 'Climate Adaptation', 'Waste Management', 'Biodiversity'],
  WASH: ['Water Supply', 'Sanitation', 'Hygiene Promotion'],
  Governance: ['Public Admin', 'Justice & Rule of Law', 'Decentralization', 'Statistics'],
  'Multi-sector': ['Integrated Development', 'Community Development'],
  'Social Protection': ['Social Safety Nets', 'Disability Services', 'Elderly Care', 'Poverty Reduction'],
  Housing: ['Affordable Housing', 'Urban Development', 'Slum Upgrading'],
  'Banking & Finance': ['Financial Inclusion', 'Microfinance', 'Capital Markets'],
  Trade: ['Trade Facilitation', 'Export Promotion', 'Market Access'],
  Tourism: ['Eco-Tourism', 'Heritage Tourism', 'Tourism Infrastructure'],
  Mining: ['Mining Development', 'Artisanal Mining', 'Mine Safety'],
};

/** Revenue source options for multi-select */
export const REVENUE_SOURCE_OPTIONS = [
  'Toll fees',
  'User charges',
  'Lease income',
  'Tariffs',
  'Advertising revenue',
  'Concession fees',
  'Service charges',
  'Parking fees',
  'Rental income',
  'Other',
] as const;

/** Environmental/social impact level options */
export const IMPACT_LEVELS = [
  { value: 'negligible', label: 'Negligible', code: '1', description: 'No measurable impact expected; routine activities only' },
  { value: 'low', label: 'Low', code: '2', description: 'Minor, temporary, and easily mitigated effects' },
  { value: 'moderate', label: 'Moderate', code: '3', description: 'Noticeable effects that require a mitigation plan' },
  { value: 'significant', label: 'Significant', code: '4', description: 'Substantial effects on ecosystems or communities; full assessment required' },
  { value: 'major', label: 'Major', code: '5', description: 'Severe, potentially irreversible impacts; independent review required' },
] as const;

/** Technical design maturity levels */
export const TECHNICAL_MATURITY_LEVELS = [
  { value: 'concept', label: 'Concept Only', code: '1' },
  { value: 'preliminary', label: 'Preliminary Design', code: '2' },
  { value: 'detailed', label: 'Detailed Design', code: '3' },
  { value: 'construction_ready', label: 'Construction-Ready', code: '4' },
] as const;

/**
 * Determine which appraisal stages to display based on FIRR result and NDP alignment.
 * Stages 5-6 (EIRR + VGF) only appear when FIRR < 10% AND project is MSDP-aligned.
 */
export function getVisibleStages(firrPercent: number | null, ndpAligned: boolean): AppraisalStage[] {
  const alwaysVisible: AppraisalStage[] = ['intake', 'preliminary_fs', 'msdp_screening', 'firr_assessment'];

  // If FIRR hasn't been calculated yet, show just the base stages + final
  if (firrPercent === null) {
    return [...alwaysVisible, 'dp_consultation'];
  }

  // FIRR >= 10%: commercially viable, skip economic analysis
  if (firrPercent >= 10) {
    return [...alwaysVisible, 'dp_consultation'];
  }

  // FIRR < 10% + not NDP aligned: rejected, go to final for review
  if (!ndpAligned) {
    return [...alwaysVisible, 'dp_consultation'];
  }

  // FIRR < 10% + NDP aligned: requires economic analysis → full stages
  return [...alwaysVisible, 'eirr_assessment', 'vgf_assessment', 'dp_consultation'];
}

export interface FullRoutingResult {
  outcome: RoutingOutcome | null;
  label: string;
  description: string;
  color: 'green' | 'blue' | 'purple' | 'amber' | 'red';
  nextSteps: string;
}

/**
 * Enhanced routing determination returning RoutingOutcome + rich metadata.
 * Used in Stage 4+ to show the routing decision banner.
 */
export function determineFullRouting(
  firrPercent: number | null,
  eirrPercent: number | null,
  ndpAligned: boolean,
  hasData: boolean = false,
): FullRoutingResult {
  if (firrPercent === null && !hasData) {
    return {
      outcome: null,
      label: 'Awaiting Financial Analysis',
      description: 'Complete the cost table to calculate FIRR.',
      color: 'blue',
      nextSteps: 'Enter project costs and revenues to calculate FIRR.',
    };
  }

  if (firrPercent === null && hasData) {
    return {
      outcome: null,
      label: 'FIRR Could Not Be Calculated',
      description: 'The FIRR requires at least one year with a net outflow (costs exceeding revenue) followed by years with net inflows. Check that your CAPEX figures are realistic — most projects have higher upfront costs than revenue in early years.',
      color: 'amber',
      nextSteps: 'Review your cost and revenue projections to ensure they reflect the expected investment profile.',
    };
  }

  if (firrPercent >= 10 && ndpAligned) {
    return {
      outcome: 'private_with_state_support',
      label: 'Likely Commercially Viable — Private Sector with State Support',
      description: `FIRR ${firrPercent.toFixed(1)}% ≥ 10% and MSDP-aligned. This project is likely to be eligible for private investment with state land/property support via the Project Bank and Land Bank.`,
      color: 'green',
      nextSteps: 'You may proceed to submit for review. If approved, the project will be listed for private investor engagement.',
    };
  }

  if (firrPercent >= 10) {
    return {
      outcome: 'private_no_support',
      label: 'Likely Commercially Viable — Private Sector',
      description: `FIRR ${firrPercent.toFixed(1)}% ≥ 10% but not MSDP-aligned. This project may be suitable for private investment without state support.`,
      color: 'blue',
      nextSteps: 'You may proceed to submit for review. The review board will make the final determination.',
    };
  }

  if (!ndpAligned) {
    return {
      outcome: 'rejected_not_msdp',
      label: 'At Risk of Rejection — Below Viability Threshold',
      description: `FIRR ${firrPercent.toFixed(1)}% is below the 10% commercial viability threshold and the project is not aligned with MSDP. Without alignment, there is no basis for state support or further economic analysis.`,
      color: 'red',
      nextSteps: 'Consider revising the project scope, improving revenue projections, or establishing MSDP alignment before submitting. The review board is likely to reject projects that are neither commercially viable nor nationally aligned.',
    };
  }

  // FIRR < 10% + NDP aligned → check EIRR
  if (eirrPercent === null) {
    return {
      outcome: null,
      label: 'May Require Economic Analysis',
      description: `FIRR ${firrPercent.toFixed(1)}% is below 10%, but the project is MSDP-aligned. This means it could still qualify through an economic analysis (EIRR) that measures broader social returns.`,
      color: 'amber',
      nextSteps: 'Complete the Economic Analysis (EIRR) to demonstrate whether the project generates sufficient social returns to justify public investment.',
    };
  }

  if (eirrPercent >= 15) {
    return {
      outcome: 'ppp_mechanism',
      label: 'Likely Economically Viable — PPP Mechanism',
      description: `EIRR ${eirrPercent.toFixed(1)}% ≥ 15%. This project is likely to qualify for a PPP mechanism with potential Viability Gap Funding.`,
      color: 'purple',
      nextSteps: 'You may proceed to PPP/VGF structuring. The review board will determine the required subsidy and partnership model.',
    };
  }

  return {
    outcome: 'rejected_low_eirr',
    label: 'At Risk of Rejection — Insufficient Economic Returns',
    description: `EIRR ${eirrPercent.toFixed(1)}% is below the 15% threshold. The economic returns may not be sufficient to justify state investment at this stage.`,
    color: 'red',
    nextSteps: 'Consider revising the project scope or cost structure to improve economic returns before submitting. The review board is likely to reject projects below this threshold.',
  };
}

// ========================================================================
// Unified Phase-Gate Utilities
// ========================================================================

/** Display labels for each unified project stage */
export const PROJECT_STAGE_LABELS: Record<ProjectStage, string> = {
  intake_draft: 'Draft',
  intake_submitted: 'Pending Review',
  intake_desk_claimed: 'Desk Review',
  intake_desk_screened: 'Senior Review',
  intake_approved: 'Approved',
  intake_returned: 'Returned',
  intake_rejected: 'Rejected',
  fs1_draft: 'Feasibility — Draft',
  fs1_submitted: 'Feasibility — Pending Review',
  fs1_desk_claimed: 'Feasibility — Desk Review',
  fs1_approved: 'Feasibility — Approved',
  fs1_returned: 'Feasibility — Returned',
  fs1_rejected: 'Feasibility — Rejected',
  fs2_assigned: 'Detailed Study — Assigned',
  fs2_in_progress: 'Detailed Study — In Progress',
  fs2_completed: 'Detailed Study — Completed',
  fs2_desk_claimed: 'Detailed Study — Desk Review',
  fs2_desk_reviewed: 'Detailed Study — Senior Review',
  fs2_senior_reviewed: 'Detailed Study — Senior Reviewed',
  fs2_returned: 'Detailed Study — Returned',
  fs2_categorized: 'Categorized',
  fs3_in_progress: 'PPP Structuring — In Progress',
  fs3_completed: 'PPP Structuring — Completed',
};

/** Badge styles for each unified project stage — palette: Scarlet #dc2625, Pale Slate #cfd0d5, Blue Slate #4c5568, Cool Steel #7b95a7, Platinum #f1f4f8 */
export const PROJECT_STAGE_BADGE_STYLES: Record<ProjectStage, { bg: string; text: string; border: string }> = {
  intake_draft:          { bg: '#f1f4f8', text: '#4c5568', border: '#cfd0d5' },
  intake_submitted:      { bg: '#f1f4f8', text: '#7b95a7', border: '#7b95a7' },
  intake_desk_claimed:   { bg: '#cfd0d5', text: '#4c5568', border: '#7b95a7' },
  intake_desk_screened:  { bg: '#4c5568', text: '#ffffff', border: '#4c5568' },
  intake_approved:       { bg: '#4c5568', text: '#ffffff', border: '#4c5568' },
  intake_returned:       { bg: '#f1f4f8', text: '#7b95a7', border: '#cfd0d5' },
  intake_rejected:       { bg: '#fbe9e9', text: '#dc2625', border: '#dc2625' },
  fs1_draft:             { bg: '#f1f4f8', text: '#4c5568', border: '#cfd0d5' },
  fs1_submitted:         { bg: '#f1f4f8', text: '#7b95a7', border: '#7b95a7' },
  fs1_desk_claimed:      { bg: '#cfd0d5', text: '#4c5568', border: '#7b95a7' },
  fs1_approved:          { bg: '#4c5568', text: '#ffffff', border: '#4c5568' },
  fs1_returned:          { bg: '#f1f4f8', text: '#7b95a7', border: '#cfd0d5' },
  fs1_rejected:          { bg: '#fbe9e9', text: '#dc2625', border: '#dc2625' },
  fs2_assigned:          { bg: '#f1f4f8', text: '#7b95a7', border: '#7b95a7' },
  fs2_in_progress:       { bg: '#cfd0d5', text: '#4c5568', border: '#7b95a7' },
  fs2_completed:         { bg: '#7b95a7', text: '#ffffff', border: '#7b95a7' },
  fs2_desk_claimed:      { bg: '#cfd0d5', text: '#4c5568', border: '#7b95a7' },
  fs2_desk_reviewed:     { bg: '#4c5568', text: '#ffffff', border: '#4c5568' },
  fs2_senior_reviewed:   { bg: '#4c5568', text: '#ffffff', border: '#4c5568' },
  fs2_returned:          { bg: '#f1f4f8', text: '#7b95a7', border: '#cfd0d5' },
  fs2_categorized:       { bg: '#4c5568', text: '#ffffff', border: '#4c5568' },
  fs3_in_progress:       { bg: '#cfd0d5', text: '#4c5568', border: '#7b95a7' },
  fs3_completed:         { bg: '#4c5568', text: '#ffffff', border: '#4c5568' },
};

/** Extract the phase from a project_stage */
export function getPhase(stage: ProjectStage): ProjectPhase {
  // intake_approved means intake is done — the project is now in the FS-1 phase
  if (stage === 'intake_approved') return 'fs1';
  if (stage === 'fs1_approved') return 'fs2';
  if (stage.startsWith('intake_')) return 'intake';
  if (stage.startsWith('fs1_')) return 'fs1';
  if (stage.startsWith('fs2_')) return 'fs2';
  if (stage.startsWith('fs3_')) return 'fs3';
  return 'fs3';
}

/** Phase display labels */
export const PHASE_LABELS: Record<ProjectPhase, string> = {
  intake: 'Project Intake',
  fs1: 'Preliminary Feasibility Study',
  fs2: 'Detailed Feasibility Study',
  fs3: 'PPP Transaction Structuring',
};

/** FS-1 tab labels */
export const FS1_TAB_LABELS: Record<FS1Tab, string> = {
  technical: 'Technical',
  revenue: 'Revenue',
  environmental: 'Environmental',
  msdp: 'MSDP Alignment',
  firr: 'Financial Analysis',
};

/** FS-2 tab labels */
export const FS2_TAB_LABELS: Record<FS2Tab, string> = {
  overview: 'Study Overview',
  demand: 'Demand Analysis',
  technical: 'Technical Analysis',
  financial: 'Financial Analysis',
  economic: 'Economic Analysis',
  environmental: 'Environmental & Social',
  risk: 'Risk Assessment',
  implementation: 'Implementation',
};

/** Whether a form is locked (read-only) based on project_stage */
export function isFormLocked(stage: ProjectStage): boolean {
  // Submitted = awaiting review, rejected = terminal — both lock the form.
  // Approved and draft/returned are NOT locked (approved means proceed to next phase).
  // FS-2 completed/reviewed/categorized stages lock the form.
  const fs2LockedStages: ProjectStage[] = ['fs2_completed', 'fs2_desk_reviewed', 'fs2_senior_reviewed', 'fs2_categorized'];
  return stage.endsWith('_submitted') || stage.endsWith('_rejected') || fs2LockedStages.includes(stage);
}

/** Whether a form is editable (draft or returned) */
export function isFormEditable(stage: ProjectStage): boolean {
  return stage.endsWith('_draft') || stage.endsWith('_returned') || stage.endsWith('_approved');
}

/** Get lock reason message */
export function getLockMessage(stage: ProjectStage): string | null {
  if (stage.endsWith('_submitted')) return 'This form is locked — awaiting review board decision.';
  if (stage.endsWith('_rejected')) return 'This project has been rejected.';
  return null;
}

/** Get return message */
export function getReturnMessage(stage: ProjectStage): string | null {
  if (stage.endsWith('_returned')) return 'This project was returned. Please address the reviewer\'s comments and resubmit.';
  return null;
}

/** Gate status between phases */
export type GateStatus = 'locked' | 'awaiting_review' | 'approved' | 'returned' | 'rejected';

/** Get the gate status for transitions between phases */
export function getGateStatus(stage: ProjectStage, gate: 'intake_to_fs1' | 'fs1_to_fs2' | 'fs2_to_fs3'): GateStatus {
  if (gate === 'intake_to_fs1') {
    if (stage === 'intake_submitted' || stage === 'intake_desk_claimed' || stage === 'intake_desk_screened') return 'awaiting_review';
    if (stage === 'intake_approved' || stage.startsWith('fs1_') || stage.startsWith('fs2_') || stage.startsWith('fs3_')) return 'approved';
    if (stage === 'intake_returned') return 'returned';
    if (stage === 'intake_rejected') return 'rejected';
    return 'locked';
  }
  if (gate === 'fs1_to_fs2') {
    if (stage === 'fs1_submitted') return 'awaiting_review';
    if (stage === 'fs1_approved' || stage.startsWith('fs2_') || stage.startsWith('fs3_')) return 'approved';
    if (stage === 'fs1_returned') return 'returned';
    if (stage === 'fs1_rejected') return 'rejected';
    return 'locked';
  }
  // fs2_to_fs3
  if (stage === 'fs2_completed' || stage === 'fs2_desk_reviewed' || stage === 'fs2_senior_reviewed') return 'awaiting_review';
  if (stage === 'fs2_categorized' || stage.startsWith('fs3_')) return 'approved';
  if (stage === 'fs2_returned') return 'returned';
  return 'locked';
}

import type { ProjectPathway, ProjectStatus, RoutingResult, AppraisalStage, RoutingOutcome, FeasibilityStage, CategoryDecision, PPPSupportMechanism } from '@/types/project-bank';

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
  nominated: 'blue',
  screening: 'amber',
  appraisal: 'purple',
  approved: 'success',
  implementation: 'teal',
  completed: 'gray',
  rejected: 'destructive',
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
  categorized: 'Categorized',
  fs3_in_progress: 'FS-3 In Progress',
  fs3_completed: 'FS-3 Completed',
};

/** Feasibility stage badge styles */
export const FEASIBILITY_STAGE_BADGE_STYLES: Record<FeasibilityStage, { bg: string; text: string; border: string }> = {
  registered:        { bg: '#f1f4f8', text: '#4c5568', border: '#cfd0d5' },
  fs1_submitted:     { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  fs1_desk_screened: { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
  fs1_passed:        { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  fs1_returned:      { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  fs1_rejected:      { bg: '#fecaca', text: '#991b1b', border: '#f87171' },
  fs2_assigned:      { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
  fs2_in_progress:   { bg: '#c7d2fe', text: '#3730a3', border: '#818cf8' },
  fs2_completed:     { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  categorized:       { bg: '#4c5568', text: '#ffffff', border: '#4c5568' },
  fs3_in_progress:   { bg: '#e9d5ff', text: '#6b21a8', border: '#c084fc' },
  fs3_completed:     { bg: '#dcfce7', text: '#166534', border: '#86efac' },
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
  const symbol = currency === 'USD' ? '$' : currency + ' ';
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

/** Environmental/social impact level options */
export const IMPACT_LEVELS = [
  { value: 'negligible', label: 'Negligible' },
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'significant', label: 'Significant' },
  { value: 'major', label: 'Major' },
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
): FullRoutingResult {
  if (firrPercent === null) {
    return {
      outcome: null,
      label: 'Awaiting Financial Analysis',
      description: 'Complete the cost table to calculate FIRR.',
      color: 'blue',
      nextSteps: 'Enter project costs and revenues to calculate FIRR.',
    };
  }

  if (firrPercent >= 10 && ndpAligned) {
    return {
      outcome: 'private_with_state_support',
      label: 'Commercially Viable — Private Sector with State Support',
      description: `FIRR ${firrPercent.toFixed(1)}% ≥ 10% and MSDP-aligned. Project will be listed for private investment with state land/property support via Project Bank and Land Bank.`,
      color: 'green',
      nextSteps: 'Proceed to Review & Submit. Project will be listed in the Project Bank for private investor engagement.',
    };
  }

  if (firrPercent >= 10) {
    return {
      outcome: 'private_no_support',
      label: 'Commercially Viable — Private Sector',
      description: `FIRR ${firrPercent.toFixed(1)}% ≥ 10% but not MSDP-aligned. Open to private investment without state support.`,
      color: 'blue',
      nextSteps: 'Proceed to Review & Submit. Project is commercially viable for private investment.',
    };
  }

  if (!ndpAligned) {
    return {
      outcome: 'rejected_not_msdp',
      label: 'Rejected — Not Viable, Not Aligned',
      description: `FIRR ${firrPercent.toFixed(1)}% < 10% and not MSDP-aligned. No basis for state support or economic analysis.`,
      color: 'red',
      nextSteps: 'Project does not qualify for further appraisal. Consider revising the scope or alignment.',
    };
  }

  // FIRR < 10% + NDP aligned → check EIRR
  if (eirrPercent === null) {
    return {
      outcome: null,
      label: 'Requires Economic Analysis',
      description: `FIRR ${firrPercent.toFixed(1)}% < 10% but MSDP-aligned. Proceed to EIRR assessment to determine economic viability.`,
      color: 'amber',
      nextSteps: 'Complete the Economic Analysis (EIRR) to determine if the project generates sufficient social returns.',
    };
  }

  if (eirrPercent >= 15) {
    return {
      outcome: 'ppp_mechanism',
      label: 'Economically Viable — PPP Mechanism',
      description: `EIRR ${eirrPercent.toFixed(1)}% ≥ 15%. Project qualifies for PPP mechanism with potential Viability Gap Funding.`,
      color: 'purple',
      nextSteps: 'Proceed to PPP/VGF structuring to determine the required subsidy and partnership model.',
    };
  }

  return {
    outcome: 'rejected_low_eirr',
    label: 'Rejected — Insufficient Economic Returns',
    description: `EIRR ${eirrPercent.toFixed(1)}% < 15%. Economic returns insufficient to justify state investment.`,
    color: 'red',
    nextSteps: 'Project does not meet the economic viability threshold. Consider scope revision.',
  };
}

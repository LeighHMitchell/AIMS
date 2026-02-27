export type ProjectStatus = 'nominated' | 'screening' | 'appraisal' | 'approved' | 'implementation' | 'completed' | 'rejected';

export type ProjectPathway = 'oda' | 'ppp' | 'private_supported' | 'private_unsupported' | 'domestic_budget';

export type DonorType = 'bilateral' | 'multilateral' | 'un_agency' | 'private' | 'ngo' | 'other';

export type InstrumentType = 'grant' | 'concessional_loan' | 'loan' | 'equity' | 'guarantee' | 'ta_grant' | 'other';

export type CommitmentStatus = 'expression_of_interest' | 'pipeline' | 'pledged' | 'committed' | 'disbursing' | 'disbursed' | 'cancelled';

export type AppraisalType = 'preliminary_fs' | 'detailed_fs' | 'eirr' | 'vgf';


export type AppraisalStage =
  | 'intake' | 'preliminary_fs' | 'msdp_screening' | 'firr_assessment'
  | 'eirr_assessment' | 'vgf_assessment' | 'dp_consultation' | 'routing_complete' | 'rejected';

export type RoutingOutcome =
  | 'private_with_state_support' | 'private_no_support' | 'ppp_mechanism'
  | 'rejected_not_msdp' | 'rejected_low_eirr';

// Three-Tier Feasibility Study Framework
export type FeasibilityStage =
  | 'registered'
  | 'fs1_submitted' | 'fs1_desk_screened' | 'fs1_passed' | 'fs1_returned' | 'fs1_rejected'
  | 'fs2_assigned' | 'fs2_in_progress' | 'fs2_completed'
  | 'categorized'
  | 'fs3_in_progress' | 'fs3_completed';

export type CategoryDecision = 'category_a' | 'category_b' | 'category_c';

export type PPPSupportMechanism = 'vgf' | 'mrg' | 'availability_payment' | 'interest_subsidy' | 'tax_incentive' | 'land_grant' | 'combined';

export interface FS1Narrative {
  id: string;
  project_id: string;
  problem_statement: string;
  target_beneficiaries: string;
  ndp_alignment_justification: string;
  expected_outcomes: string;
  preliminary_cost_justification: string;
  submitted_at: string;
  submitted_by: string | null;
  version: number;
  created_at: string;
}

export interface FS1Review {
  id: string;
  project_id: string;
  narrative_id: string | null;
  reviewer_id: string | null;
  review_tier: 'desk' | 'senior';
  decision: 'screened' | 'passed' | 'returned' | 'rejected';
  comments: string | null;
  reviewed_at: string;
  created_at: string;
  reviewer_name?: string;
}

export interface FS2Assignment {
  id: string;
  project_id: string;
  assigned_to: string;
  assigned_at: string;
  deadline: string | null;
  status: 'assigned' | 'in_progress' | 'completed' | 'overdue';
  completed_at: string | null;
  report_document_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentType =
  | 'concept_note' | 'project_proposal' | 'preliminary_fs_report'
  | 'cost_estimate' | 'environmental_screening' | 'msdp_alignment_justification'
  | 'firr_calculation_workbook' | 'eirr_calculation_workbook'
  | 'cost_benefit_analysis' | 'detailed_fs_report' | 'vgf_calculation'
  | 'risk_allocation_matrix' | 'funding_request' | 'cabinet_approval' | 'monitoring_report' | 'other';

// PPP Contract Types (Notification 2/2018)
export type PPPContractType = 'availability_payment' | 'boo' | 'bot' | 'btl' | 'bto' | 'om' | 'other';

export interface PPPContractDetails {
  // BOT
  transfer_date?: string;
  concession_period_years?: number;
  transfer_conditions?: string;
  // BOO
  perpetuity_terms?: string;
  purchase_option_terms?: string;
  // BTL
  lease_period_years?: number;
  lease_payment_terms?: string;
  // BTO
  operating_period_years?: number;
  // O&M
  contract_period_years?: number;
  // Availability Payment
  service_level_kpis?: string;
  payment_schedule_type?: 'monthly' | 'quarterly' | 'annual';
  performance_deduction_terms?: string;
  // Other
  custom_type_description?: string;
  custom_terms?: string;
}

// Unsolicited Proposal / Swiss Challenge
export type ProposalStatus = 'received' | 'under_review' | 'rfp_published' | 'counter_proposals_open' | 'evaluation' | 'awarded' | 'rejected';
export type BidderStatus = 'submitted' | 'under_review' | 'shortlisted' | 'rejected' | 'winner';

export interface UnsolicitedProposal {
  id: string;
  project_id: string;
  proponent_name: string;
  proponent_contact: string | null;
  proponent_company: string | null;
  proposal_date: string | null;
  status: ProposalStatus;
  rfp_published_date: string | null;
  counter_proposal_deadline: string | null;
  original_proponent_match_deadline: string | null;
  match_response: string | null;
  award_decision: string | null;
  award_date: string | null;
  awarded_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ProposalBidder {
  id: string;
  proposal_id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  bid_amount: number | null;
  currency: string;
  proposal_document_id: string | null;
  evaluation_score: number | null;
  evaluation_notes: string | null;
  status: BidderStatus;
  created_at: string;
  updated_at: string;
}

// Compliance Settings
export interface ProjectBankSetting {
  id: string;
  key: string;
  value: Record<string, any>;
  label: string;
  description: string | null;
  enforcement: 'enforce' | 'warn' | 'off';
  category: string;
  updated_at: string;
  updated_by: string | null;
}

// Monitoring
export type MonitoringReportStatus = 'pending' | 'submitted' | 'under_review' | 'reviewed' | 'overdue';
export type ComplianceStatus = 'compliant' | 'partially_compliant' | 'non_compliant' | 'not_assessed';

export interface MonitoringSchedule {
  id: string;
  project_id: string;
  interval_months: number;
  next_due_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonitoringReport {
  id: string;
  project_id: string;
  schedule_id: string | null;
  report_period_start: string | null;
  report_period_end: string | null;
  due_date: string | null;
  submitted_date: string | null;
  status: MonitoringReportStatus;
  compliance_status: ComplianceStatus;
  submitted_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  document_id: string | null;
  key_findings: string | null;
  recommendations: string | null;
  kpi_data: Record<string, any> | null;
}

// SEE Equitization
export type SEETransferStatus = 'draft' | 'assessment' | 'valuation' | 'restructuring' | 'tender' | 'transferred' | 'cancelled';
export type SEETransferMode = 'public_offering' | 'auction' | 'competitive_bid' | 'swiss_challenge' | 'asset_sale' | 'management_buyout' | 'lease_concession' | 'bot_boo' | 'other';
export type SEEDocumentType = 'financial_statements' | 'audit_report' | 'valuation_certificate' | 'asset_register' | 'restructuring_plan' | 'tender_document' | 'transfer_agreement' | 'other';

export interface SEETransfer {
  id: string;
  transfer_code: string;
  see_name: string;
  see_sector: string | null;
  see_ministry: string | null;
  description: string | null;
  status: SEETransferStatus;
  transfer_mode: SEETransferMode | null;
  current_annual_revenue: number | null;
  current_annual_expenses: number | null;
  total_assets: number | null;
  total_liabilities: number | null;
  employee_count: number | null;
  valuation_amount: number | null;
  valuation_date: string | null;
  valuation_method: string | null;
  valuation_firm: string | null;
  shares_allotted_to_state: number | null;
  regulatory_separation_done: boolean;
  legislation_review_done: boolean;
  fixed_asset_register_maintained: boolean;
  restructuring_notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  financials?: SEETransferFinancial[];
  documents?: SEETransferDocument[];
}

export interface SEETransferFinancial {
  id: string;
  transfer_id: string;
  year: number;
  period_type: 'historical' | 'projected';
  revenue: number | null;
  expenses: number | null;
  net_income: number | null;
  free_cash_flow: number | null;
  capex: number | null;
  depreciation: number | null;
}

export interface SEETransferDocument {
  id: string;
  transfer_id: string;
  document_type: SEEDocumentType;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  upload_stage: string | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface CostTableRow {
  year: number;
  capex: number;
  opex: number;
  revenue: number;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  document_type: DocumentType;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  upload_stage: string | null;
  description: string | null;
  is_required: boolean;
  uploaded_by: string | null;
  created_at: string;
}

export interface AppraisalShadowPrices {
  id: string;
  shadow_wage_rate: number;
  shadow_exchange_rate: number;
  standard_conversion_factor: number;
  social_discount_rate: number;
  sector: string | null;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
  approved_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface FIRRResult {
  firr: number | null;
  npv_at_10: number;
  payback_year: number | null;
  total_investment: number;
  total_net_revenue: number;
  cash_flows: number[];
}

export interface EIRRResult {
  eirr: number | null;
  enpv: number;
  bcr: number | null;
  economic_costs: number[];
  economic_benefits: number[];
}

export interface SensitivityResult {
  scenario: string;
  firr_or_eirr: number | null;
  npv: number;
}

export interface VGFResult {
  gap_amount: number;
  vgf_as_pct_of_capex: number;
}

export interface NationalDevelopmentGoal {
  id: string;
  code: string;
  name: string;
  description: string | null;
  plan_name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectBankProject {
  id: string;
  project_code: string;
  name: string;
  description: string | null;
  nominating_ministry: string;
  sector: string;
  region: string | null;
  estimated_cost: number | null;
  currency: string;
  ndp_goal_id: string | null;
  ndp_aligned: boolean;
  sdg_goals: string[] | null;
  firr: number | null;
  eirr: number | null;
  firr_date: string | null;
  eirr_date: string | null;
  status: ProjectStatus;
  pathway: ProjectPathway | null;
  vgf_amount: number | null;
  vgf_calculated: boolean;
  land_parcel_id: string | null;
  total_committed: number | null;
  total_disbursed: number | null;
  funding_gap: number | null;
  aims_activity_id: string | null;
  origin: string;
  rejection_reason: string | null;
  rejected_at: string | null;
  nominated_at: string | null;
  screened_at: string | null;
  appraised_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  // Appraisal workflow
  appraisal_stage?: AppraisalStage;
  routing_outcome?: RoutingOutcome | null;
  // Intake fields
  contact_officer?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  project_type?: string | null;
  sub_sector?: string | null;
  townships?: string[] | null;
  estimated_start_date?: string | null;
  estimated_duration_months?: number | null;
  objectives?: string | null;
  target_beneficiaries?: string | null;
  // Preliminary FS fields
  construction_period_years?: number | null;
  operational_period_years?: number | null;
  project_life_years?: number | null;
  preliminary_fs_summary?: string | null;
  preliminary_fs_date?: string | null;
  preliminary_fs_conducted_by?: string | null;
  cost_table_data?: CostTableRow[] | null;
  technical_approach?: string | null;
  technology_methodology?: string | null;
  technical_risks?: string | null;
  has_technical_design?: boolean;
  technical_design_maturity?: string | null;
  environmental_impact_level?: string | null;
  social_impact_level?: string | null;
  land_acquisition_required?: boolean;
  resettlement_required?: boolean;
  estimated_affected_households?: number | null;
  has_revenue_component?: boolean;
  revenue_sources?: string[] | null;
  market_assessment_summary?: string | null;
  projected_annual_users?: number | null;
  projected_annual_revenue?: number | null;
  revenue_ramp_up_years?: number | null;
  // MSDP fields
  msdp_strategy_area?: string | null;
  secondary_ndp_goals?: string[] | null;
  alignment_justification?: string | null;
  sector_strategy_reference?: string | null;
  in_sector_investment_plan?: boolean;
  // Calculation data
  firr_calculation_data?: any | null;
  eirr_calculation_data?: any | null;
  eirr_shadow_prices?: any | null;
  vgf_calculation_data?: any | null;
  vgf_status?: string | null;
  dap_compliant?: boolean | null;
  dap_notes?: string | null;
  budget_allocation_status?: string | null;
  budget_amount?: number | null;
  // Notification 2/2018 fields
  ppp_contract_type?: PPPContractType | null;
  ppp_contract_details?: PPPContractDetails | null;
  implementing_agency?: string | null;
  equity_ratio?: number | null;
  // Feasibility Study Framework
  feasibility_stage?: FeasibilityStage | null;
  fs1_rejected_at?: string | null;
  fs1_resubmission_count?: number;
  category_recommendation?: CategoryDecision | null;
  category_decision?: CategoryDecision | null;
  category_rationale?: string | null;
  proceeding_independently?: boolean;
  // FS-3 PPP Support Mechanisms
  ppp_support_mechanism?: PPPSupportMechanism | null;
  mrg_guaranteed_minimum?: number | null;
  mrg_trigger_conditions?: string | null;
  mrg_government_liability_cap?: number | null;
  mrg_duration_years?: number | null;
  availability_payment_amount?: number | null;
  availability_payment_duration_years?: number | null;
  availability_payment_conditions?: string | null;
  // Joined fields
  ndp_goal?: NationalDevelopmentGoal | null;
  donors?: ProjectBankDonor[];
  documents?: ProjectDocument[];
}

export interface ProjectBankDonor {
  id: string;
  project_id: string;
  donor_name: string;
  donor_type: DonorType | null;
  instrument_type: InstrumentType | null;
  amount: number | null;
  currency: string;
  commitment_status: CommitmentStatus;
  iati_identifier: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectAppraisal {
  id: string;
  project_id: string;
  appraisal_type: AppraisalType;
  firr_result: number | null;
  eirr_result: number | null;
  npv: number | null;
  benefit_cost_ratio: number | null;
  shadow_wage_rate: number | null;
  shadow_exchange_rate: number | null;
  standard_conversion_factor: number | null;
  social_discount_rate: number | null;
  project_life_years: number | null;
  construction_years: number | null;
  cost_data: { year: number; amount: number }[] | null;
  benefit_data: { year: number; amount: number }[] | null;
  appraised_by: string | null;
  appraisal_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}


export interface RoutingResult {
  pathway: ProjectPathway | null;
  status: ProjectStatus;
  label: string;
  description: string;
  color: string;
}

export interface ProjectBankStats {
  totalProjects: number;
  activeProjects: number;
  totalPipelineValue: number;
  fundingGap: number;
  byStatus: Record<ProjectStatus, number>;
  bySector: { sector: string; count: number; value: number }[];
  byPathway: { pathway: string; count: number; value: number }[];
  recentSubmissions: ProjectBankProject[];
}

export interface ModuleStats {
  projectBank: { projects: number; fundingGaps: number };
  aims: { activities: number; donors: number };
  landBank: { parcels: number; hectaresAvailable: number };
}

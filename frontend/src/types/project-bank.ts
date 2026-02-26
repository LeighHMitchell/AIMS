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

export type DocumentType =
  | 'concept_note' | 'project_proposal' | 'preliminary_fs_report'
  | 'cost_estimate' | 'environmental_screening' | 'msdp_alignment_justification'
  | 'firr_calculation_workbook' | 'eirr_calculation_workbook'
  | 'cost_benefit_analysis' | 'detailed_fs_report' | 'vgf_calculation'
  | 'risk_allocation_matrix' | 'funding_request' | 'other';

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

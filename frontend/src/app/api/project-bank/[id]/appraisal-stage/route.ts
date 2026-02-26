import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const STAGE_FIELDS: Record<string, string[]> = {
  intake: [
    'name', 'nominating_ministry', 'sector', 'region', 'estimated_cost', 'currency',
    'description', 'contact_officer', 'contact_email', 'contact_phone',
    'project_type', 'sub_sector', 'townships', 'estimated_start_date',
    'estimated_duration_months', 'objectives', 'target_beneficiaries',
    'sdg_goals', 'ndp_goal_id', 'ndp_aligned', 'implementing_agency',
  ],
  preliminary_fs: [
    'construction_period_years', 'operational_period_years', 'project_life_years',
    'preliminary_fs_summary', 'preliminary_fs_date', 'preliminary_fs_conducted_by',
    'cost_table_data', 'technical_approach', 'technology_methodology',
    'technical_risks', 'has_technical_design', 'technical_design_maturity',
    'environmental_impact_level', 'social_impact_level',
    'land_acquisition_required', 'resettlement_required', 'estimated_affected_households',
    'has_revenue_component', 'revenue_sources', 'market_assessment_summary',
    'projected_annual_users', 'projected_annual_revenue', 'revenue_ramp_up_years',
  ],
  msdp_screening: [
    'ndp_goal_id', 'ndp_aligned', 'msdp_strategy_area', 'secondary_ndp_goals',
    'alignment_justification', 'sector_strategy_reference', 'in_sector_investment_plan',
    'sdg_goals',
  ],
  firr_assessment: [
    'firr', 'firr_date', 'firr_calculation_data', 'cost_table_data',
  ],
  eirr_assessment: [
    'eirr', 'eirr_date', 'eirr_calculation_data', 'eirr_shadow_prices',
  ],
  vgf_assessment: [
    'vgf_amount', 'vgf_calculated', 'vgf_calculation_data', 'vgf_status',
    'dap_compliant', 'dap_notes', 'budget_allocation_status', 'budget_amount',
    'land_parcel_id', 'ppp_contract_type', 'ppp_contract_details', 'equity_ratio',
  ],
  dp_consultation: [
    'routing_outcome', 'status', 'pathway',
  ],
};

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;
  const body = await request.json();

  const { stage, data, advance } = body;

  if (!stage || !STAGE_FIELDS[stage]) {
    return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
  }

  const allowedFields = STAGE_FIELDS[stage];
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
    updated_by: user!.id,
  };

  // Only allow fields valid for this stage
  if (data && typeof data === 'object') {
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    });
  }

  // Advance appraisal_stage if requested
  if (advance && typeof advance === 'string') {
    updateData.appraisal_stage = advance;
  }

  const { data: project, error } = await supabase!
    .from('project_bank_projects')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(project);
}

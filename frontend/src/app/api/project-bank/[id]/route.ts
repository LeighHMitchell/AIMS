import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  const { data: project, error } = await supabase!
    .from('project_bank_projects')
    .select('*, national_development_goals(id, code, name, plan_name)')
    .eq('id', id)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Fetch donors
  const { data: donors } = await supabase!
    .from('project_bank_donors')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  // Fetch appraisals
  const { data: appraisals } = await supabase!
    .from('project_appraisals')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  // Fetch documents
  const { data: documents } = await supabase!
    .from('project_documents')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    ...project,
    donors: donors || [],
    appraisals: appraisals || [],
    documents: documents || [],
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
    updated_by: user!.id,
  };

  const allowedFields = [
    'name', 'description', 'nominating_ministry', 'sector', 'region',
    'estimated_cost', 'currency', 'ndp_goal_id', 'ndp_aligned', 'sdg_goals',
    'firr', 'eirr', 'firr_date', 'eirr_date', 'status', 'pathway',
    'vgf_amount', 'vgf_calculated', 'land_parcel_id',
    'total_committed', 'total_disbursed', 'funding_gap',
    'aims_activity_id', 'rejection_reason', 'rejected_at',
    'nominated_at', 'screened_at', 'appraised_at', 'approved_at',
    // Appraisal wizard fields
    'appraisal_stage', 'routing_outcome',
    'contact_officer', 'contact_email', 'contact_phone',
    'project_type', 'sub_sector', 'townships',
    'estimated_start_date', 'estimated_duration_months',
    'objectives', 'target_beneficiaries',
    'construction_period_years', 'operational_period_years', 'project_life_years',
    'preliminary_fs_summary', 'preliminary_fs_date', 'preliminary_fs_conducted_by',
    'cost_table_data', 'technical_approach', 'technology_methodology',
    'technical_risks', 'has_technical_design', 'technical_design_maturity',
    'environmental_impact_level', 'social_impact_level',
    'land_acquisition_required', 'resettlement_required', 'estimated_affected_households',
    'has_revenue_component', 'revenue_sources', 'market_assessment_summary',
    'projected_annual_users', 'projected_annual_revenue', 'revenue_ramp_up_years',
    'msdp_strategy_area', 'secondary_ndp_goals', 'alignment_justification',
    'sector_strategy_reference', 'in_sector_investment_plan',
    'firr_calculation_data', 'eirr_calculation_data', 'eirr_shadow_prices',
    'vgf_calculation_data', 'vgf_status',
    'dap_compliant', 'dap_notes', 'budget_allocation_status', 'budget_amount',
  ];

  allowedFields.forEach(field => {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  });

  const { data, error } = await supabase!
    .from('project_bank_projects')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  const { error } = await supabase!
    .from('project_bank_projects')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

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

  // Fetch relations in parallel
  const [donorsResult, appraisalsResult, documentsResult] = await Promise.all([
    supabase!
      .from('project_bank_donors')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    supabase!
      .from('project_appraisals')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    supabase!
      .from('project_documents')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
  ]);

  const warnings: string[] = [];
  if (donorsResult.error) warnings.push(`donors: ${donorsResult.error.message}`);
  if (appraisalsResult.error) warnings.push(`appraisals: ${appraisalsResult.error.message}`);
  if (documentsResult.error) warnings.push(`documents: ${documentsResult.error.message}`);

  // Generate signed URLs for documents
  const docsWithUrls = await Promise.all(
    (documentsResult.data || []).map(async (doc: any) => {
      if (!doc.file_path) return { ...doc, signed_url: null };
      const { data: signedData } = await supabase!.storage
        .from('project-documents')
        .createSignedUrl(doc.file_path, 3600);
      return { ...doc, signed_url: signedData?.signedUrl || null };
    })
  );

  return NextResponse.json({
    ...project,
    donors: donorsResult.data || [],
    appraisals: appraisalsResult.data || [],
    documents: docsWithUrls,
    ...(warnings.length > 0 && { _warnings: warnings }),
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

  // Workflow-critical fields are NOT allowed here — they must go through
  // dedicated transition routes (submit, categorize, recover, claim-review, etc.)
  const allowedFields = [
    'name', 'description', 'nominating_ministry', 'sector', 'region',
    'estimated_cost', 'currency', 'ndp_goal_id', 'ndp_aligned', 'sdg_goals',
    'firr', 'eirr', 'firr_date', 'eirr_date',
    'vgf_amount', 'vgf_calculated', 'land_parcel_id',
    'total_committed', 'total_disbursed', 'funding_gap',
    'aims_activity_id',
    'nominated_at', 'screened_at', 'appraised_at', 'approved_at',
    'appraisal_stage', 'routing_outcome',
    'contact_officer', 'contact_officer_first_name', 'contact_officer_last_name',
    'contact_email', 'contact_phone',
    'contact_position', 'contact_ministry', 'contact_department',
    'project_type', 'sub_sector', 'townships',
    'estimated_start_date', 'estimated_duration_months',
    'objectives', 'target_beneficiaries',
    'construction_period_years', 'operational_period_years', 'operational_period_months_remainder', 'project_life_years',
    'preliminary_fs_summary', 'preliminary_fs_date', 'preliminary_fs_conducted_by',
    'fs_conductor_type', 'fs_conductor_company_name', 'fs_conductor_company_address',
    'fs_conductor_company_phone', 'fs_conductor_company_email', 'fs_conductor_company_website',
    'fs_conductor_contact_person', 'fs_conductor_contact_person_first_name',
    'fs_conductor_contact_person_last_name', 'fs_conductor_contact_person_title',
    'fs_conductor_individual_name', 'fs_conductor_individual_first_name',
    'fs_conductor_individual_last_name', 'fs_conductor_individual_email',
    'fs_conductor_individual_phone', 'fs_conductor_individual_job_title',
    'fs_conductor_individual_company', 'fs_conductor_individual_address',
    'cost_table_data', 'technical_approach', 'technology_methodology',
    'technical_risks', 'has_technical_design', 'technical_design_maturity',
    'environmental_impact_level', 'social_impact_level',
    'land_acquisition_required', 'land_acquisition_hectares', 'land_acquisition_details',
    'resettlement_required', 'estimated_affected_households', 'resettlement_details',
    'has_revenue_component', 'revenue_sources', 'market_assessment_summary',
    'projected_annual_users', 'projected_annual_revenue', 'revenue_ramp_up_years',
    'msdp_strategy_area', 'msdp_strategies', 'secondary_ndp_goals', 'alignment_justification',
    'sector_strategy_reference', 'in_sector_investment_plan',
    'firr_cost_table_data', 'firr_calculation_data', 'eirr_calculation_data', 'eirr_shadow_prices',
    'vgf_calculation_data', 'vgf_status',
    'dap_compliant', 'dap_notes', 'budget_allocation_status', 'budget_amount',
    'ppp_contract_type', 'ppp_contract_details', 'implementing_agency', 'equity_ratio',
    'proponent_name', 'proponent_first_name', 'proponent_last_name',
    'proponent_company', 'proponent_contact',
    'banner', 'banner_position',
    'fs2_study_data',
    // FS-3 PPP support mechanisms
    'ppp_support_mechanism',
    'mrg_guaranteed_minimum', 'mrg_trigger_conditions', 'mrg_government_liability_cap', 'mrg_duration_years',
    'availability_payment_amount', 'availability_payment_duration_years', 'availability_payment_conditions',
    // Category A (Private Investment)
    'private_partner_name', 'private_partner_experience', 'investor_commitments',
    'procurement_method', 'procurement_timeline', 'concession_period_years',
    'security_arrangements', 'financial_closure_target', 'private_structuring_data',
    // Category B (Government Budget)
    'budget_source', 'budget_fiscal_year', 'annual_operating_cost',
    'maintenance_responsibility', 'procurement_method_gov',
    'implementation_agency_confirmed', 'cost_recovery_mechanism', 'handover_timeline', 'gov_structuring_data',
    // Category D (ODA)
    'oda_donor_type', 'oda_donor_name', 'oda_financing_type',
    'oda_grant_amount', 'oda_loan_amount', 'oda_counterpart_funding',
    'oda_conditions', 'oda_iati_sector_code', 'oda_activity_description', 'oda_structuring_data',
  ];

  allowedFields.forEach(field => {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  });

  // Allow project_stage only for safe "first save in new phase" transitions.
  // All other stage changes must go through dedicated transition routes.
  if (body.project_stage) {
    const SAFE_DRAFT_TRANSITIONS: Record<string, string> = {
      intake_approved: 'fs1_draft',
      fs2_assigned: 'fs2_in_progress',
      fs2_categorized: 'fs3_in_progress',
    };

    const { data: current } = await supabase!
      .from('project_bank_projects')
      .select('project_stage')
      .eq('id', id)
      .single();

    if (current && SAFE_DRAFT_TRANSITIONS[current.project_stage] === body.project_stage) {
      updateData.project_stage = body.project_stage;
    }
  }

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
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  // Only admins may delete projects
  const { data: dbUser } = await supabase!
    .from('users')
    .select('role')
    .eq('id', user!.id)
    .single();

  if (!dbUser || !['admin', 'super_admin', 'super_user'].includes(dbUser.role)) {
    return NextResponse.json({ error: 'Admin access required to delete projects' }, { status: 403 });
  }

  const { error } = await supabase!
    .from('project_bank_projects')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

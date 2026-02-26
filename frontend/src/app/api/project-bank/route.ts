import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const pathway = searchParams.get('pathway');
  const sector = searchParams.get('sector');
  const search = searchParams.get('search');
  const fundingGapsOnly = searchParams.get('funding_gaps') === 'true';
  const pppOnly = searchParams.get('ppp_only') === 'true';

  let query = supabase!
    .from('project_bank_projects')
    .select('*, national_development_goals(id, code, name, plan_name)')
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  if (pathway) {
    query = query.eq('pathway', pathway);
  }
  if (sector) {
    query = query.eq('sector', sector);
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,project_code.ilike.%${search}%,nominating_ministry.ilike.%${search}%`);
  }
  if (fundingGapsOnly) {
    query = query.gt('funding_gap', 0).neq('status', 'rejected');
  }
  if (pppOnly) {
    query = query.eq('pathway', 'ppp');
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const body = await request.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
  }
  if (!body.nominating_ministry?.trim()) {
    return NextResponse.json({ error: 'Nominating ministry is required' }, { status: 400 });
  }
  if (!body.sector?.trim()) {
    return NextResponse.json({ error: 'Sector is required' }, { status: 400 });
  }

  const insertData: Record<string, any> = {
    project_code: '', // Trigger will auto-generate
    name: body.name.trim(),
    description: body.description?.trim() || null,
    nominating_ministry: body.nominating_ministry.trim(),
    sector: body.sector.trim(),
    region: body.region?.trim() || null,
    estimated_cost: body.estimated_cost || null,
    currency: body.currency || 'USD',
    ndp_goal_id: body.ndp_goal_id || null,
    ndp_aligned: body.ndp_aligned ?? false,
    sdg_goals: body.sdg_goals || null,
    firr: body.firr ?? null,
    status: body.status || 'nominated',
    pathway: body.pathway || null,
    funding_gap: body.estimated_cost || 0,
    appraisal_stage: body.appraisal_stage || 'intake',
    created_by: user!.id,
    updated_by: user!.id,
  };

  // Intake fields
  const intakeFields = [
    'contact_officer', 'contact_email', 'contact_phone',
    'project_type', 'sub_sector', 'townships',
    'estimated_start_date', 'estimated_duration_months',
    'objectives', 'target_beneficiaries', 'implementing_agency',
  ];
  intakeFields.forEach(field => {
    if (body[field] !== undefined) {
      insertData[field] = body[field];
    }
  });

  const { data: project, error } = await supabase!
    .from('project_bank_projects')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(project);
}

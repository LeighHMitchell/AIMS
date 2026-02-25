import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  const { data, error } = await supabase!
    .from('project_appraisals')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;
  const body = await request.json();

  const { data: appraisal, error } = await supabase!
    .from('project_appraisals')
    .insert({
      project_id: id,
      appraisal_type: body.appraisal_type || 'eirr',
      firr_result: body.firr_result ?? null,
      eirr_result: body.eirr_result ?? null,
      npv: body.npv ?? null,
      benefit_cost_ratio: body.benefit_cost_ratio ?? null,
      shadow_wage_rate: body.shadow_wage_rate ?? null,
      shadow_exchange_rate: body.shadow_exchange_rate ?? null,
      standard_conversion_factor: body.standard_conversion_factor ?? null,
      social_discount_rate: body.social_discount_rate ?? 12,
      project_life_years: body.project_life_years ?? null,
      construction_years: body.construction_years ?? null,
      cost_data: body.cost_data ?? null,
      benefit_data: body.benefit_data ?? null,
      appraised_by: body.appraised_by?.trim() || null,
      appraisal_date: body.appraisal_date || new Date().toISOString().split('T')[0],
      notes: body.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update project's EIRR/FIRR if provided
  const projectUpdate: Record<string, any> = {};
  if (body.eirr_result != null) {
    projectUpdate.eirr = body.eirr_result;
    projectUpdate.eirr_date = body.appraisal_date || new Date().toISOString().split('T')[0];
  }
  if (body.firr_result != null) {
    projectUpdate.firr = body.firr_result;
    projectUpdate.firr_date = body.appraisal_date || new Date().toISOString().split('T')[0];
  }

  if (Object.keys(projectUpdate).length > 0) {
    await supabase!
      .from('project_bank_projects')
      .update(projectUpdate)
      .eq('id', id);
  }

  return NextResponse.json(appraisal);
}

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const body = await request.json();
  const { project_id } = body;

  if (!project_id) {
    return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
  }

  // Fetch the project
  const { data: project, error: fetchError } = await supabase!
    .from('project_bank_projects')
    .select('*')
    .eq('id', project_id)
    .single();

  if (fetchError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if (project.aims_activity_id) {
    return NextResponse.json({ error: 'Project already linked to AIMS activity' }, { status: 400 });
  }

  // Create AIMS activity — use ODA fields when available
  const { data: activity, error: activityError } = await supabase!
    .from('activities')
    .insert({
      title_narrative: project.name,
      description_narrative: project.oda_activity_description || project.description || '',
      activity_status: '1', // Pipeline/Identification
      publication_status: 'draft',
      submission_status: 'draft',
      hierarchy: 1,
      default_currency: project.currency || 'USD',
      origin: 'projectbank',
      project_bank_id: project.id,
      created_by: user!.id,
      last_edited_by: user!.id,
    })
    .select()
    .single();

  if (activityError) {
    return NextResponse.json({ error: activityError.message }, { status: 500 });
  }

  // Create sector allocation from ODA DAC sector code if provided
  if (project.oda_iati_sector_code) {
    await supabase!
      .from('activity_sectors')
      .insert({
        activity_id: activity.id,
        sector_code: project.oda_iati_sector_code,
        sector_name: project.sector || project.oda_iati_sector_code,
        percentage: 100,
      })
      .select()
      .single();
  }

  // Create participating org from ODA donor details if provided
  if (project.oda_donor_name) {
    await supabase!
      .from('participating_orgs')
      .insert({
        activity_id: activity.id,
        role: '1', // Funding
        org_name: project.oda_donor_name,
        org_type: project.oda_donor_type || null,
      })
      .select()
      .single();
  }

  // Link back to project
  await supabase!
    .from('project_bank_projects')
    .update({
      aims_activity_id: activity.id,
      updated_at: new Date().toISOString(),
      updated_by: user!.id,
    })
    .eq('id', project_id);

  return NextResponse.json({ project_id, activity_id: activity.id, activity });
}

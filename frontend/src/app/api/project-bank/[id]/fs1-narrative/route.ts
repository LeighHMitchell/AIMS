import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const MIN_CHARS = 200;
const REQUIRED_FIELDS = [
  'problem_statement',
  'target_beneficiaries',
  'ndp_alignment_justification',
  'expected_outcomes',
  'preliminary_cost_justification',
] as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  const { data, error } = await supabase!
    .from('fs1_narratives')
    .select('*')
    .eq('project_id', id)
    .order('version', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;
  const body = await request.json();

  // Validate required fields and minimum character counts
  for (const field of REQUIRED_FIELDS) {
    if (!body[field] || typeof body[field] !== 'string') {
      return NextResponse.json(
        { error: `${field.replace(/_/g, ' ')} is required` },
        { status: 400 }
      );
    }
    if (body[field].trim().length < MIN_CHARS) {
      return NextResponse.json(
        { error: `${field.replace(/_/g, ' ')} must be at least ${MIN_CHARS} characters` },
        { status: 400 }
      );
    }
  }

  // Check project exists and is in valid state
  const { data: project, error: projectError } = await supabase!
    .from('project_bank_projects')
    .select('feasibility_stage, fs1_resubmission_count')
    .eq('id', id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const validStages = ['registered', 'fs1_returned'];
  if (!validStages.includes(project.feasibility_stage || 'registered')) {
    return NextResponse.json(
      { error: 'Project is not in a valid state for FS-1 submission' },
      { status: 400 }
    );
  }

  const isResubmission = project.feasibility_stage === 'fs1_returned';
  const version = (project.fs1_resubmission_count || 0) + 1;

  // Insert narrative
  const { data: narrative, error: narrativeError } = await supabase!
    .from('fs1_narratives')
    .insert({
      project_id: id,
      problem_statement: body.problem_statement.trim(),
      target_beneficiaries: body.target_beneficiaries.trim(),
      ndp_alignment_justification: body.ndp_alignment_justification.trim(),
      expected_outcomes: body.expected_outcomes.trim(),
      preliminary_cost_justification: body.preliminary_cost_justification.trim(),
      submitted_by: user!.id,
      version,
    })
    .select()
    .single();

  if (narrativeError) {
    return NextResponse.json({ error: narrativeError.message }, { status: 500 });
  }

  // Update project stage
  const updateData: Record<string, any> = {
    feasibility_stage: 'fs1_submitted',
    updated_at: new Date().toISOString(),
    updated_by: user!.id,
  };
  if (isResubmission) {
    updateData.fs1_resubmission_count = version;
  }

  await supabase!
    .from('project_bank_projects')
    .update(updateData)
    .eq('id', id);

  return NextResponse.json(narrative, { status: 201 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;
  const body = await request.json();

  if (!body.narrative_id) {
    return NextResponse.json({ error: 'narrative_id is required' }, { status: 400 });
  }

  const updateData: Record<string, any> = {};
  for (const field of REQUIRED_FIELDS) {
    if (body[field] !== undefined) {
      if (typeof body[field] === 'string' && body[field].trim().length < MIN_CHARS) {
        return NextResponse.json(
          { error: `${field.replace(/_/g, ' ')} must be at least ${MIN_CHARS} characters` },
          { status: 400 }
        );
      }
      updateData[field] = body[field].trim();
    }
  }

  const { data, error } = await supabase!
    .from('fs1_narratives')
    .update(updateData)
    .eq('id', body.narrative_id)
    .eq('project_id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

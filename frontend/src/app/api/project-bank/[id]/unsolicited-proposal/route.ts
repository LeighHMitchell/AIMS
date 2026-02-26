import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  const { data, error } = await supabase!
    .from('unsolicited_proposals')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // No proposal found is ok — return null
    if (error.code === 'PGRST116') {
      return NextResponse.json(null);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;
  const body = await request.json();

  const { data, error } = await supabase!
    .from('unsolicited_proposals')
    .insert({
      project_id: id,
      proponent_name: body.proponent_name || '',
      proponent_contact: body.proponent_contact || null,
      proponent_company: body.proponent_company || null,
      proposal_date: body.proposal_date || new Date().toISOString().split('T')[0],
      status: 'received',
      created_by: user!.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;
  const body = await request.json();

  const allowedFields = [
    'proponent_name', 'proponent_contact', 'proponent_company', 'proposal_date',
    'status', 'rfp_published_date', 'counter_proposal_deadline',
    'original_proponent_match_deadline', 'match_response',
    'award_decision', 'award_date', 'awarded_to', 'notes',
  ];

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  allowedFields.forEach(field => {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  });

  // Find the proposal for this project
  const { data: proposal } = await supabase!
    .from('unsolicited_proposals')
    .select('id')
    .eq('project_id', id)
    .single();

  if (!proposal) {
    return NextResponse.json({ error: 'No proposal found for this project' }, { status: 404 });
  }

  const { data, error } = await supabase!
    .from('unsolicited_proposals')
    .update(updateData)
    .eq('id', proposal.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create notification on status change
  if (body.status) {
    try {
      const { data: project } = await supabase!
        .from('project_bank_projects')
        .select('name, created_by')
        .eq('id', id)
        .single();

      if (project?.created_by) {
        await supabase!.from('user_notifications').insert({
          user_id: project.created_by,
          title: 'Swiss Challenge Status Update',
          message: `Unsolicited proposal for "${project.name}" has been updated to: ${body.status.replace(/_/g, ' ')}`,
          type: 'info',
          link: `/project-bank/${id}`,
        });
      }
    } catch {}
  }

  return NextResponse.json(data);
}

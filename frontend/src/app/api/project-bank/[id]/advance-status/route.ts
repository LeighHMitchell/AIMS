import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { STATUS_ORDER } from '@/lib/project-bank-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  const { data: project, error: fetchError } = await supabase!
    .from('project_bank_projects')
    .select('status')
    .eq('id', id)
    .single();

  if (fetchError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const currentIdx = STATUS_ORDER.indexOf(project.status as any);
  if (currentIdx === -1 || currentIdx >= STATUS_ORDER.length - 1) {
    return NextResponse.json({ error: 'Cannot advance status further' }, { status: 400 });
  }

  const nextStatus = STATUS_ORDER[currentIdx + 1];
  const timestampField = `${nextStatus === 'screening' ? 'screened' : nextStatus === 'appraisal' ? 'appraised' : nextStatus}_at`;

  const updateData: Record<string, any> = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
    updated_by: user!.id,
  };

  // Set timestamp for the new status
  if (['screened_at', 'appraised_at', 'approved_at'].includes(timestampField)) {
    updateData[timestampField] = new Date().toISOString();
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

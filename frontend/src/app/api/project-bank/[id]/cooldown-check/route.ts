import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id } = await params;

  // Get this project's ministry and name
  const { data: project, error: projectError } = await supabase!
    .from('project_bank_projects')
    .select('nominating_ministry, name')
    .eq('id', id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Check for similar rejected projects from the same ministry within 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: similar } = await supabase!
    .from('project_bank_projects')
    .select('id, name, fs1_rejected_at')
    .eq('nominating_ministry', project.nominating_ministry)
    .not('fs1_rejected_at', 'is', null)
    .gt('fs1_rejected_at', sixMonthsAgo.toISOString())
    .neq('id', id)
    .limit(1);

  if (similar && similar.length > 0) {
    return NextResponse.json({
      blocked: true,
      similar_project: similar[0].name,
      rejected_at: similar[0].fs1_rejected_at,
    });
  }

  return NextResponse.json({ blocked: false });
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id } = await params;

    // Fetch working group
    const { data: wg, error: wgError } = await supabase
      .from('working_groups')
      .select('*')
      .eq('id', id)
      .single();

    if (wgError) {
      if (wgError.message.includes('does not exist')) {
        const { WORKING_GROUPS } = await import('@/lib/workingGroups');
        const workingGroup = WORKING_GROUPS.find(w => w.id === id);
        if (workingGroup) {
          return NextResponse.json({ ...workingGroup, members: [], meetings: [], documents: [], activities: [] });
        }
        return NextResponse.json({ error: 'Working group not found' }, { status: 404 });
      }
      if (wgError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Working group not found' }, { status: 404 });
      }
      return NextResponse.json({ error: wgError.message }, { status: 500 });
    }

    // Fetch members
    const { data: members } = await supabase
      .from('working_group_memberships')
      .select('*')
      .eq('working_group_id', id)
      .order('role', { ascending: true });

    // Fetch meetings
    const { data: meetings } = await supabase
      .from('working_group_meetings')
      .select('*')
      .eq('working_group_id', id)
      .order('meeting_date', { ascending: false });

    // Fetch general documents (not tied to meetings)
    const { data: documents } = await supabase
      .from('working_group_documents')
      .select('*')
      .eq('working_group_id', id)
      .is('meeting_id', null)
      .order('uploaded_at', { ascending: false });

    // Fetch linked activities
    const { data: activityLinks } = await supabase
      .from('activity_working_groups')
      .select('activity_id')
      .eq('working_group_id', id);

    let activities: any[] = [];
    if (activityLinks && activityLinks.length > 0) {
      const activityIds = activityLinks.map((al: any) => al.activity_id);
      const { data: activityData } = await supabase
        .from('activities')
        .select('id, title, iati_identifier, activity_status, partner_name')
        .in('id', activityIds);

      activities = (activityData || []).map((a: any) => ({
        id: a.id,
        title: a.title,
        iati_id: a.iati_identifier,
        activity_status: a.activity_status || 'Unknown',
        partner_name: a.partner_name || 'Unknown'
      }));
    }

    // Fetch sub-working groups
    const { data: subGroups } = await supabase
      .from('working_groups')
      .select('id, code, label, group_type, is_active, status, description')
      .eq('parent_id', id)
      .order('label', { ascending: true });

    // Enrich sub-groups with member counts
    if (subGroups && subGroups.length > 0) {
      const subIds = subGroups.map((sg: any) => sg.id);
      const { data: subMemberships } = await supabase
        .from('working_group_memberships')
        .select('working_group_id')
        .in('working_group_id', subIds)
        .eq('is_active', true);

      if (subMemberships) {
        const subCountMap: Record<string, number> = {};
        subMemberships.forEach((m: any) => {
          subCountMap[m.working_group_id] = (subCountMap[m.working_group_id] || 0) + 1;
        });
        subGroups.forEach((sg: any) => {
          sg.member_count = subCountMap[sg.id] || 0;
        });
      }
    }

    // Fetch parent info if this is a sub-group
    let parent = null;
    if (wg.parent_id) {
      const { data: parentData } = await supabase
        .from('working_groups')
        .select('id, code, label')
        .eq('id', wg.parent_id)
        .single();
      parent = parentData || null;
    }

    return NextResponse.json({
      ...wg,
      parent,
      members: members || [],
      meetings: meetings || [],
      documents: documents || [],
      activities,
      sub_groups: subGroups || [],
    });
  } catch (error: any) {
    console.error('[API] Unexpected error:', error);
    try {
      const { id } = await params;
      const { WORKING_GROUPS } = await import('@/lib/workingGroups');
      const workingGroup = WORKING_GROUPS.find(w => w.id === id);
      if (workingGroup) {
        return NextResponse.json({ ...workingGroup, members: [], meetings: [], documents: [], activities: [] });
      }
      return NextResponse.json({ error: 'Working group not found' }, { status: 404 });
    } catch {
      return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // Build update object with only provided fields
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.label !== undefined) updateData.label = body.label;
    if (body.code !== undefined) updateData.code = body.code;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.sector_code !== undefined) updateData.sector_code = body.sector_code;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.group_type !== undefined) updateData.group_type = body.group_type;
    if (body.banner !== undefined) updateData.banner = body.banner;
    if (body.icon_url !== undefined) updateData.icon_url = body.icon_url;
    if (body.parent_id !== undefined) updateData.parent_id = body.parent_id;

    const { data, error } = await supabase
      .from('working_groups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Working group not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id } = await params;
    const { error } = await supabase
      .from('working_groups')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Working group not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

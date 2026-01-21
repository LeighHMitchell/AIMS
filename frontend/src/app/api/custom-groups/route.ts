import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET(request: NextRequest) {
  console.log('[API] GET /api/custom-groups - Starting request');

  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const includeMembers = searchParams.get('includeMembers') === 'true';

    // Use the view that includes member count
    const { data, error } = await supabase
      .from('custom_groups_with_stats')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('[API] Error fetching custom groups:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    console.log('[API] Successfully fetched custom groups:', data?.length || 0);
    
    // If includeMembers is false, remove the members array to reduce payload
    if (!includeMembers && data) {
      const groupsWithoutMembers = data.map(({ members, ...group }: any) => group);
      return NextResponse.json(groupsWithoutMembers);
    }
    
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  console.log('[API] POST /api/custom-groups - Starting request');

  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Create the custom group
    const { data: groupData, error: groupError } = await supabase
      .from('custom_groups')
      .insert({
        name: body.name,
        description: body.description,
        purpose: body.purpose,
        tags: body.tags || [],
        group_code: body.group_code,
        is_public: body.is_public !== false, // Default to true
        logo: body.logo,
        banner: body.banner,
        created_by_name: body.created_by_name,
        created_by_role: body.created_by_role
      })
      .select()
      .single();
    
    if (groupError) {
      console.error('[API] Error creating custom group:', groupError);
      
      if (groupError.code === '23505') { // Unique violation
        if (groupError.message.includes('group_code')) {
          return NextResponse.json(
            { error: 'A group with this code already exists' },
            { status: 400 }
          );
        }
        if (groupError.message.includes('slug')) {
          return NextResponse.json(
            { error: 'A group with this name already exists' },
            { status: 400 }
          );
        }
      }
      
      return NextResponse.json(
        { error: groupError.message },
        { status: 500 }
      );
    }
    
    // Add initial members if provided
    if (body.organization_ids && body.organization_ids.length > 0) {
      const memberships = body.organization_ids.map((orgId: string) => ({
        group_id: groupData.id,
        organization_id: orgId
      }));
      
      const { error: membershipError } = await supabase
        .from('custom_group_memberships')
        .insert(memberships);
      
      if (membershipError) {
        console.error('[API] Error adding members:', membershipError);
        // Don't fail the whole operation, just log the error
      }
    }
    
    console.log('[API] Successfully created custom group:', groupData);
    return NextResponse.json(groupData, { status: 201 });
  } catch (error: any) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 
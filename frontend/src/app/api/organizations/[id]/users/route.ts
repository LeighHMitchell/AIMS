import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET - Fetch all users belonging to an organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: organizationId } = await params;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    console.log('[OrgUsers API] Fetching users for organization:', organizationId);

    // Fetch users belonging to this organization
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        middle_name,
        last_name,
        avatar_url,
        job_title,
        department,
        telephone,
        contact_type,
        organization_id
      `)
      .eq('organization_id', organizationId)
      .order('first_name', { ascending: true });

    if (error) {
      console.error('[OrgUsers API] Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    console.log('[OrgUsers API] Found users:', users?.length || 0, users?.map(u => ({ email: u.email, org_id: u.organization_id })));

    // Transform to include full_name for frontend
    const transformedUsers = (users || []).map((user: any) => ({
      id: user.id,
      email: user.email,
      full_name: [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ') || user.email,
      avatar_url: user.avatar_url,
      job_title: user.job_title,
      department: user.department,
      telephone: user.telephone,
      contact_type: user.contact_type,
    }));

    return NextResponse.json(transformedUsers, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      }
    });
  } catch (error) {
    console.error('[OrgUsers API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

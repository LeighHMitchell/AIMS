import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { escapeIlikeWildcards } from '@/lib/security-utils';

function formatUsers(users: any[]) {
  return users.map(user => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User';
    const orgName = user.organizations?.name || user.organizations?.acronym || '';
    return {
      id: user.id,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      name: fullName,
      email: user.email,
      avatarUrl: user.avatar_url || null,
      organizationId: user.organization_id,
      jobTitle: user.job_title || '',
      department: user.department || '',
      organization: orgName,
      value: user.id,
      label: orgName
        ? `${fullName} (${user.email}) - ${orgName}`
        : `${fullName} (${user.email})`,
    };
  });
}

/**
 * Search users by name or email
 * GET /api/users/search?q=query
 */
export async function GET(request: NextRequest) {
  const { supabase, response } = await requireAuth();
  if (response) return response;
  
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const limitParam = parseInt(searchParams.get('limit') || '', 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;

    // If no query, return an initial list (used to populate pickers on focus)
    if (!query || query.length < 2) {
      if (!searchParams.get('limit')) {
        return NextResponse.json([]);
      }

      const { data: initialUsers, error: initialError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          avatar_url,
          job_title,
          department,
          organization_id,
          organizations!users_organization_id_fkey (
            id,
            name,
            acronym
          )
        `)
        .limit(limit)
        .order('last_name', { ascending: true });

      if (initialError) {
        console.error('[User Search API] Error (initial):', initialError);
        return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
      }

      return NextResponse.json(formatUsers(initialUsers || []));
    }


    // Search users by first_name, last_name, or email
    // SECURITY: Escape ILIKE wildcards to prevent filter injection
    const escapedQuery = escapeIlikeWildcards(query);

    // Use explicit relationship name to avoid ambiguity with multiple foreign keys
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        avatar_url,
        job_title,
        department,
        organization_id,
        organizations!users_organization_id_fkey (
          id,
          name,
          acronym
        )
      `)
      .or(`first_name.ilike.%${escapedQuery}%,last_name.ilike.%${escapedQuery}%,email.ilike.%${escapedQuery}%`)
      .limit(limit)
      .order('last_name', { ascending: true });

    if (error) {
      console.error('[User Search API] Error:', error);
      return NextResponse.json(
        { error: 'Failed to search users' },
        { status: 500 }
      );
    }

    const formattedUsers = formatUsers(users || []);


    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('[User Search API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}


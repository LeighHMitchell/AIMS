import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Search users by name or email
 * GET /api/users/search?q=query
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();

    // Require at least 2 characters for search
    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    console.log('[User Search API] Searching for:', query);

    const supabase = getSupabaseAdmin();

    // Search users by first_name, last_name, or email
    // Use explicit relationship name to avoid ambiguity with multiple foreign keys
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        organization_id,
        organizations!users_organization_id_fkey (
          id,
          name,
          acronym
        )
      `)
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10)
      .order('last_name', { ascending: true });

    if (error) {
      console.error('[User Search API] Error:', error);
      return NextResponse.json(
        { error: 'Failed to search users' },
        { status: 500 }
      );
    }

    // Format users for the frontend
    const formattedUsers = (users || []).map(user => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User';
      const orgName = user.organizations?.name || user.organizations?.acronym || '';
      
      return {
        id: user.id,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        name: fullName,
        email: user.email,
        organizationId: user.organization_id,
        organization: orgName,
        value: user.id,
        label: orgName 
          ? `${fullName} (${user.email}) - ${orgName}`
          : `${fullName} (${user.email})`
      };
    });

    console.log('[User Search API] Found users:', formattedUsers.length);

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('[User Search API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}


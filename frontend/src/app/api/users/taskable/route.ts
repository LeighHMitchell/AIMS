import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { escapeIlikeWildcards } from '@/lib/security-utils';

export const dynamic = 'force-dynamic';

// GET /api/users/taskable - Get users that can be assigned tasks
export async function GET(request: NextRequest) {
  const { supabase, response } = await requireAuth();
  if (response) return response;
  
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const search = searchParams.get('search') || '';
    const organizationId = searchParams.get('organizationId');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('[Taskable Users API] GET for user:', userId);

    // Get requesting user's info
    const { data: requestingUser, error: userError } = await supabase
      .from('users')
      .select('id, role, organization_id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('[Taskable Users API] User lookup error:', userError);
      return NextResponse.json({ error: 'User not found: ' + userError.message }, { status: 404 });
    }

    if (!requestingUser) {
      console.error('[Taskable Users API] User not found:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isSuperUser = requestingUser.role === 'super_user';
    console.log('[Taskable Users API] User role:', requestingUser.role, 'isSuperUser:', isSuperUser);

    // Get user's organization IDs - query user_organizations separately
    const userOrgIds = new Set<string>();

    // Try to get from user_organizations table (may not exist)
    try {
      const { data: userOrgs } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', userId);

      userOrgs?.forEach((uo: any) => userOrgIds.add(uo.organization_id));
    } catch (e) {
      console.log('[Taskable Users API] user_organizations table may not exist:', e);
    }

    // Also add the user's primary organization
    if (requestingUser.organization_id) userOrgIds.add(requestingUser.organization_id);
    console.log('[Taskable Users API] User org IDs:', Array.from(userOrgIds));

    // Build query for users (include self so users can assign tasks to themselves)
    let usersQuery = supabase
      .from('users')
      .select(`
        id, first_name, last_name, email, avatar_url, role, organization_id,
        organization:organizations!organization_id(id, name, acronym, logo)
      `)
      .eq('is_active', true)
      .order('first_name', { ascending: true })
      .limit(limit);

    // Apply search filter
    // SECURITY: Escape ILIKE wildcards to prevent filter injection
    if (search) {
      const escapedSearch = escapeIlikeWildcards(search);
      usersQuery = usersQuery.or(`first_name.ilike.%${escapedSearch}%,last_name.ilike.%${escapedSearch}%,email.ilike.%${escapedSearch}%`);
    }

    // Get available roles (always return these)
    const roles = [
      'super_user',
      'dev_partner_tier_1',
      'dev_partner_tier_2',
      'gov_partner_tier_1',
      'gov_partner_tier_2',
    ];

    // If not super user, filter to users in same organizations
    let reachableUserIds = new Set<string>();
    if (!isSuperUser && userOrgIds.size > 0) {
      // Need to filter by organization - get users from user_organizations
      const orgIdArray = Array.from(userOrgIds);

      // Try to get users in these orgs via user_organizations
      try {
        const { data: orgMembers } = await supabase
          .from('user_organizations')
          .select('user_id')
          .in('organization_id', orgIdArray);

        orgMembers?.forEach((m: any) => reachableUserIds.add(m.user_id));
      } catch (e) {
        console.log('[Taskable Users API] user_organizations query failed:', e);
      }

      // Get users with these org_ids directly
      const { data: directMembers } = await supabase
        .from('users')
        .select('id')
        .in('organization_id', orgIdArray);

      directMembers?.forEach((m: any) => reachableUserIds.add(m.id));
      // Include self so users can assign tasks to themselves
      reachableUserIds.add(userId);

      console.log('[Taskable Users API] Reachable users:', reachableUserIds.size);

      if (reachableUserIds.size > 0) {
        usersQuery = usersQuery.in('id', Array.from(reachableUserIds));
      } else {
        // No reachable users - will fetch empty users but still return orgs and roles
        // Set a fake ID to ensure empty results
        usersQuery = usersQuery.in('id', ['00000000-0000-0000-0000-000000000000']);
      }
    }

    // Filter by specific organization if provided
    if (organizationId) {
      const orgUserIds = new Set<string>();

      // Try to get users in this specific org via user_organizations
      try {
        const { data: orgUsers } = await supabase
          .from('user_organizations')
          .select('user_id')
          .eq('organization_id', organizationId);

        orgUsers?.forEach((u: any) => orgUserIds.add(u.user_id));
      } catch (e) {
        console.log('[Taskable Users API] user_organizations query failed:', e);
      }

      // Get users with this org_id directly
      const { data: directUsers } = await supabase
        .from('users')
        .select('id')
        .eq('organization_id', organizationId);

      directUsers?.forEach((u: any) => orgUserIds.add(u.id));
      // Keep self in the list so users can assign to themselves

      if (orgUserIds.size > 0) {
        usersQuery = usersQuery.in('id', Array.from(orgUserIds));
      }
      // Don't return early - continue to return orgs and roles
    }

    // Get organizations query
    let orgsQuery = supabase
      .from('organizations')
      .select('id, name, acronym, logo')
      .order('name', { ascending: true });

    if (!isSuperUser && userOrgIds.size > 0) {
      orgsQuery = orgsQuery.in('id', Array.from(userOrgIds));
    }

    // Run users and organizations queries in parallel
    const [usersResult, orgsResult] = await Promise.all([
      usersQuery,
      orgsQuery,
    ]);

    if (usersResult.error) {
      console.error('[Taskable Users API] Error fetching users:', usersResult.error);
      return NextResponse.json({ error: usersResult.error.message }, { status: 500 });
    }

    const users = usersResult.data;
    const organizations = orgsResult.data;

    // Get all member counts in batch (much faster than per-org queries)
    const orgMemberCounts: Record<string, number> = {};
    const usersByOrg: Record<string, any[]> = {};
    const orgToUsers: Record<string, Set<string>> = {};

    // Initialize all orgs
    organizations?.forEach(org => {
      orgMemberCounts[org.id] = 0;
      usersByOrg[org.id] = [];
      orgToUsers[org.id] = new Set();
    });

    // Single query to get all active users with their org
    const { data: allActiveUsers } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('is_active', true);

    // Add users by primary org
    allActiveUsers?.forEach((u: any) => {
      if (u.organization_id && orgToUsers[u.organization_id]) {
        orgToUsers[u.organization_id].add(u.id);
      }
    });

    // Try to also count from user_organizations table (may not exist)
    try {
      const { data: userOrgLinks } = await supabase
        .from('user_organizations')
        .select('organization_id, user_id');

      // Add users from user_organizations (uses Set to avoid double-counting)
      userOrgLinks?.forEach((link: any) => {
        if (link.organization_id && orgToUsers[link.organization_id]) {
          orgToUsers[link.organization_id].add(link.user_id);
        }
      });
    } catch (e) {
      console.log('[Taskable Users API] user_organizations not available');
    }

    // Set final counts from Sets
    organizations?.forEach(org => {
      orgMemberCounts[org.id] = orgToUsers[org.id]?.size || 0;
    });

    // Build usersByOrg from the fetched users
    users?.forEach((user: any) => {
      if (user.organization_id && usersByOrg[user.organization_id]) {
        usersByOrg[user.organization_id].push(user);
      }
    });

    console.log('[Taskable Users API] Org member counts:', orgMemberCounts);

    console.log('[Taskable Users API] Returning:', {
      usersCount: users?.length || 0,
      orgsCount: organizations?.length || 0,
      rolesCount: roles.length,
      isSuperUser,
    });

    return NextResponse.json({
      success: true,
      users: users || [],
      usersByOrg,
      orgMemberCounts,
      organizations: organizations || [],
      roles,
      isSuperUser,
    });
  } catch (error) {
    console.error('[Taskable Users API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

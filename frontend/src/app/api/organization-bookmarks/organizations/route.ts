import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Retrieve full organization data for bookmarked organizations
export async function GET(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    if (!supabase) {
      console.error('[Organization Bookmarks API] Supabase admin client is null');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // First, get bookmarked organization IDs for this user
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('organization_bookmarks')
      .select('organization_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (bookmarksError) {
      console.error('[Organization Bookmarks API] Error fetching bookmarks:', bookmarksError);
      return NextResponse.json({ error: 'Failed to fetch bookmarks' }, { status: 500 });
    }

    if (!bookmarks || bookmarks.length === 0) {
      return NextResponse.json({ organizations: [], total: 0 });
    }

    const organizationIds = bookmarks.map((b: { organization_id: string }) => b.organization_id);

    // Fetch full organization data for bookmarked organizations
    const { data: organizations, error: organizationsError } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        acronym,
        Organisation_Type_Code,
        Organisation_Type_Name,
        description,
        website,
        logo,
        banner,
        country,
        country_represented,
        iati_org_id,
        created_at,
        updated_at
      `)
      .in('id', organizationIds);

    if (organizationsError) {
      console.error('[Organization Bookmarks API] Error fetching organizations:', organizationsError);
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
    }

    // Get activity counts for each organization
    const { data: activityCounts, error: activityCountsError } = await supabase
      .from('activities')
      .select('reporting_org_id')
      .in('reporting_org_id', organizationIds);

    // Create activity count map
    const activityCountMap: Record<string, number> = {};
    if (activityCounts && !activityCountsError) {
      activityCounts.forEach((a: { reporting_org_id: string }) => {
        if (a.reporting_org_id) {
          activityCountMap[a.reporting_org_id] = (activityCountMap[a.reporting_org_id] || 0) + 1;
        }
      });
    }

    // Create a map of bookmark dates
    const bookmarkDates: Record<string, string> = {};
    bookmarks.forEach((b: { organization_id: string; created_at: string }) => {
      bookmarkDates[b.organization_id] = b.created_at;
    });

    // Enrich organizations with activity counts and bookmark date
    // Organisation_Type_Name is already in the data from the database
    const enrichedOrganizations = (organizations || [])
      .map((organization: any) => {
        return {
          ...organization,
          organisation_type: organization.Organisation_Type_Code,
          organisation_type_name: organization.Organisation_Type_Name || organization.Organisation_Type_Code,
          activeProjects: activityCountMap[organization.id] || 0,
          bookmarkedAt: bookmarkDates[organization.id],
        };
      })
      .sort((a: any, b: any) => {
        // Sort by bookmark date descending (most recently bookmarked first)
        return new Date(b.bookmarkedAt).getTime() - new Date(a.bookmarkedAt).getTime();
      });

    return NextResponse.json({
      organizations: enrichedOrganizations,
      total: enrichedOrganizations.length,
    });
  } catch (error) {
    console.error('[Organization Bookmarks API] Error in GET:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

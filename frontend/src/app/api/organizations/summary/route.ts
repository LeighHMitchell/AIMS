import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { unstable_cache } from 'next/cache';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Cache the summary calculations for 60 seconds
const getCachedSummary = unstable_cache(
  async () => {
    console.log('[AIMS] Summary Cache MISS - Fetching fresh summary from database');

    // Fetch all data in parallel for better performance
    const [organizationsResult, activitiesResult, transactionsResult, groupsResult] = await Promise.all([
      getSupabaseAdmin()
        .from('organizations')
        .select('id, updated_at'),
      getSupabaseAdmin()
        .from('activities')
        .select('id')
        .in('activity_status', ['2', '3']),
      getSupabaseAdmin()
        .from('transactions')
        .select('value')
        .eq('transaction_type', '2'),
      getSupabaseAdmin()
        .from('custom_groups')
        .select('id')
    ]);

    return {
      organizationsResult,
      activitiesResult,
      transactionsResult,
      groupsResult
    };
  },
  ['organization-summary'],
  {
    revalidate: 60, // Cache for 60 seconds
    tags: ['organizations']
  }
);

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function GET(request: NextRequest) {
  console.log('[AIMS] GET /api/organizations/summary - Starting request');

  try {
    // Check if getSupabaseAdmin is properly initialized
    if (!getSupabaseAdmin()) {
      console.error('[AIMS] getSupabaseAdmin() is not initialized');
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    // Check if cache should be bypassed
    const { searchParams } = new URL(request.url);
    const bustCache = searchParams.has('_');

    let organizations: any[] | null = null;
    let activities: any[] | null = null;
    let transactions: any[] | null = null;
    let groups: any[] | null = null;

    if (bustCache) {
      console.log('[AIMS] Summary Cache BUST - Fetching fresh data');
      // Fetch directly without cache when busting
      const [orgsResult, activitiesResult, transactionsResult, groupsResult] = await Promise.all([
        getSupabaseAdmin().from('organizations').select('id, updated_at'),
        getSupabaseAdmin().from('activities').select('id').in('activity_status', ['2', '3']),
        getSupabaseAdmin().from('transactions').select('value').eq('transaction_type', '2'),
        getSupabaseAdmin().from('custom_groups').select('id')
      ]);
      organizations = orgsResult.data;
      activities = activitiesResult.data;
      transactions = transactionsResult.data;
      groups = groupsResult.data;
    } else {
      // Use server-side cache for normal requests
      const cachedResults = await getCachedSummary();
      organizations = cachedResults.organizationsResult.data;
      activities = cachedResults.activitiesResult.data;
      transactions = cachedResults.transactionsResult.data;
      groups = cachedResults.groupsResult.data;
    }

    // Calculate summary statistics
    const totalOrganizations = organizations?.length || 0;
    const totalActiveProjects = activities?.length || 0;
    const totalCommittedFunding = transactions?.reduce((sum: number, t: any) => sum + (t.value || 0), 0) || 0;
    const totalCustomGroups = groups?.length || 0;

    // Get the most recent update timestamp
    const lastUpdated = organizations && organizations.length > 0
      ? organizations.reduce((latest: string, org: any) => {
          const orgUpdate = new Date(org.updated_at);
          return orgUpdate > new Date(latest) ? org.updated_at : latest;
        }, organizations[0].updated_at)
      : new Date().toISOString();

    const summary = {
      totalOrganizations,
      totalActiveProjects,
      totalCommittedFunding,
      totalCustomGroups,
      lastUpdated
    };

    console.log('[AIMS] Organization summary calculated:', summary);

    const response = NextResponse.json(summary);

    // Add CORS and cache headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

    return response;
  } catch (error) {
    console.error('[AIMS] Unexpected error in organizations summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization summary' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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

    // Fetch organizations count
    const { data: organizations, error: orgsError } = await getSupabaseAdmin()
      .from('organizations')
      .select('id, name, type, created_at, updated_at');

    if (orgsError) {
      console.error('[AIMS] Error fetching organizations:', orgsError);
      return NextResponse.json({ error: orgsError.message }, { status: 500 });
    }

    // Fetch activities count for active projects calculation
    // Note: Using reporting_org_id to link to organizations
    const { data: activities, error: activitiesError } = await getSupabaseAdmin()
      .from('activities')
      .select('id, reporting_org_id, activity_status')
      .in('activity_status', ['2', '3']); // 2=Implementation, 3=Finalisation

    if (activitiesError) {
      console.error('[AIMS] Error fetching activities:', activitiesError);
      // Don't fail the request if activities fetch fails, just set to 0
    }

    // Fetch transaction data for funding calculation
    const { data: transactions, error: transactionsError } = await getSupabaseAdmin()
      .from('transactions')
      .select('value, transaction_type')
      .eq('transaction_type', '2'); // Outgoing Commitment (IATI code)

    if (transactionsError) {
      console.error('[AIMS] Error fetching transactions:', transactionsError);
      // Don't fail the request if transactions fetch fails, just set to 0
    }

    // Fetch custom groups count
    const { data: groups, error: groupsError } = await getSupabaseAdmin()
      .from('custom_groups')
      .select('id');

    if (groupsError) {
      console.error('[AIMS] Error fetching custom groups:', groupsError);
      // Don't fail the request if groups fetch fails, just set to 0
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
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error) {
    console.error('[AIMS] Unexpected error in organizations summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization summary' },
      { status: 500 }
    );
  }
} 
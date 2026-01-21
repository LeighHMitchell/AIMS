import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: organizationId } = await params;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    // Get all published activities where this organization is the reporting org
    const { data: reportingActivities, error: activitiesError } = await supabase
      .from('activities')
      .select('id')
      .eq('reporting_org_id', organizationId)
      .eq('publication_status', 'published');

    if (activitiesError) {
      console.error('[AIMS] Error fetching reporting activities:', activitiesError);
      return NextResponse.json({ error: 'Failed to fetch reporting activities' }, { status: 500 });
    }

    const activityIds = reportingActivities?.map(a => a.id) || [];

    if (activityIds.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch all budgets for those activities with activity details
    const { data: budgets, error: budgetsError } = await supabase
      .from('activity_budgets')
      .select(`
        id,
        activity_id,
        type,
        status,
        period_start,
        period_end,
        value,
        currency,
        value_date,
        usd_value,
        exchange_rate_used,
        usd_conversion_date,
        usd_convertible,
        budget_lines,
        created_at,
        updated_at
      `)
      .in('activity_id', activityIds)
      .order('period_start', { ascending: false });

    if (budgetsError) {
      console.error('[AIMS] Error fetching budgets:', budgetsError);
      return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 });
    }

    // Get activity titles for enrichment
    const uniqueActivityIds = [...new Set(budgets?.map(b => b.activity_id) || [])];

    const { data: activities, error: activityTitlesError } = await supabase
      .from('activities')
      .select('id, title_narrative, acronym')
      .in('id', uniqueActivityIds);

    if (activityTitlesError) {
      console.error('[AIMS] Error fetching activity titles:', activityTitlesError);
      // Continue without titles rather than failing
    }

    // Create activity lookup map
    const activityMap = new Map(
      (activities || []).map(a => [a.id, { title: a.title_narrative, acronym: a.acronym }])
    );

    // Enrich budgets with activity info
    const enrichedBudgets = (budgets || []).map(budget => ({
      ...budget,
      activity_title: activityMap.get(budget.activity_id)?.title || 'Unknown Activity',
      activity_acronym: activityMap.get(budget.activity_id)?.acronym || null
    }));

    return NextResponse.json(enrichedBudgets);
  } catch (error) {
    console.error('[AIMS] Unexpected error fetching organization budgets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Unable to connect to database' },
        { status: 500 }
      );
    }

    // 1. Check active projects count
    const { count: activeProjectsCount, error: activeError } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('activity_status', '2')
      .eq('publication_status', 'published');

    // 2. Get all activities with their statuses
    const { data: allActivities, error: allError } = await supabase
      .from('activities')
      .select('id, title, activity_status, publication_status');

    // 3. Group by status
    const statusGroups = allActivities?.reduce((acc: any, activity: any) => {
      const status = activity.activity_status || 'null';
      if (!acc[status]) acc[status] = [];
      acc[status].push({
        id: activity.id,
        title: activity.title
      });
      return acc;
    }, {});

    // 4. Check 2025 humanitarian transactions
    const { data: transactions2025, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .gte('transaction_date', '2025-01-01')
      .lte('transaction_date', '2025-12-31')
      .limit(50);

    // 5. Check activity collaboration types
    const activityIds = Array.from(new Set(transactions2025?.map((t: any) => t.activity_id).filter(Boolean)));
    const { data: activityCollabTypes } = await supabase
      .from('activities')
      .select('id, collaboration_type')
      .in('id', activityIds);

    const collabTypeMap = new Map(activityCollabTypes?.map((a: any) => [a.id, a.collaboration_type]));

    // Enhance transactions with collaboration type
    const enhancedTransactions = transactions2025?.map((t: any) => {
      const collabType = collabTypeMap.get(t.activity_id);
      return {
        ...t,
        collaboration_type: collabType || null,
        is_humanitarian: ['01', '02', '03'].includes(t.aid_type) || 
                         (typeof collabType === 'string' && 
                          collabType.toLowerCase().includes('humanitarian'))
      };
    });

    // Count published vs unpublished
    const publishedCount = allActivities?.filter((a: any) => a.publication_status === 'published').length || 0;
    const unpublishedCount = allActivities?.filter((a: any) => a.publication_status !== 'published').length || 0;

    return NextResponse.json({
      activeProjects: {
        count: activeProjectsCount,
        error: activeError
      },
      allActivities: {
        total: allActivities?.length || 0,
        published: publishedCount,
        unpublished: unpublishedCount
      },
      statusDistribution: Object.keys(statusGroups || {}).map(status => ({
        status,
        count: statusGroups[status].length,
        activities: statusGroups[status].slice(0, 5) // First 5 examples
      })),
      transactions2025: {
        total: transactions2025?.length || 0,
        humanitarian: enhancedTransactions?.filter((t: any) => t.is_humanitarian).length || 0,
        sample: enhancedTransactions?.slice(0, 5),
        error: transError
      },
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache'
      }
    });
  } catch (error) {
    console.error('[Debug Analytics] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug data' },
      { status: 500 }
    );
  }
} 
import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Optimized Activities API
 * 
 * Performance improvements:
 * 1. Uses materialized view for transaction summaries
 * 2. Implements server-side pagination
 * 3. Reduces payload size by only sending necessary fields
 * 4. Uses proper indexes for filtering and sorting
 * 
 * Backward compatible with existing UI
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100); // Cap at 100
    const search = searchParams.get('search') || '';
    const activityStatus = searchParams.get('activityStatus');
    const publicationStatus = searchParams.get('publicationStatus');
    const submissionStatus = searchParams.get('submissionStatus');
    const sortField = searchParams.get('sortField') || 'updated_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build optimized query using CTE for better performance
    let countQuery = supabase
      .from('activities')
      .select('id', { count: 'exact', head: true });

    let dataQuery = supabase
      .from('activities')
      .select(`
        id,
        other_identifier,
        iati_identifier,
        title_narrative,
        description_narrative,
        created_by_org_name,
        created_by_org_acronym,
        activity_status,
        publication_status,
        submission_status,
        reporting_org_id,
        created_at,
        updated_at,
        planned_start_date,
        planned_end_date,
        default_aid_type,
        default_finance_type,
        default_flow_type,
        default_tied_status
      `)
      .range(offset, offset + limit - 1);

    // Apply filters to both queries
    if (search) {
      const searchConditions = [];
      
      if (isValidUUID(search)) {
        searchConditions.push(`id.eq.${search}`);
      }
      
      searchConditions.push(`iati_identifier.ilike.%${search}%`);
      searchConditions.push(`title_narrative.ilike.%${search}%`);
      
      const orCondition = searchConditions.join(',');
      countQuery = countQuery.or(orCondition);
      dataQuery = dataQuery.or(orCondition);
    }

    if (activityStatus && activityStatus !== 'all') {
      countQuery = countQuery.eq('activity_status', activityStatus);
      dataQuery = dataQuery.eq('activity_status', activityStatus);
    }

    if (publicationStatus && publicationStatus !== 'all') {
      countQuery = countQuery.eq('publication_status', publicationStatus);
      dataQuery = dataQuery.eq('publication_status', publicationStatus);
    }

    if (submissionStatus && submissionStatus !== 'all') {
      countQuery = countQuery.eq('submission_status', submissionStatus);
      dataQuery = dataQuery.eq('submission_status', submissionStatus);
    }

    // Apply sorting
    const validSortFields = ['title_narrative', 'created_at', 'updated_at', 'other_identifier'];
    if (validSortFields.includes(sortField)) {
      dataQuery = dataQuery.order(sortField, { ascending: sortOrder === 'asc' });
    } else {
      dataQuery = dataQuery.order('updated_at', { ascending: false });
    }

    // Execute queries in parallel
    const [countResult, dataResult] = await Promise.all([
      countQuery,
      dataQuery
    ]);

    if (countResult.error) {
      console.error('[AIMS] Count query error:', countResult.error);
      throw countResult.error;
    }

    if (dataResult.error) {
      console.error('[AIMS] Data query error:', dataResult.error);
      throw dataResult.error;
    }

    const totalCount = countResult.count || 0;
    const activities = dataResult.data || [];

    // Fetch transaction summaries from materialized view
    const activityIds = activities.map(a => a.id);
    
    let summariesMap = new Map();
    if (activityIds.length > 0) {
      // First try materialized view for performance
      const { data: summaries, error: summariesError } = await supabase
        .from('activity_transaction_summaries')
        .select('*')
        .in('activity_id', activityIds);

      if (!summariesError && summaries) {
        summaries.forEach(s => {
          summariesMap.set(s.activity_id, {
            commitments: s.commitments || 0,
            disbursements: s.disbursements || 0,
            expenditures: s.expenditures || 0,
            inflows: s.inflows || 0,
            totalTransactions: s.total_transactions || 0
          });
        });
      } else if (summariesError?.message?.includes('relation') || summariesError?.message?.includes('does not exist')) {
        // Fallback: Calculate summaries directly if materialized view doesn't exist
        console.warn('[AIMS Optimized] Materialized view not found, falling back to direct calculation');
        
        const { data: transactions, error: txError } = await supabase
          .from('transactions')
          .select('activity_id, transaction_type, status, value')
          .in('activity_id', activityIds)
          .eq('status', 'actual');
        
        if (!txError && transactions) {
          // Group by activity_id and calculate summaries
          transactions.forEach(t => {
            const current = summariesMap.get(t.activity_id) || {
              commitments: 0,
              disbursements: 0,
              expenditures: 0,
              inflows: 0,
              totalTransactions: 0
            };
            
            current.totalTransactions++;
            
            switch(t.transaction_type) {
              case '2':
                current.commitments += t.value || 0;
                break;
              case '3':
                current.disbursements += t.value || 0;
                break;
              case '4':
                current.expenditures += t.value || 0;
                break;
              case '1':
              case '11':
                current.inflows += t.value || 0;
                break;
            }
            
            summariesMap.set(t.activity_id, current);
          });
        }
      }
    }

    // Transform activities with summaries
    const transformedActivities = activities.map(activity => {
      const summary = summariesMap.get(activity.id) || {
        commitments: 0,
        disbursements: 0,
        expenditures: 0,
        inflows: 0,
        totalTransactions: 0
      };

      return {
        ...activity,
        ...summary,
        // Map database fields to API fields for backward compatibility
        partnerId: activity.other_identifier,
        iatiId: activity.iati_identifier,
        iatiIdentifier: activity.iati_identifier,
        title: activity.title_narrative,
        description: activity.description_narrative,
        created_by_org_name: activity.created_by_org_name,
        created_by_org_acronym: activity.created_by_org_acronym,
        activityStatus: activity.activity_status,
        publicationStatus: activity.publication_status,
        submissionStatus: activity.submission_status,
        reportingOrgId: activity.reporting_org_id,
        plannedStartDate: activity.planned_start_date,
        plannedEndDate: activity.planned_end_date,
        default_aid_type: activity.default_aid_type,
        default_finance_type: activity.default_finance_type,
        default_flow_type: activity.default_flow_type,
        default_tied_status: activity.default_tied_status,
        tied_status: activity.default_tied_status, // Legacy compatibility
        createdAt: activity.created_at,
        updatedAt: activity.updated_at
      };
    });

    // Log performance metrics
    const executionTime = Date.now() - startTime;
    
    // Log to performance table if it exists
    try {
      await supabase
        .from('query_performance_log')
        .insert({
          query_type: 'activities_list_optimized',
          execution_time_ms: executionTime,
          result_count: activities.length,
          filters: {
            page,
            limit,
            search,
            activityStatus,
            publicationStatus,
            submissionStatus,
            sortField,
            sortOrder
          }
        });
    } catch (logError) {
      // Ignore logging errors
    }

    console.log(`[AIMS Optimized] Fetched ${activities.length} activities in ${executionTime}ms`);

    // Return paginated response
    const response = {
      data: transformedActivities,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      performance: {
        executionTimeMs: executionTime
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[AIMS Optimized] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch activities',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
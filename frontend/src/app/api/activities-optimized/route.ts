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

    // Build optimized query
    // Always get count for proper pagination
    let countQuery = supabase.from('activities').select('*', { count: 'exact', head: true });

    let dataQuery = supabase
      .from('activities')
      .select(`
        id,
        other_identifier,
        iati_identifier,
        title_narrative,
        description_narrative,
        acronym,
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
        default_tied_status,
        default_aid_modality,
        default_aid_modality_override,
        banner,
        icon,
        activity_sdg_mappings (
          id,
          sdg_goal,
          sdg_target,
          contribution_percent,
          notes
        )
      `)
      .range(offset, offset + limit - 1);

    // Apply filters
    if (search) {
      const searchConditions = [];
      
      if (isValidUUID(search)) {
        searchConditions.push(`id.eq.${search}`);
      }
      
      searchConditions.push(`iati_identifier.ilike.%${search}%`);
      searchConditions.push(`title_narrative.ilike.%${search}%`);
      searchConditions.push(`acronym.ilike.%${search}%`);
      
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

    // Apply sorting with field mapping
    const sortFieldMap: Record<string, string> = {
      'title': 'title_narrative',
      'title_narrative': 'title_narrative',
      'created_at': 'created_at',
      'updated_at': 'updated_at',
      'updatedAt': 'updated_at',
      'createdAt': 'created_at',
      'partnerId': 'other_identifier',
      'other_identifier': 'other_identifier',
      'activityStatus': 'activity_status',
      'activity_status': 'activity_status',
      'createdBy': 'created_by_org_acronym'
    };
    
    const mappedSortField = sortFieldMap[sortField] || 'updated_at';
    console.log(`[AIMS Optimized] Sorting by ${sortField} -> ${mappedSortField}, order: ${sortOrder}`);
    dataQuery = dataQuery.order(mappedSortField, { ascending: sortOrder === 'asc' });
    
    // Note: Budget and disbursement sorting will be handled client-side after data aggregation
    // since these are calculated fields from multiple tables

    // Execute queries in parallel
    const [countResult, dataResult] = await Promise.all([
      countQuery,
      dataQuery
    ]);

    // Check for HTML error responses (Supabase 520 errors)
    const isHTMLError = (error: any) => {
      return error && error.message && typeof error.message === 'string' && 
             error.message.includes('<!DOCTYPE html>');
    };

    if (countResult.error) {
      console.error('[AIMS] Count query error:', countResult.error);
      if (isHTMLError(countResult.error)) {
        console.error('[AIMS] Detected Supabase connectivity issue (HTML error response)');
        return NextResponse.json(
          { 
            error: 'Database connectivity issue detected',
            details: 'Supabase is experiencing connection problems. Please try again later.',
            code: 'DATABASE_CONNECTION_ERROR'
          },
          { status: 503 }
        );
      }
      throw countResult.error;
    }

    if (dataResult.error) {
      console.error('[AIMS] Data query error:', dataResult.error);
      if (isHTMLError(dataResult.error)) {
        console.error('[AIMS] Detected Supabase connectivity issue (HTML error response)');
        return NextResponse.json(
          { 
            error: 'Database connectivity issue detected',
            details: 'Supabase is experiencing connection problems. Please try again later.',
            code: 'DATABASE_CONNECTION_ERROR'
          },
          { status: 503 }
        );
      }
      throw dataResult.error;
    }

    const totalCount = countResult.count ?? null;
    const activities = dataResult.data || [];

    // Fetch transaction summaries and budget data
    const activityIds = activities.map((a: any) => a.id);
    
    let summariesMap = new Map();
    let budgetMap = new Map();
    
    if (activityIds.length > 0) {
      // Fetch budget totals
      const { data: budgets, error: budgetError } = await supabase
        .from('activity_budgets')
        .select('activity_id, value, currency, usd_value')
        .in('activity_id', activityIds);

      if (budgetError) {
        console.error('[AIMS Optimized] Budget fetch error:', budgetError);
      } else if (budgets) {
        console.log('[AIMS Optimized] Budget data fetched:', budgets.length, 'entries');
        budgets.forEach((b: any) => {
          const current = budgetMap.get(b.activity_id) || 0;
          // Use USD converted value for aggregation
          const budgetValue = b.usd_value || 0;
          budgetMap.set(b.activity_id, current + budgetValue);
        });
        console.log('[AIMS Optimized] Budget map:', Object.fromEntries(budgetMap));
      } else {
        console.log('[AIMS Optimized] No budget data found');
      }

      // Temporarily disable materialized view to force USD calculation
      // Comment out the materialized view code since we're forcing fallback
      /*
      const { data: summaries, error: summariesError } = await supabase
        .from('activity_transaction_summaries')
        .select('*')
        .in('activity_id', activityIds);

      if (!summariesError && summaries) {
        console.log('[AIMS Optimized] Transaction summaries fetched:', summaries.length, 'entries');
        summaries.forEach((s: any) => {
          summariesMap.set(s.activity_id, {
            commitments: s.commitments || 0,
            disbursements: s.disbursements || 0,
            expenditures: s.expenditures || 0,
            inflows: s.inflows || 0,
            totalTransactions: s.total_transactions || 0,
            totalBudget: budgetMap.get(s.activity_id) || 0,
            totalDisbursed: (s.disbursements || 0) + (s.expenditures || 0)
          });
        });
        console.log('[AIMS Optimized] Summaries map:', Object.fromEntries(summariesMap));
      } else {
      */
      
      // Force fallback to USD calculation
      const summariesError = { message: 'Forcing fallback to USD calculation' };
      if (summariesError) {
        // Fallback: Calculate summaries directly if materialized view doesn't exist
        console.warn('[AIMS Optimized] Materialized view error:', summariesError);
        console.warn('[AIMS Optimized] Falling back to direct calculation');
        
        const { data: transactions, error: txError } = await supabase
          .from('transactions')
          .select('activity_id, transaction_type, status, value, value_usd')
          .in('activity_id', activityIds);
          // Remove status filter temporarily to see all transactions
        
        if (!txError && transactions) {
          console.log('[AIMS Optimized] Fallback: Found', transactions.length, 'transactions');
          // Group by activity_id and calculate summaries
          transactions.forEach((t: any) => {
            const current = summariesMap.get(t.activity_id) || {
              commitments: 0,
              disbursements: 0,
              expenditures: 0,
              inflows: 0,
              totalTransactions: 0,
              totalBudget: budgetMap.get(t.activity_id) || 0,
              totalDisbursed: 0
            };
            
            current.totalTransactions++;
            
            // Use USD converted value for aggregation
            const transactionValue = t.value_usd || 0;
            
            switch(t.transaction_type) {
              case '2':
                current.commitments += transactionValue;
                break;
              case '3':
                current.disbursements += transactionValue;
                current.totalDisbursed += transactionValue;
                break;
              case '4':
                current.expenditures += transactionValue;
                current.totalDisbursed += transactionValue;
                break;
              case '1':
              case '11':
                current.inflows += transactionValue;
                break;
            }
            
            summariesMap.set(t.activity_id, current);
          });
        }
        
        // Ensure all activities have budget data even if no transactions
        activityIds.forEach((activityId: string) => {
          if (!summariesMap.has(activityId)) {
            summariesMap.set(activityId, {
              commitments: 0,
              disbursements: 0,
              expenditures: 0,
              inflows: 0,
              totalTransactions: 0,
              totalBudget: budgetMap.get(activityId) || 0,
              totalDisbursed: 0
            });
          }
        });
      }
    }

    // Transform activities with summaries
    let transformedActivities = activities.map((activity: any) => {
      const summary = summariesMap.get(activity.id) || {
        commitments: 0,
        disbursements: 0,
        expenditures: 0,
        inflows: 0,
        totalTransactions: 0,
        totalBudget: 0,
        totalDisbursed: 0
      };
      
      console.log(`[AIMS Optimized] Activity ${activity.id} summary:`, summary);

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
        banner: activity.banner, // Include banner for card view
        icon: activity.icon, // Include icon for card view
        createdAt: activity.created_at,
        updatedAt: activity.updated_at,
        // Include SDG mappings for display with proper field mapping
        sdgMappings: (activity.activity_sdg_mappings || []).map((mapping: any) => ({
          id: mapping.id,
          sdgGoal: mapping.sdg_goal,
          sdgTarget: mapping.sdg_target,
          contributionPercent: mapping.contribution_percent,
          notes: mapping.notes
        }))
      };
    });

    // Apply client-side sorting for calculated fields (budget and disbursement)
    if (sortField === 'commitments' || sortField === 'disbursements') {
      transformedActivities.sort((a: any, b: any) => {
        let aValue, bValue;
        if (sortField === 'commitments') {
          aValue = a.totalBudget || 0;
          bValue = b.totalBudget || 0;
        } else if (sortField === 'disbursements') {
          aValue = a.totalDisbursed || 0;
          bValue = b.totalDisbursed || 0;
        }
        
        if (sortOrder === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });
    }

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
      activities: transformedActivities,
      data: transformedActivities,
      totalCount: totalCount ?? 0,
      pagination: {
        page,
        limit,
        total: totalCount ?? 0,
        totalCount: totalCount ?? 0,
        totalPages: totalCount ? Math.ceil(totalCount / limit) : 1
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
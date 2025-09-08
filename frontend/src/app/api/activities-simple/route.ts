import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Add caching headers for better performance
const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
  'CDN-Cache-Control': 'public, s-maxage=60',
  'Vercel-CDN-Cache-Control': 'public, s-maxage=60',
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Smaller default, cap at 100
    const offset = (page - 1) * limit;

    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Unable to connect to database' },
        { status: 500 }
      );
    }

    console.log('[AIMS-SIMPLE] Database URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...');

    // Avoid exact count(*) which can be expensive. Use a light approximate count via a small window.
    // Frontend can operate without total count or with a best-effort estimate.
    let count: number | null = null;
    try {
      const { data: sample, error: sampleError } = await supabase
        .from('activities')
        .select('id')
        .range(0, 999);
      if (!sampleError) {
        // If we got a full 1000 rows, the real count is >= 1000; otherwise it equals sample length.
        count = (sample?.length || 0) >= 1000 ? 1000 : (sample?.length || 0);
      }
    } catch (_) {
      // ignore
    }

    // Check if card view is requested (needs banner and icon)
    const includeImages = searchParams.get('includeImages') === 'true';
    
    // Use the simplest possible query without any joins
    console.log('[AIMS-SIMPLE] Executing simple query without joins...', includeImages ? 'including images for card view' : 'excluding images for performance');
    const selectFields = `
        id,
        other_identifier,
        iati_identifier,
        title_narrative,
        description_narrative,
        collaboration_type,
        activity_status,
        publication_status,
        submission_status,
        reporting_org_id,
        created_by_org_name,
        created_by_org_acronym,
        hierarchy,
        linked_data_uri,
        created_at,
        updated_at,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        actual_end_date,
        default_aid_type,
        default_flow_type,
        default_finance_type,
        default_tied_status,
        default_currency,
        created_by,
        ${includeImages ? 'banner, icon,' : ''}
        activity_sdg_mappings (
          id,
          sdg_goal,
          sdg_target,
          contribution_percent,
          notes
        )
      `;
    
    const { data, error } = await supabase
      .from('activities')
      .select(selectFields)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[AIMS-SIMPLE] Error fetching activities:', error);
      console.error('[AIMS-SIMPLE] Error details:', JSON.stringify(error, null, 2));
      
      // Check for HTML error responses (Supabase 520 errors)
      if (error && error.message && typeof error.message === 'string' && 
          error.message.includes('<!DOCTYPE html>')) {
        console.error('[AIMS-SIMPLE] Detected Supabase connectivity issue (HTML error response)');
        return NextResponse.json(
          { 
            error: 'Database connectivity issue detected',
            details: 'Supabase is experiencing connection problems. Please try again later.',
            code: 'DATABASE_CONNECTION_ERROR'
          },
          { status: 503 }
        );
      }
      
      return NextResponse.json({ 
        error: 'Unable to fetch activities. Please try again later.' 
      }, { status: 500 });
    }

    console.log(`[AIMS-SIMPLE] Fetched ${data?.length || 0} activities (page ${page})`);

    // Fetch budget data and transaction summaries for each activity
    const activityIds = data?.map((a: any) => a.id) || [];
    
    let budgetMap = new Map();
    let summariesMap = new Map();
    
    if (activityIds.length > 0) {
      // Fetch budget totals
      const { data: budgets, error: budgetError } = await supabase
        .from('activity_budgets')
        .select('activity_id, value, currency, usd_value')
        .in('activity_id', activityIds);

      if (budgetError) {
        console.error('[AIMS-SIMPLE] Budget fetch error:', budgetError);
      } else if (budgets) {
        console.log('[AIMS-SIMPLE] Budget data fetched:', budgets.length, 'entries');
        budgets.forEach((b: any) => {
          const current = budgetMap.get(b.activity_id) || 0;
          // Use USD converted value for aggregation
          const budgetValue = b.usd_value || 0;
          budgetMap.set(b.activity_id, current + budgetValue);
        });
        console.log('[AIMS-SIMPLE] Budget map:', Object.fromEntries(budgetMap));
      } else {
        console.log('[AIMS-SIMPLE] No budget data found');
      }

      // Fetch transaction summaries
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('activity_id, transaction_type, status, value, value_usd')
        .in('activity_id', activityIds);
        // Remove status filter temporarily to see all transactions
      
      if (!txError && transactions) {
        // Group by activity_id and calculate summaries
        transactions.forEach((t: any) => {
          const current = summariesMap.get(t.activity_id) || {
            commitments: 0,
            disbursements: 0,
            expenditures: 0,
            inflows: 0,
            totalTransactions: 0,
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
    }

    // Transform the data to match frontend expectations
    const transformedActivities = data?.map((activity: any) => {
      const summary = summariesMap.get(activity.id) || {
        commitments: 0,
        disbursements: 0,
        expenditures: 0,
        inflows: 0,
        totalTransactions: 0,
        totalDisbursed: 0
      };
      const totalBudget = budgetMap.get(activity.id) || 0;

      return {
      ...activity,
      // Map new column names to old API field names for backward compatibility
      title: activity.title_narrative,
      description: activity.description_narrative,
      partnerId: activity.other_identifier,
      iatiId: activity.iati_identifier,
      iatiIdentifier: activity.iati_identifier,
      collaborationType: activity.collaboration_type,
      activityStatus: activity.activity_status,
      publicationStatus: activity.publication_status,
      submissionStatus: activity.submission_status,
      reportingOrgId: activity.reporting_org_id,
      createdByOrg: activity.reporting_org_id,
      hierarchy: activity.hierarchy,
      linkedDataUri: activity.linked_data_uri,
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
      plannedStartDate: activity.planned_start_date,
      plannedEndDate: activity.planned_end_date,
      actualStartDate: activity.actual_start_date,
      actualEndDate: activity.actual_end_date,
      // Add creator information (simplified)
      createdBy: {
        id: activity.created_by || 'unknown',
        name: activity.created_by_org_name || 'Unknown User',
        firstName: '',
        lastName: ''
      },
      // Add financial fields
      default_aid_type: activity.default_aid_type,
      default_flow_type: activity.default_flow_type,
      tied_status: activity.default_tied_status,
      default_finance_type: activity.default_finance_type,
      default_currency: activity.default_currency,
      // Add IATI sync fields (set to defaults)
      autoSync: false,
      lastSyncTime: null,
      syncStatus: 'never',
      // Add empty arrays for related data to prevent frontend errors
      sectors: [],
      sdgMappings: (activity.activity_sdg_mappings || []).map((mapping: any) => ({
        id: mapping.id,
        sdgGoal: mapping.sdg_goal,
        sdgTarget: mapping.sdg_target,
        contributionPercent: mapping.contribution_percent,
        notes: mapping.notes
      })),
      contacts: [],
      locations: { site_locations: [], broad_coverage_locations: [] },
      // Add transaction summaries
      commitments: summary.commitments,
      disbursements: summary.disbursements,
      expenditures: summary.expenditures,
      inflows: summary.inflows,
      totalTransactions: summary.totalTransactions,
      totalBudget: totalBudget,
      totalDisbursed: summary.totalDisbursed,
      // Add empty arrays for organizations
      funders: [],
      implementers: [],
      extendingOrganizations: [],
      transactionOrganizations: [],
      transactions: []
    };
  }) || [];

    return NextResponse.json({
      data: transformedActivities,
      pagination: {
        page,
        limit,
        // Provide best-effort total; if null, omit it to avoid forcing UI to use it
        total: count ?? undefined,
        totalPages: count ? Math.ceil(count / limit) : undefined
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Total-Count': String(count || 0),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('[AIMS-SIMPLE] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}
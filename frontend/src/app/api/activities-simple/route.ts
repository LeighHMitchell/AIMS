import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500); // Cap at 500 to prevent huge responses
    const offset = (page - 1) * limit;

    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Unable to connect to database' },
        { status: 500 }
      );
    }

    // Debug: Check the database URL
    console.log('[AIMS-SIMPLE] Database URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...');

    // Get total count
    const { count, error: countError } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.error('[AIMS-SIMPLE] Error getting count:', countError);
    }
    
    console.log('[AIMS-SIMPLE] Total activities in database:', count);

    // Get paginated data with limited fields to reduce size
    console.log('[AIMS-SIMPLE] Executing main query with joins...');
    let data: any;
    
    const queryResult = await supabase
      .from('activities')
      .select(`
        id,
        other_identifier,
        iati_identifier,
        title_narrative,
        description_narrative,
        collaboration_type,
        activity_status,
        publication_status,
        submission_status,
        banner,
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
        flow_type,
        default_finance_type,
        default_tied_status,
        default_currency,
        created_by,
        users:created_by (
          id,
          first_name,
          last_name,
          organisation
        ),
        organizations:reporting_org_id (
          id,
          name,
          acronym
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    data = queryResult.data;
    const error = queryResult.error;

    if (error) {
      console.error('[AIMS-SIMPLE] Error fetching activities:', error);
      console.error('[AIMS-SIMPLE] Error details:', JSON.stringify(error, null, 2));
      
      // Try a simpler query without joins as fallback
      console.log('[AIMS-SIMPLE] Attempting fallback query without joins...');
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('activities')
        .select(`
          id,
          other_identifier,
          iati_identifier,
          title_narrative,
          description_narrative,
          collaboration_type,
          activity_status,
          publication_status,
          submission_status,
          banner,
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
          flow_type,
          default_finance_type,
          default_tied_status,
          default_currency,
          created_by
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
        
      if (fallbackError) {
        console.error('[AIMS-SIMPLE] Fallback query also failed:', fallbackError);
        return NextResponse.json({ error: 'Unable to connect to database. Please check your connection and try again.' }, { status: 500 });
      }
      
      // Use fallback data without joins
      console.log('[AIMS-SIMPLE] Using fallback data without joins');
      data = fallbackData;
    }

    console.log(`[AIMS-SIMPLE] Fetched ${data?.length || 0} activities (page ${page})`);

    // Fetch transaction summaries for all activities
    const { data: transactionSummaries, error: transError } = await supabase
      .from('transactions')
      .select('activity_id, transaction_type, value, status')
      .in('activity_id', data?.map((a: any) => a.id) || [])
      .in('status', ['actual', 'draft']); // Include both actual and draft transactions

    if (transError) {
      console.error('[AIMS-SIMPLE] Error fetching transaction summaries:', transError);
    }

    // Calculate commitments and disbursements for each activity
    const activityTransactionMap = new Map();
    
    if (transactionSummaries) {
      transactionSummaries.forEach((transaction: any) => {
        if (!activityTransactionMap.has(transaction.activity_id)) {
          activityTransactionMap.set(transaction.activity_id, {
            commitments: 0,
            disbursements: 0,
            expenditures: 0,
            inflows: 0,
            totalTransactions: 0
          });
        }
        
        const summary = activityTransactionMap.get(transaction.activity_id);
        summary.totalTransactions += 1;
        
        // Map transaction types to summaries
        // Type 1 = Incoming Commitment (inflows)
        // Type 2 = Outgoing Commitment (commitments)
        // Type 3 = Disbursement
        // Type 4 = Expenditure
        // Type 12 = Incoming Funds (inflows)
        if (transaction.transaction_type === '1') {
          summary.inflows += transaction.value || 0;
        } else if (transaction.transaction_type === '2') {
          summary.commitments += transaction.value || 0;
        } else if (transaction.transaction_type === '3') {
          summary.disbursements += transaction.value || 0;
        } else if (transaction.transaction_type === '4') {
          summary.expenditures += transaction.value || 0;
        } else if (transaction.transaction_type === '12') {
          summary.inflows += transaction.value || 0;
        }
      });
    }

    // Transform the data to match frontend expectations
    const transformedActivities = data?.map((activity: any) => ({
      ...activity,
      // Map new column names to old API field names for backward compatibility
      title: activity.title_narrative,
      description: activity.description_narrative,
      partnerId: activity.other_identifier,
      iatiId: activity.iati_identifier,
      collaborationType: activity.collaboration_type,
      activityStatus: activity.activity_status,
      publicationStatus: activity.publication_status,
      submissionStatus: activity.submission_status,
      reportingOrgId: activity.reporting_org_id,
      created_by_org_name: activity.organizations?.name || activity.created_by_org_name,
      created_by_org_acronym: activity.organizations?.acronym || activity.created_by_org_acronym,
      hierarchy: activity.hierarchy,
      linkedDataUri: activity.linked_data_uri,
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
      plannedStartDate: activity.planned_start_date,
      plannedEndDate: activity.planned_end_date,
      actualStartDate: activity.actual_start_date,
      actualEndDate: activity.actual_end_date,
      // Add creator information
      createdBy: activity.users ? {
        id: activity.users.id,
        name: `${activity.users.first_name || ''} ${activity.users.last_name || ''}`.trim() || 'Unknown User',
        firstName: activity.users.first_name,
        lastName: activity.users.last_name
      } : null,
      createdByOrg: activity.reporting_org_id,
      // Add financial fields
      default_aid_type: activity.default_aid_type,
      flow_type: activity.flow_type,
      tied_status: activity.default_tied_status,
      default_finance_type: activity.default_finance_type,
      default_currency: activity.default_currency,
      // Add IATI sync fields (set to defaults as columns don't exist yet)
      autoSync: false,
      lastSyncTime: null,
      syncStatus: 'never',
      // Add empty arrays for related data to prevent frontend errors
      sectors: [],
      sdgMappings: [],
      contacts: [],
      locations: { site_locations: [], broad_coverage_locations: [] },
      // Add transaction summaries
      commitments: activityTransactionMap.get(activity.id)?.commitments || 0,
      disbursements: activityTransactionMap.get(activity.id)?.disbursements || 0,
      expenditures: activityTransactionMap.get(activity.id)?.expenditures || 0,
      inflows: activityTransactionMap.get(activity.id)?.inflows || 0,
      totalTransactions: activityTransactionMap.get(activity.id)?.totalTransactions || 0
    })) || [];

    return NextResponse.json({
      data: transformedActivities,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
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
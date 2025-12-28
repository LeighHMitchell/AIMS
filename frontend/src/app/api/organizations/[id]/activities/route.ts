import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: orgId } = params;
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    
    // Get transaction type from query parameters
    const { searchParams } = new URL(request.url);
    const transactionType = searchParams.get('transactionType') || 'C';
    const transactionTypeCodes = transactionType === 'C' ? ['1', '2', '11'] : ['3', '4'];
    
    console.log('[AIMS] GET /api/organizations/[id]/activities - Fetching activities for org:', orgId, 'transactionType:', transactionType);
    
    // Check if getSupabaseAdmin() is properly initialized
    if (!getSupabaseAdmin()) {
      console.error('[AIMS] getSupabaseAdmin() is not initialized');
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }
    
    // First, get the organization details
    const { data: organization, error: orgError } = await getSupabaseAdmin()
      .from('organizations')
      .select('id, name, acronym')
      .eq('id', orgId)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    console.log('[AIMS] Found organization:', organization.name, '(', organization.acronym, ')');

    // Get transactions where this organization is the provider (not receiver) to find activities they report/fund
    const { data: transactions, error: transError } = await getSupabaseAdmin()
      .from('transactions')
      .select('activity_id, provider_org_id, receiver_org_id, provider_org_name, receiver_org_name, value, value_usd, transaction_type, transaction_date')
      .or(`provider_org_id.eq.${orgId},provider_org_name.eq.${organization.name}`)
      .in('transaction_type', transactionTypeCodes);

    if (transError) {
      console.error('[AIMS] Error fetching transactions:', transError);
    }

    // Get unique activity IDs from transactions involving this organization
    const activityIdsFromTransactions = new Set();
    (transactions || []).forEach((trans: any) => {
      if (trans.activity_id) {
        activityIdsFromTransactions.add(trans.activity_id);
      }
    });

    console.log('[AIMS] Found', activityIdsFromTransactions.size, 'unique activities from transactions');

    // Also get activities where this organization is the reporting organization
    const { data: reportingActivities, error: reportingError } = await getSupabaseAdmin()
      .from('activities')
      .select('id')
      .eq('reporting_org_id', orgId)
      .in('activity_status', ['2', '3']);

    // Combine both sets of activity IDs
    const allActivityIds = new Set([
      ...Array.from(activityIdsFromTransactions),
      ...(reportingActivities || []).map((a: any) => a.id)
    ]);

    console.log('[AIMS] Total unique activities for', organization.name, ':', allActivityIds.size);

    // Fetch full activity details for all related activities
    const { data: activities, error } = allActivityIds.size > 0 ? await getSupabaseAdmin()
      .from('activities')
      .select(`
        id,
        title_narrative,
        acronym,
        activity_status,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        actual_end_date,
        reporting_org_id,
        created_at,
        updated_at,
        created_by_org_name,
        created_by_org_acronym,
        icon
      `)
      .in('id', Array.from(allActivityIds))
      .in('activity_status', ['2', '3']) // Only active statuses
      .order('created_at', { ascending: false }) : { data: [], error: null };

    console.log('[AIMS] Found', activities?.length || 0, 'activities with reporting_org_id =', orgId);
    
    // Debug logging (same as partners summary)
    if (activities && activities.length > 0) {
      console.log(`[AIMS] Activities for ${organization.name}:`);
      activities.forEach((activity: any) => {
        console.log(`  - Activity: ${activity.id}, title: "${activity.activity_title}", created_by_org_name: "${activity.created_by_org_name}", reporting_org_id: "${activity.reporting_org_id}"`);
      });
    } else {
      console.log(`[AIMS] No activities found for ${organization.name} with reporting_org_id = ${orgId}`);
    }
    
    if (error) {
      console.error('[AIMS] Error fetching organization activities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activities', details: error.message },
        { status: 500 }
      );
    }
    
    console.log('[AIMS] Found activities for organization:', activities?.length || 0);
    
    // Add financial data calculation for each activity (same logic as organization level)
    const activitiesWithFinancialData = (activities || []).map((activity: any) => {
      // Calculate financial data by year for this specific activity
      const financialData: Record<string, number> = {};
      const years = [2022, 2023, 2024, 2025, 2026, 2027];
      
      // Initialize all years with 0
      years.forEach(year => {
        financialData[year.toString()] = 0;
      });
      
      // Use the transaction type codes we already have
      
      // Calculate yearly totals from transactions for this specific activity
      years.forEach(year => {
        const yearTotal = (transactions || []).reduce((sum: number, trans: any) => {
          if (!trans.transaction_date || trans.activity_id !== activity.id) return sum;
          
          try {
            const transYear = new Date(trans.transaction_date).getFullYear();
            if (transYear !== year) return sum;
            
            // Check if transaction type matches what we're looking for
            if (!transactionTypeCodes.includes(trans.transaction_type)) return sum;
            
            // Check if this organization is involved in the transaction
            const isInvolved = trans.provider_org_id === organization.id || 
                              trans.receiver_org_id === organization.id ||
                              trans.provider_org_name === organization.name || 
                              trans.receiver_org_name === organization.name;
            
            if (isInvolved) {
              const transValue = trans.value_usd || trans.value;
              const amount = (typeof transValue === 'number' && !isNaN(transValue)) ? transValue : 0;
              return sum + amount;
            }
            
            return sum;
          } catch (dateError) {
            console.warn('[AIMS] Invalid transaction date:', trans.transaction_date);
            return sum;
          }
        }, 0);
        
        financialData[year.toString()] = yearTotal;
      });

      return {
        ...activity,
        activity_title: activity.title_narrative, // Use the correct column name
        start_date: activity.actual_start_date || activity.planned_start_date,
        end_date: activity.actual_end_date || activity.planned_end_date,
        activity_status_label: activity.activity_status === '2' ? 'Implementation' : 
                             activity.activity_status === '3' ? 'Finalisation' : 
                             activity.activity_status,
        financialData
      };
    });
    
    const response = NextResponse.json(activitiesWithFinancialData);
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
    
  } catch (error) {
    console.error('[AIMS] Unexpected error in GET organization activities:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

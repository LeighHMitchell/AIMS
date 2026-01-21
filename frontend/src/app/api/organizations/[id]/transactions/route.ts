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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    // Default to false - show only org's directly reported transactions for consistency with hero cards
    const includeLinked = searchParams.get('includeLinked') === 'true';

    // Get all published activities where this organization is the reporting org
    const { data: reportingActivities, error: activitiesError } = await supabase
      .from('activities')
      .select('id')
      .eq('reporting_org_id', organizationId)
      .eq('publication_status', 'published');

    if (activitiesError) {
      console.error('[AIMS] Error fetching reporting activities:', activitiesError);
      return NextResponse.json({
        error: 'Failed to fetch reporting activities',
        details: activitiesError.message
      }, { status: 500 });
    }

    const activityIds = reportingActivities?.map(a => a.id) || [];

    if (activityIds.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch ALL transactions for those activities (not just where org is provider/receiver)
    const { data: ownTransactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        uuid,
        activity_id,
        transaction_type,
        transaction_date,
        value,
        currency,
        value_usd,
        value_date,
        description,
        provider_org_id,
        provider_org_name,
        provider_org_ref,
        receiver_org_id,
        receiver_org_name,
        receiver_org_ref,
        finance_type,
        aid_type,
        flow_type,
        tied_status,
        disbursement_channel,
        status,
        humanitarian,
        exchange_rate_used,
        usd_conversion_date,
        created_at,
        updated_at
      `)
      .in('activity_id', activityIds)
      .order('transaction_date', { ascending: false });

    if (transactionsError) {
      console.error('[AIMS] Error fetching transactions:', transactionsError);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    // Mark own transactions with source
    let allTransactions = (ownTransactions || []).map(t => ({
      ...t,
      transaction_source: 'own' as const
    }));

    // Fetch linked transactions if requested
    if (includeLinked && activityIds.length > 0) {
      try {
        // Get linked activities (both directions) for all reporting activities
        const { data: relatedActivities, error: relatedError } = await supabase
          .from('related_activities')
          .select('linked_activity_id, source_activity_id')
          .or(`source_activity_id.in.(${activityIds.join(',')}),linked_activity_id.in.(${activityIds.join(',')})`);

        if (relatedError) {
          console.error('[AIMS] Error fetching related activities:', relatedError);
        } else if (relatedActivities && relatedActivities.length > 0) {
          // Extract linked activity IDs (excluding our own activities)
          const linkedActivityIds = new Set<string>();
          const activityIdSet = new Set(activityIds);
          
          relatedActivities.forEach((ra: any) => {
            if (ra.linked_activity_id && !activityIdSet.has(ra.linked_activity_id)) {
              linkedActivityIds.add(ra.linked_activity_id);
            }
            if (ra.source_activity_id && !activityIdSet.has(ra.source_activity_id)) {
              linkedActivityIds.add(ra.source_activity_id);
            }
          });

          if (linkedActivityIds.size > 0) {
            console.log(`[AIMS] Fetching transactions from ${linkedActivityIds.size} linked activities`);
            
            // Fetch transactions from linked activities
            const { data: linkedTransactions, error: linkedError } = await supabase
              .from('transactions')
              .select(`
                uuid,
                activity_id,
                transaction_type,
                transaction_date,
                value,
                currency,
                value_usd,
                value_date,
                description,
                provider_org_id,
                provider_org_name,
                provider_org_ref,
                receiver_org_id,
                receiver_org_name,
                receiver_org_ref,
                finance_type,
                aid_type,
                flow_type,
                tied_status,
                disbursement_channel,
                status,
                humanitarian,
                exchange_rate_used,
                usd_conversion_date,
                created_at,
                updated_at
              `)
              .in('activity_id', Array.from(linkedActivityIds))
              .order('transaction_date', { ascending: false });

            if (linkedError) {
              console.error('[AIMS] Error fetching linked transactions:', linkedError);
            } else if (linkedTransactions) {
              console.log(`[AIMS] Found ${linkedTransactions.length} linked transactions`);
              
              // Mark linked transactions with source
              const formattedLinkedTransactions = linkedTransactions.map((t: any) => ({
                ...t,
                transaction_source: 'linked' as const,
                linked_from_activity_id: t.activity_id
              }));
              
              allTransactions = [...allTransactions, ...formattedLinkedTransactions];
            }
          }
        }
      } catch (linkedError) {
        console.error('[AIMS] Error processing linked transactions:', linkedError);
        // Continue with just own transactions
      }
    }

    // Get activity titles for enrichment (including linked activities)
    const uniqueActivityIds = [...new Set(allTransactions.map(t => t.activity_id))];

    const { data: activities, error: activityTitlesError } = await supabase
      .from('activities')
      .select('id, title_narrative, acronym')
      .in('id', uniqueActivityIds);

    if (activityTitlesError) {
      console.error('[AIMS] Error fetching activity titles:', activityTitlesError);
      // Continue without titles rather than failing
    }

    // Get organization logos for provider and receiver orgs
    const allOrgIds = new Set<string>();
    allTransactions.forEach(t => {
      if (t.provider_org_id) allOrgIds.add(t.provider_org_id);
      if (t.receiver_org_id) allOrgIds.add(t.receiver_org_id);
    });

    let organizations: any[] = [];
    if (allOrgIds.size > 0) {
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, acronym, icon')
        .in('id', Array.from(allOrgIds));

      if (orgsError) {
        console.error('[AIMS] Error fetching organizations:', orgsError);
        // Continue without org details rather than failing
      } else {
        organizations = orgsData || [];
      }
    }

    // Create lookup maps
    const activityMap = new Map(
      (activities || []).map(a => [a.id, { title: a.title_narrative, acronym: a.acronym }])
    );

    const orgMap = new Map(
      organizations.map(o => [o.id, { name: o.name, acronym: o.acronym, logo: o.icon }])
    );

    // Enrich transactions with activity and org info
    const enrichedTransactions = allTransactions.map(transaction => ({
      ...transaction,
      activity_title: activityMap.get(transaction.activity_id)?.title || 'Unknown Activity',
      activity_acronym: activityMap.get(transaction.activity_id)?.acronym || null,
      linked_from_activity_title: transaction.transaction_source === 'linked' 
        ? activityMap.get(transaction.activity_id)?.title 
        : undefined,
      provider_org_logo: transaction.provider_org_id ? orgMap.get(transaction.provider_org_id)?.logo : null,
      provider_org_acronym: transaction.provider_org_id ? orgMap.get(transaction.provider_org_id)?.acronym : null,
      receiver_org_logo: transaction.receiver_org_id ? orgMap.get(transaction.receiver_org_id)?.logo : null,
      receiver_org_acronym: transaction.receiver_org_id ? orgMap.get(transaction.receiver_org_id)?.acronym : null
    }));

    // Sort all transactions by date (since we merged two sets)
    enrichedTransactions.sort((a, b) => {
      const dateA = a.transaction_date ? new Date(a.transaction_date).getTime() : 0;
      const dateB = b.transaction_date ? new Date(b.transaction_date).getTime() : 0;
      return dateB - dateA; // Descending order
    });

    console.log(`[AIMS] Returning ${enrichedTransactions.length} total transactions (${allTransactions.filter(t => t.transaction_source === 'own').length} own, ${allTransactions.filter(t => t.transaction_source === 'linked').length} linked)`);

    return NextResponse.json(enrichedTransactions);
  } catch (error) {
    console.error('[AIMS] Unexpected error fetching organization transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

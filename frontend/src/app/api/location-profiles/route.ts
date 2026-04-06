import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrVisitor } from '@/lib/auth';
import { MYANMAR_REGIONS } from '@/data/myanmar-regions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuthOrVisitor(request);
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not initialized' }, { status: 500 });
    }

    // Get activity counts per state/region from activity_locations
    const { data: locations, error: locError } = await supabase
      .from('activity_locations')
      .select('activity_id, state_region_code, state_region_name')
      .not('state_region_code', 'is', null);

    if (locError) {
      console.error('[Location Profiles API] Error fetching locations:', locError);
      return NextResponse.json({ error: 'Failed to fetch location data' }, { status: 500 });
    }

    // Also get from subnational_breakdowns for activities that use percentage allocations
    const { data: breakdowns, error: bdError } = await supabase
      .from('subnational_breakdowns')
      .select('activity_id, st_pcode, region_name')
      .not('st_pcode', 'is', null);

    if (bdError) {
      console.error('[Location Profiles API] Error fetching breakdowns:', bdError);
    }

    // Build a map of st_pcode -> Set<activity_id>
    const regionActivityMap = new Map<string, Set<string>>();

    // From activity_locations
    (locations || []).forEach((loc: any) => {
      const pcode = loc.state_region_code;
      if (!pcode) return;
      if (!regionActivityMap.has(pcode)) regionActivityMap.set(pcode, new Set());
      regionActivityMap.get(pcode)!.add(loc.activity_id);
    });

    // From subnational_breakdowns
    (breakdowns || []).forEach((bd: any) => {
      const pcode = bd.st_pcode;
      if (!pcode) return;
      if (!regionActivityMap.has(pcode)) regionActivityMap.set(pcode, new Set());
      regionActivityMap.get(pcode)!.add(bd.activity_id);
    });

    // Collect all activity IDs to fetch transaction summaries
    const allActivityIds = new Set<string>();
    regionActivityMap.forEach(ids => ids.forEach(id => allActivityIds.add(id)));

    // Fetch transaction summaries for all relevant activities
    let transactionMap = new Map<string, { commitments: number; disbursements: number }>();
    if (allActivityIds.size > 0) {
      const activityIdArray = Array.from(allActivityIds);
      // Fetch in batches of 500
      for (let i = 0; i < activityIdArray.length; i += 500) {
        const batch = activityIdArray.slice(i, i + 500);
        const { data: txns, error: txError } = await supabase
          .from('transactions')
          .select('activity_id, transaction_type, value, value_usd')
          .in('activity_id', batch);

        if (!txError && txns) {
          txns.forEach((tx: any) => {
            if (!transactionMap.has(tx.activity_id)) {
              transactionMap.set(tx.activity_id, { commitments: 0, disbursements: 0 });
            }
            const entry = transactionMap.get(tx.activity_id)!;
            const amount = parseFloat(tx.value_usd) || parseFloat(tx.value) || 0;
            if (tx.transaction_type === '2' || tx.transaction_type === 'C' || tx.transaction_type === '11') {
              entry.commitments += amount;
            } else if (tx.transaction_type === '3' || tx.transaction_type === 'D') {
              entry.disbursements += amount;
            }
          });
        }
      }
    }

    // Build region profiles
    const regions = MYANMAR_REGIONS.map(region => {
      const activityIds = regionActivityMap.get(region.st_pcode) || new Set();
      let commitments = 0;
      let disbursements = 0;

      activityIds.forEach(actId => {
        const tx = transactionMap.get(actId);
        if (tx) {
          commitments += tx.commitments;
          disbursements += tx.disbursements;
        }
      });

      return {
        name: region.name,
        type: region.type,
        st_pcode: region.st_pcode,
        flag: region.flag,
        activityCount: activityIds.size,
        commitments,
        disbursements,
      };
    });

    // Sort by activity count descending
    regions.sort((a, b) => b.activityCount - a.activityCount);

    const totalActivities = new Set<string>();
    regionActivityMap.forEach(ids => ids.forEach(id => totalActivities.add(id)));

    return NextResponse.json({
      regions,
      totalActivities: totalActivities.size,
      totalRegions: MYANMAR_REGIONS.length,
    });
  } catch (error: any) {
    console.error('[Location Profiles API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

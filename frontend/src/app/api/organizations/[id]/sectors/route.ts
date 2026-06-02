import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: orgId } = params;
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    
    
    
    
    // First, get all activities for this organization
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('id')
      .eq('reporting_org_id', orgId);
    
    if (activitiesError) {
      console.error('[AIMS] Error fetching activities:', activitiesError);
      return NextResponse.json(
        { error: 'Failed to fetch activities', details: activitiesError.message },
        { status: 500 }
      );
    }
    
    if (!activities || activities.length === 0) {
      return NextResponse.json([]);
    }
    
    const activityIds = activities.map(a => a.id);
    
    // Fetch sectors for these activities
    const { data: activitySectors, error: sectorsError } = await supabase
      .from('activity_sectors')
      .select('sector_code, sector_narrative, percentage, activity_id')
      .in('activity_id', activityIds);
    
    if (sectorsError) {
      console.error('[AIMS] Error fetching sectors:', sectorsError);
      return NextResponse.json(
        { error: 'Failed to fetch sectors', details: sectorsError.message },
        { status: 500 }
      );
    }
    
    // Aggregate sectors by sector code/name
    const sectorMap = new Map<string, { 
      sector_name: string, 
      sector_code: string, 
      activity_count: number,
      total_percentage: number,
      activity_ids: Set<string>
    }>();
    
    (activitySectors || []).forEach((sector: any) => {
      const key = sector.sector_code || sector.sector_narrative;
      const activityId = sector.activity_id;
      
      if (!sectorMap.has(key)) {
        sectorMap.set(key, {
          sector_name: sector.sector_narrative || sector.sector_code || 'Unknown',
          sector_code: sector.sector_code || '',
          activity_count: 0,
          total_percentage: 0,
          activity_ids: new Set()
        });
      }
      
      const sectorData = sectorMap.get(key)!;
      
      // Only count each activity once per sector
      if (!sectorData.activity_ids.has(activityId)) {
        sectorData.activity_ids.add(activityId);
        sectorData.activity_count += 1;
      }
      
      sectorData.total_percentage += sector.percentage || 0;
    });

    // Fallback: for activities that have NO activity-level sectors, derive a
    // value-weighted breakdown from their transaction-level sectors and merge it
    // into the same aggregation (so transaction-level-only activities aren't invisible).
    const activitiesWithSectors = new Set((activitySectors || []).map((s: any) => s.activity_id));
    const fallbackActivityIds = activityIds.filter(actId => !activitiesWithSectors.has(actId));

    if (fallbackActivityIds.length > 0) {
      const chunk = <T,>(arr: T[], size: number): T[][] => {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
      };

      // Transactions for the fallback activities (value + activity).
      const txs: any[] = [];
      for (const ids of chunk(fallbackActivityIds, 200)) {
        const { data } = await supabase
          .from('transactions')
          .select('uuid, activity_id, value, value_usd')
          .in('activity_id', ids);
        if (data) txs.push(...data);
      }

      if (txs.length > 0) {
        const txById = new Map<string, { activity_id: string; value: number }>();
        const activityTotalValue = new Map<string, number>();
        txs.forEach((t: any) => {
          const v = parseFloat(t.value_usd?.toString() || t.value?.toString() || '0') || 0;
          txById.set(t.uuid, { activity_id: t.activity_id, value: v });
          activityTotalValue.set(t.activity_id, (activityTotalValue.get(t.activity_id) || 0) + v);
        });

        // Transaction-level sector lines for those transactions (chunked).
        const txSectorLines: any[] = [];
        const txIds = txs.map((t: any) => t.uuid);
        for (const ids of chunk(txIds, 200)) {
          const { data } = await supabase
            .from('transaction_sector_lines')
            .select('transaction_id, sector_code, sector_name, percentage')
            .in('transaction_id', ids)
            .is('deleted_at', null);
          if (data) txSectorLines.push(...data);
        }

        // Per-activity, per-sector weighted value.
        const perActivity = new Map<string, Map<string, { name: string; weightedValue: number }>>();
        txSectorLines.forEach((line: any) => {
          const tx = txById.get(line.transaction_id);
          if (!tx) return;
          const pct = parseFloat(line.percentage?.toString() || '0') || 0;
          const weightedValue = tx.value * (pct / 100);
          if (!perActivity.has(tx.activity_id)) perActivity.set(tx.activity_id, new Map());
          const sectorsForAct = perActivity.get(tx.activity_id)!;
          if (!sectorsForAct.has(line.sector_code)) {
            sectorsForAct.set(line.sector_code, { name: line.sector_name || line.sector_code, weightedValue: 0 });
          }
          sectorsForAct.get(line.sector_code)!.weightedValue += weightedValue;
        });

        // Convert each fallback activity's weighted values to percentages and merge.
        perActivity.forEach((sectorsForAct, actId) => {
          const totalVal = activityTotalValue.get(actId) || 0;
          sectorsForAct.forEach((data, code) => {
            const pct = totalVal > 0 ? (data.weightedValue / totalVal) * 100 : 0;
            const key = code || data.name;
            if (!sectorMap.has(key)) {
              sectorMap.set(key, {
                sector_name: data.name,
                sector_code: code || '',
                activity_count: 0,
                total_percentage: 0,
                activity_ids: new Set(),
              });
            }
            const sd = sectorMap.get(key)!;
            if (!sd.activity_ids.has(actId)) {
              sd.activity_ids.add(actId);
              sd.activity_count += 1;
            }
            sd.total_percentage += pct;
          });
        });
      }
    }

    // Convert map to array and calculate average percentage
    const sectors = Array.from(sectorMap.entries()).map(([key, data], index) => ({
      id: key + '-' + index,
      sector_name: data.sector_name,
      sector_code: data.sector_code,
      activity_count: data.activity_count,
      percentage: data.activity_count > 0 ? data.total_percentage / data.activity_count : 0
    }));
    
    // Sort by activity count descending
    sectors.sort((a, b) => b.activity_count - a.activity_count);
    
    
    const response = NextResponse.json(sectors);
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
    
  } catch (error) {
    console.error('[AIMS] Unexpected error in GET organization sectors:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


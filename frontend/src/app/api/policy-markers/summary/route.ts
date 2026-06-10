import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not initialized' }, { status: 500 });
    }

    // Get all active policy markers
    const { data: markers, error: markersError } = await supabase
      .from('policy_markers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (markersError) {
      console.error('[PM Summary] Error fetching markers:', markersError);
      return NextResponse.json({ error: 'Failed to fetch policy markers' }, { status: 500 });
    }

    if (!markers || markers.length === 0) {
      return NextResponse.json({ markers: [], groups: {}, totalActivities: 0 });
    }

    // Get activity counts per marker
    const { data: markerCounts, error: countsError } = await supabase
      .from('activity_policy_markers')
      .select('policy_marker_id, activity_id, significance');

    if (countsError) {
      console.error('[PM Summary] Error fetching counts:', countsError);
    }

    // Count activities per marker — policy_marker_id may store uuid or integer id.
    // Also break the count down by IATI significance: 1 = Significant, 2 = Principal.
    const countMap = new Map<string, number>();
    const significantMap = new Map<string, number>();
    const principalMap = new Map<string, number>();
    (markerCounts || []).forEach((row: any) => {
      const key = String(row.policy_marker_id);
      countMap.set(key, (countMap.get(key) || 0) + 1);
      const sig = Number(row.significance);
      if (sig === 1) significantMap.set(key, (significantMap.get(key) || 0) + 1);
      else if (sig === 2) principalMap.set(key, (principalMap.get(key) || 0) + 1);
    });

    // Enrich markers with counts (try uuid first, then string id)
    const enrichedMarkers = markers.map(m => {
      const uuidKey = m.uuid;
      const idKey = String(m.id);
      const pick = (map: Map<string, number>) => map.get(uuidKey) ?? map.get(idKey) ?? 0;
      return {
        ...m,
        activityCount: pick(countMap),
        significantCount: pick(significantMap),
        principalCount: pick(principalMap),
      };
    });

    // Group by vocabulary: official OECD-DAC / IATI markers vs everything else
    const groups: Record<string, any[]> = {
      oecd_dac: [],
      other: [],
    };

    enrichedMarkers.forEach(m => {
      if (m.is_iati_standard) groups.oecd_dac.push(m);
      else groups.other.push(m);
    });

    const totalActivities = new Set(
      (markerCounts || []).map((r: any) => r.activity_id).filter(Boolean)
    ).size;

    return NextResponse.json({
      markers: enrichedMarkers,
      groups,
      totalActivities,
    });
  } catch (error: any) {
    console.error('[PM Summary] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

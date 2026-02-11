import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { SDG_GOALS } from '@/data/sdg-targets';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    // Get activity counts per SDG goal
    const { data: mappings, error: mappingsError } = await supabase
      .from('activity_sdg_mappings')
      .select('sdg_goal, activity_id');

    if (mappingsError) {
      console.error('[SDG Listing API] Error fetching SDG mappings:', mappingsError);
      return NextResponse.json(
        { error: 'Failed to fetch SDG data' },
        { status: 500 }
      );
    }

    // Count unique activities per SDG goal
    const goalCountMap = new Map<number, Set<string>>();
    (mappings || []).forEach((m: any) => {
      if (!goalCountMap.has(m.sdg_goal)) {
        goalCountMap.set(m.sdg_goal, new Set());
      }
      goalCountMap.get(m.sdg_goal)!.add(m.activity_id);
    });

    const sdgs = SDG_GOALS.map(goal => ({
      ...goal,
      activityCount: goalCountMap.has(goal.id) ? goalCountMap.get(goal.id)!.size : 0,
    }));

    return NextResponse.json({ sdgs });
  } catch (error: any) {
    console.error('[SDG Listing API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

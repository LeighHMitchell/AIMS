import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const activityId = params.id;

    console.log('[PlannedDisbursementsAPI] GET request for activityId:', activityId);
    console.log('[PlannedDisbursementsAPI] Admin client exists:', !!supabase);

    if (!supabase) {
      console.error('[PlannedDisbursementsAPI] Admin client is null!');
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    // Fetch planned disbursements for the activity
    console.log('[PlannedDisbursementsAPI] Querying planned_disbursements table...');
    const { data: disbursements, error } = await supabase
      .from('planned_disbursements')
      .select('*')
      .eq('activity_id', activityId)
      .order('period_start', { ascending: true });

    console.log('[PlannedDisbursementsAPI] Query result:', { 
      count: disbursements?.length || 0, 
      hasData: !!disbursements,
      error: error 
    });

    if (error) {
      console.error('[PlannedDisbursementsAPI] Error fetching planned disbursements:', error);
      return NextResponse.json({ error: 'Failed to fetch planned disbursements' }, { status: 500 });
    }

    console.log('[PlannedDisbursementsAPI] Returning', disbursements?.length || 0, 'disbursements');
    return NextResponse.json(disbursements || []);
  } catch (error) {
    console.error('[PlannedDisbursementsAPI] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const activityId = params.id;

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    // Fetch planned disbursements for the activity
    const { data: disbursements, error } = await supabase
      .from('planned_disbursements')
      .select('*')
      .eq('activity_id', activityId)
      .order('period_start', { ascending: true });

    if (error) {
      console.error('Error fetching planned disbursements:', error);
      return NextResponse.json({ error: 'Failed to fetch planned disbursements' }, { status: 500 });
    }

    return NextResponse.json(disbursements || []);
  } catch (error) {
    console.error('Unexpected error fetching planned disbursements:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
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

    // Fetch budgets for the activity
    const { data: budgets, error } = await supabase
      .from('activity_budgets')
      .select('*')
      .eq('activity_id', activityId)
      .order('period_start', { ascending: true });

    if (error) {
      console.error('Error fetching activity budgets:', error);
      return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 });
    }

    return NextResponse.json(budgets || []);
  } catch (error) {
    console.error('Unexpected error fetching activity budgets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
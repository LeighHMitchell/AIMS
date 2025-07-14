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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const activityId = params.id;

    console.log('[DELETE /api/activities/[id]/budgets] Starting deletion for activity:', activityId);

    if (!activityId) {
      console.error('[DELETE /api/activities/[id]/budgets] No activity ID provided');
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    // First, let's check if there are budgets to delete
    const { data: existingBudgets, error: fetchError } = await supabase
      .from('activity_budgets')
      .select('id')
      .eq('activity_id', activityId);

    if (fetchError) {
      console.error('[DELETE /api/activities/[id]/budgets] Error fetching existing budgets:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch existing budgets', details: fetchError.message }, { status: 500 });
    }

    console.log('[DELETE /api/activities/[id]/budgets] Found', existingBudgets?.length || 0, 'budgets to delete');

    // Delete all budgets for the activity
    const { data: deletedData, error: deleteError } = await supabase
      .from('activity_budgets')
      .delete()
      .eq('activity_id', activityId)
      .select(); // Add select() to return deleted rows

    if (deleteError) {
      console.error('[DELETE /api/activities/[id]/budgets] Error deleting activity budgets:', deleteError);
      return NextResponse.json({ error: 'Failed to delete budgets', details: deleteError.message }, { status: 500 });
    }

    console.log('[DELETE /api/activities/[id]/budgets] Successfully deleted', deletedData?.length || 0, 'budgets');

    return NextResponse.json({ success: true, deleted: deletedData?.length || 0 });
  } catch (error) {
    console.error('[DELETE /api/activities/[id]/budgets] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
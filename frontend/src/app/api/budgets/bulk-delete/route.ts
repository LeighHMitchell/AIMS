import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;
    
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json(
        { error: 'Budget IDs array is required' },
        { status: 400 }
      );
    }
    
    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one budget ID required' },
        { status: 400 }
      );
    }
    
    console.log(`[Budgets API] Bulk deleting ${ids.length} budgets:`, ids);
    
    // Validate all IDs are UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const invalidIds = ids.filter(id => !uuidRegex.test(id));
    
    if (invalidIds.length > 0) {
      console.error('[Budgets API] Invalid IDs in bulk delete:', invalidIds);
      return NextResponse.json(
        { error: 'One or more invalid budget IDs', invalidIds },
        { status: 400 }
      );
    }
    
    // Perform bulk deletion
    const { error, count } = await getSupabaseAdmin()
      .from('activity_budgets')
      .delete()
      .in('id', ids);
    
    if (error) {
      console.error('[Budgets API] Error bulk deleting budgets:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to delete budgets' },
        { status: 500 }
      );
    }
    
    console.log(`[Budgets API] Successfully bulk deleted ${count || ids.length} budgets`);
    return NextResponse.json({ 
      success: true,
      deletedCount: count || ids.length,
      message: `Successfully deleted ${count || ids.length} budget${(count || ids.length) === 1 ? '' : 's'}`
    });
  } catch (error) {
    console.error('[Budgets API] Unexpected error in bulk delete:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}


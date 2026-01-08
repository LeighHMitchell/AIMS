import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  try {
    const { id: activityId, tagId } = await params;

    if (!activityId || !tagId) {
      return NextResponse.json(
        { error: 'Activity ID and tag ID are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Remove the relationship
    const { error } = await supabase
      .from('activity_tags')
      .delete()
      .eq('activity_id', activityId)
      .eq('tag_id', tagId);

    if (error) {
      console.error('Error unlinking tag from activity:', error);
      return NextResponse.json(
        { error: 'Failed to unlink tag from activity', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/activities/[id]/tags/[tagId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
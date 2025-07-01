import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// DELETE /api/activities/[id]/linked/[linkId] - Remove an activity link
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; linkId: string } }
) {
  try {
    const { id: activityId, linkId } = params;
    
    console.log('[AIMS] DELETE /api/activities/[id]/linked/[linkId] - Removing link:', linkId);
    
    // Verify the link belongs to the activity (security check)
    const { data: existingLink, error: verifyError } = await getSupabaseAdmin()
      .from('related_activities')
      .select('source_activity_id, linked_activity_id')
      .eq('id', linkId)
      .single();
      
    if (verifyError || !existingLink) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }
    
    // Ensure the link is related to the specified activity
    if (existingLink.source_activity_id !== activityId && existingLink.linked_activity_id !== activityId) {
      return NextResponse.json(
        { error: 'Link does not belong to this activity' },
        { status: 403 }
      );
    }
    
    // Delete the link
    const { error } = await getSupabaseAdmin()
      .from('related_activities')
      .delete()
      .eq('id', linkId);
      
    if (error) {
      console.error('[AIMS] Error deleting related activity:', error);
      return NextResponse.json(
        { error: 'Failed to delete activity link' },
        { status: 500 }
      );
    }
    
    console.log('[AIMS] Successfully deleted link:', linkId);
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[AIMS] Unexpected error in DELETE linked activities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
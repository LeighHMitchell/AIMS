import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { iatiAnalytics } from '@/lib/analytics';

export async function POST(request: NextRequest) {
  try {
    const { meta, targetActivityId, userId } = await request.json();

    if (!meta || !targetActivityId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: meta, targetActivityId, and userId' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // First, verify the target activity exists and belongs to the user
    const { data: targetActivity, error: fetchError } = await supabase
      .from('activities')
      .select('id, title_narrative, iati_identifier, created_by')
      .eq('id', targetActivityId)
      .single();

    if (fetchError || !targetActivity) {
      return NextResponse.json(
        { error: 'Target activity not found' },
        { status: 404 }
      );
    }

    // Verify ownership (optional - could allow cross-user merge with permissions)
    if (targetActivity.created_by !== userId) {
      return NextResponse.json(
        { error: 'You do not have permission to merge with this activity' },
        { status: 403 }
      );
    }

    // Create a link between the external source and the existing activity
    // Using only existing database columns
    const linkData = {
      description_narrative: targetActivity.description_narrative ? 
        `${targetActivity.description_narrative}\n\n[External Link] Merged with IATI activity ${meta.iatiId} from ${meta.reportingOrgName || meta.reportingOrgRef}` :
        `[External Link] Merged with IATI activity ${meta.iatiId} from ${meta.reportingOrgName || meta.reportingOrgRef}`,
      last_edited_by: userId
    };

    console.log('[IATI Merge] Linking external source to activity:', targetActivityId, linkData);

    // Update the existing activity with external link information
    const { data: updatedActivity, error: updateError } = await supabase
      .from('activities')
      .update(linkData)
      .eq('id', targetActivityId)
      .select('id, title_narrative, iati_identifier')
      .single();

    if (updateError) {
      console.error('[IATI Merge] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to link external activity', details: updateError.message },
        { status: 500 }
      );
    }

    // Create an audit record for the merge operation
    await supabase
      .from('audit_log')
      .insert({
        user_id: userId,
        action: 'iati_import.option_selected',
        resource_type: 'activity',
        resource_id: targetActivityId,
        details: {
          option: 'merge',
          iatiId: meta.iatiId,
          reportingOrgRef: meta.reportingOrgRef,
          source: 'external_publisher_modal',
          externalIatiId: meta.iatiId,
          externalOrgRef: meta.reportingOrgRef,
          targetActivityTitle: targetActivity.title_narrative
        }
      });

    // Note: External activity link information is stored in the activity description
    // Future enhancement could create a dedicated external_activity_links table

    // Track analytics
    iatiAnalytics.optionSelected('merge', meta.iatiId, meta.reportingOrgRef);
    iatiAnalytics.importCompleted('merge', targetActivityId);

    console.log('[IATI Merge] Successfully linked external activity to:', targetActivityId);

    return NextResponse.json({
      ok: true,
      id: targetActivityId,
      activity: {
        id: updatedActivity.id,
        title: updatedActivity.title_narrative,
        iatiId: updatedActivity.iati_identifier,
        externalLinks: {
          iatiId: meta.iatiId,
          reportingOrgRef: meta.reportingOrgRef,
          reportingOrgName: meta.reportingOrgName
        }
      },
      message: 'External activity linked successfully. No duplicate created.'
    });

  } catch (error) {
    console.error('[IATI Merge] Unexpected error:', error);
    
    return NextResponse.json(
      { error: 'Failed to merge activities' },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
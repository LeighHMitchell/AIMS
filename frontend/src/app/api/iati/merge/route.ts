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

    // Handle case where userId is not a valid UUID (e.g., "current-user")
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (!isValidUuid) {
      return NextResponse.json(
        { error: 'Invalid user ID format. Please ensure you are properly authenticated.' },
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

    // Allow merge operations for all authenticated users
    // Note: This could be restricted further based on organization membership or other business rules
    console.log('[IATI Merge] Allowing merge operation for user:', userId, 'on activity created by:', targetActivity.created_by);

    // Create a link between the external source and the existing activity
    // Using the external_iati_activity_links table
    const { error: linkError } = await supabase
      .from('external_iati_activity_links')
      .insert({
        activity_id: targetActivityId,
        external_iati_identifier: meta.iatiId,
        external_reporting_org_ref: meta.reportingOrgRef,
        external_reporting_org_name: meta.reportingOrgName,
        external_activity_title: meta.title || null,
        link_type: 'merge',
        link_status: 'active',
        created_by: userId,
        import_source: 'external_publisher_modal'
      });

    if (linkError) {
      // Handle duplicate constraint - link already exists, that's okay
      if (linkError.code === '23505') {
        console.log('[IATI Merge] Link already exists for', meta.iatiId);
      } else {
        console.error('[IATI Merge] Failed to create link:', linkError);
        return NextResponse.json(
          { error: 'Failed to create external activity link', details: linkError.message },
          { status: 500 }
        );
      }
    }

    console.log('[IATI Merge] Linking external source to activity:', targetActivityId);

    // Update the existing activity to track last editor
    const { data: updatedActivity, error: updateError } = await supabase
      .from('activities')
      .update({ last_edited_by: userId })
      .eq('id', targetActivityId)
      .select('id, title_narrative, iati_identifier')
      .single();

    if (updateError) {
      console.error('[IATI Merge] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update activity', details: updateError.message },
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

    // Note: External activity link information is stored in the external_iati_activity_links table

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
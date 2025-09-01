import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { iatiAnalytics } from '@/lib/analytics';

export async function POST(request: NextRequest) {
  try {
    const { meta, userId } = await request.json();

    if (!meta || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: meta and userId' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Create reference activity using only existing database columns
    const activityData = {
      iati_identifier: meta.iatiId,
      title_narrative: meta.reportingOrgName || `External Activity: ${meta.iatiId}`,
      description_narrative: `This is a reference to an external IATI activity imported from ${meta.reportingOrgName}. Original reporting organisation: ${meta.reportingOrgRef}.`,
      activity_status: 'implementation', // Default status
      created_by: userId,
      last_edited_by: userId,
      publication_status: 'reference',
      submission_status: 'not_applicable'
    }

    console.log('[IATI Reference] Creating reference activity:', activityData);

    const { data: activity, error: createError } = await supabase
      .from('activities')
      .insert(activityData)
      .select('id, iati_identifier, title_narrative')
      .single();

    if (createError) {
      console.error('[IATI Reference] Create error:', createError);
      return NextResponse.json(
        { error: 'Failed to create reference activity', details: createError.message },
        { status: 500 }
      );
    }

    // Log audit trail
    await supabase
      .from('audit_log')
      .insert({
        user_id: userId,
        action: 'iati_import.option_selected',
        resource_type: 'activity',
        resource_id: activity.id,
        details: {
          option: 'reference',
          iatiId: meta.iatiId,
          reportingOrgRef: meta.reportingOrgRef,
          source: 'external_publisher_modal'
        }
      });

    // Track analytics
    iatiAnalytics.optionSelected('reference', meta.iatiId, meta.reportingOrgRef);
    iatiAnalytics.importCompleted('reference', activity.id);

    console.log('[IATI Reference] Successfully created reference activity:', activity.id);

    return NextResponse.json({
      ok: true,
      id: activity.id,
      activity: {
        id: activity.id,
        iatiId: activity.iati_identifier,
        title: activity.title_narrative
      }
    });

  } catch (error) {
    console.error('[IATI Reference] Unexpected error:', error);
    
    return NextResponse.json(
      { error: 'Failed to create reference activity' },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
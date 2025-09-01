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

    // Create forked activity as editable local draft using only existing database columns
    const activityData = {
      // Copy original metadata but create as local activity
      iati_identifier: null, // User must assign their own IATI ID before publishing
      title_narrative: `[DRAFT] ${meta.reportingOrgName || meta.iatiId}`,
      description_narrative: `Local draft forked from external IATI activity: ${meta.iatiId}. Originally reported by ${meta.reportingOrgName || meta.reportingOrgRef}.`,
      activity_status: 'planned', // Draft status
      
      // Standard new activity defaults
      created_by: userId,
      last_edited_by: userId,
      publication_status: 'draft',
      submission_status: 'not_submitted'
    };

    console.log('[IATI Fork] Creating forked activity:', activityData);

    const { data: activity, error: createError } = await supabase
      .from('activities')
      .insert(activityData)
      .select('id, title_narrative, source_origin, related_source_activity')
      .single();

    if (createError) {
      console.error('[IATI Fork] Create error:', createError);
      return NextResponse.json(
        { error: 'Failed to create forked activity', details: createError.message },
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
          option: 'fork',
          iatiId: meta.iatiId,
          reportingOrgRef: meta.reportingOrgRef,
          source: 'external_publisher_modal',
          originalActivity: meta.iatiId
        }
      });

    // Track analytics
    iatiAnalytics.optionSelected('fork', meta.iatiId, meta.reportingOrgRef);
    iatiAnalytics.importCompleted('fork', activity.id);

    console.log('[IATI Fork] Successfully created forked activity:', activity.id);

    return NextResponse.json({
      ok: true,
      id: activity.id,
      activity: {
        id: activity.id,
        title: activity.title_narrative,
        sourceOrigin: activity.source_origin,
        relatedSourceActivity: activity.related_source_activity
      }
    });

  } catch (error) {
    console.error('[IATI Fork] Unexpected error:', error);
    
    return NextResponse.json(
      { error: 'Failed to create forked activity' },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
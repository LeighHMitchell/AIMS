import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { iatiAnalytics } from '@/lib/analytics';

export async function POST(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { meta, userId } = await request.json();

    if (!meta || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: meta and userId' },
        { status: 400 }
      );
    }
    // Create reference activity using only existing database columns
    const activityData = {
      iati_identifier: meta.iatiId,
      title_narrative: meta.reportingOrgName || `External Activity: ${meta.iatiId}`,
      description_narrative: null, // External link tracked in external_iati_activity_links table
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

    // Create external activity link to track the reference source
    const { error: linkError } = await supabase
      .from('external_iati_activity_links')
      .insert({
        activity_id: activity.id,
        external_iati_identifier: meta.iatiId,
        external_reporting_org_ref: meta.reportingOrgRef,
        external_reporting_org_name: meta.reportingOrgName,
        external_activity_title: meta.title || null,
        link_type: 'reference',
        link_status: 'active',
        created_by: userId,
        import_source: 'external_publisher_modal'
      });

    if (linkError) {
      console.error('[IATI Reference] Failed to create external link:', linkError);
      // Continue despite link error - the reference activity was created successfully
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
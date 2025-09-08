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

    // Handle case where userId is not a valid UUID (e.g., "current-user")
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (!isValidUuid) {
      return NextResponse.json(
        { error: 'Invalid user ID format. Please ensure you are properly authenticated.' },
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
      activity_status: '1', // Pipeline/planned status (IATI code)
      
      // Required fields for activity creation
      default_currency: 'USD',
      default_finance_type: '110', // Standard grant
      default_aid_type: '31166', // General budget support
      default_tied_status: '5', // Untied
      hierarchy: 1, // Standalone activity
      
      // Standard new activity defaults
      created_by: userId,
      last_edited_by: userId,
      publication_status: 'draft',
      submission_status: 'not_submitted',
      
      // Additional metadata
      created_by_org_name: meta.reportingOrgName || 'External Publisher',
      created_by_org_acronym: meta.reportingOrgRef || 'EXT'
    };

    console.log('[IATI Fork] Creating forked activity:', activityData);

    const { data: activity, error: createError } = await supabase
      .from('activities')
      .insert(activityData)
      .select('id, title_narrative')
      .single();

    if (createError) {
      console.error('[IATI Fork] Create error:', createError);
      
      // Provide specific error messages for common issues
      let errorMessage = 'Failed to create forked activity';
      if (createError.message?.includes('null value')) {
        errorMessage = 'Missing required database fields. Please contact administrator.';
      } else if (createError.message?.includes('foreign key')) {
        errorMessage = 'Database relationship constraint error. Please contact administrator.';
      } else if (createError.message?.includes('unique')) {
        errorMessage = 'Duplicate activity identifier. Please try again.';
      }
      
      return NextResponse.json(
        { error: errorMessage, details: createError.message },
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
        title: activity.title_narrative
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
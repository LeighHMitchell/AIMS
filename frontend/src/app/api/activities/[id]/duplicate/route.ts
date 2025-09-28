import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    console.log('[AIMS API] POST /api/activities/[id]/duplicate - Duplicating activity:', id);
    
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 503 }
      );
    }

    // Fetch the original activity
    const { data: originalActivity, error: fetchError } = await supabase
      .from('activities')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !originalActivity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Create a new activity based on the original
    const newActivityData = {
      // Copy all fields except id and timestamps
      title_narrative: `${originalActivity.title_narrative} (Copy)`,
      description_narrative: originalActivity.description_narrative,
      description_objectives: originalActivity.description_objectives,
      description_target_groups: originalActivity.description_target_groups,
      description_other: originalActivity.description_other,
      planned_start_date: originalActivity.planned_start_date,
      planned_end_date: originalActivity.planned_end_date,
      actual_start_date: originalActivity.actual_start_date,
      actual_end_date: originalActivity.actual_end_date,
      activity_status: originalActivity.activity_status,
      collaboration_type: originalActivity.collaboration_type,
      default_currency: originalActivity.default_currency,
      default_aid_type: originalActivity.default_aid_type,
      default_finance_type: originalActivity.default_finance_type,
      default_flow_type: originalActivity.default_flow_type,
      default_tied_status: originalActivity.default_tied_status,
      activity_scope: originalActivity.activity_scope,
      language: originalActivity.language,
      recipient_countries: originalActivity.recipient_countries,
      recipient_regions: originalActivity.recipient_regions,
      custom_geographies: originalActivity.custom_geographies,
      general_info: originalActivity.general_info,
      
      // Reset publication and submission status for the copy
      publication_status: 'draft',
      submission_status: 'not_submitted',
      
      // Set new timestamps
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      // Copy user info
      created_by: originalActivity.created_by,
      last_edited_by: originalActivity.last_edited_by,
      created_by_org: originalActivity.created_by_org,
      created_by_org_name: originalActivity.created_by_org_name,
      created_by_org_acronym: originalActivity.created_by_org_acronym,
      
      // Don't copy IATI identifier - let user set their own
      iati_identifier: null,
      
      // Reset sync status
      sync_status: 'not_synced',
      last_sync_time: null,
    };

    // Insert the new activity
    const { data: newActivity, error: insertError } = await supabase
      .from('activities')
      .insert(newActivityData)
      .select('id, title_narrative')
      .single();

    if (insertError) {
      console.error('[AIMS API] Error creating duplicate activity:', insertError);
      return NextResponse.json(
        { error: 'Failed to create duplicate activity' },
        { status: 500 }
      );
    }

    console.log('[AIMS API] Successfully created duplicate activity:', newActivity.id);

    return NextResponse.json({
      success: true,
      id: newActivity.id,
      title: newActivity.title_narrative
    });

  } catch (error) {
    console.error('[AIMS API] Error in POST /api/activities/[id]/duplicate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

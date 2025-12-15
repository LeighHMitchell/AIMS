import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/data-clinic/duplicates/dismiss
 * 
 * Dismiss a duplicate pair (mark as not duplicate, linked, or merged)
 * 
 * Request body:
 *   - entity_type: 'activity' | 'organization'
 *   - entity_id_1: string (UUID)
 *   - entity_id_2: string (UUID)
 *   - action_taken: 'not_duplicate' | 'linked' | 'merged'
 *   - reason: string (optional)
 *   - user_id: string (UUID, optional)
 */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { entity_type, entity_id_1, entity_id_2, action_taken, reason, user_id } = body;

    // Validate required fields
    if (!entity_type || !entity_id_1 || !entity_id_2 || !action_taken) {
      return NextResponse.json(
        { error: 'Missing required fields: entity_type, entity_id_1, entity_id_2, action_taken' },
        { status: 400 }
      );
    }

    // Validate entity_type
    if (!['activity', 'organization'].includes(entity_type)) {
      return NextResponse.json(
        { error: 'entity_type must be "activity" or "organization"' },
        { status: 400 }
      );
    }

    // Validate action_taken
    if (!['not_duplicate', 'linked', 'merged'].includes(action_taken)) {
      return NextResponse.json(
        { error: 'action_taken must be "not_duplicate", "linked", or "merged"' },
        { status: 400 }
      );
    }

    // Ensure consistent ordering of IDs (smaller UUID first)
    const [orderedId1, orderedId2] = entity_id_1 < entity_id_2 
      ? [entity_id_1, entity_id_2] 
      : [entity_id_2, entity_id_1];

    // If action is 'linked' and entity_type is 'activity', create the activity relationship
    if (action_taken === 'linked' && entity_type === 'activity') {
      // Check if link already exists
      const { data: existing } = await supabase
        .from('activity_relationships')
        .select('id')
        .or(`and(activity_id.eq.${entity_id_1},related_activity_id.eq.${entity_id_2}),and(activity_id.eq.${entity_id_2},related_activity_id.eq.${entity_id_1})`)
        .single();

      if (!existing) {
        // Create bidirectional relationship using type "4" (Co-funded)
        const { error: linkError } = await supabase
          .from('activity_relationships')
          .insert({
            activity_id: entity_id_1,
            related_activity_id: entity_id_2,
            relationship_type: '4', // Co-funded - used for cross-org duplicates
            narrative: reason || 'Linked from Data Clinic duplicates review',
            created_by: user_id || null,
          });

        if (linkError) {
          console.error('[Data Clinic Duplicates] Error creating activity link:', linkError);
          // Don't fail the whole operation, just log it
        } else {
          console.log(`[Data Clinic Duplicates] Created activity relationship: ${entity_id_1} <-> ${entity_id_2}`);
        }
      }
    }

    // Insert dismissal record
    const { data: dismissal, error: insertError } = await supabase
      .from('duplicate_dismissals')
      .upsert({
        entity_type,
        entity_id_1: orderedId1,
        entity_id_2: orderedId2,
        action_taken,
        reason: reason || null,
        dismissed_by: user_id || null,
        dismissed_at: new Date().toISOString(),
      }, {
        onConflict: 'entity_type,entity_id_1,entity_id_2',
      })
      .select()
      .single();

    if (insertError) {
      // Handle missing table
      if (insertError.code === '42P01') {
        return NextResponse.json(
          { error: 'Duplicate detection tables not created yet. Please run the SQL migration.' },
          { status: 503 }
        );
      }
      console.error('[Data Clinic Duplicates] Error creating dismissal:', insertError);
      return NextResponse.json(
        { error: 'Failed to dismiss duplicate' },
        { status: 500 }
      );
    }

    // Optionally, delete the detected_duplicate record
    // This keeps the detected_duplicates table clean
    await supabase
      .from('detected_duplicates')
      .delete()
      .eq('entity_type', entity_type)
      .eq('entity_id_1', orderedId1)
      .eq('entity_id_2', orderedId2);

    console.log(`[Data Clinic Duplicates] Dismissed ${entity_type} pair: ${orderedId1} - ${orderedId2} (${action_taken})`);

    return NextResponse.json({
      success: true,
      dismissal,
      message: `Duplicate ${action_taken === 'not_duplicate' ? 'dismissed' : action_taken}`,
    });
  } catch (error) {
    console.error('[Data Clinic Duplicates] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}





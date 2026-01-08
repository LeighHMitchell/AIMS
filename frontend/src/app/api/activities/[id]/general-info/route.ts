import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }
    
    console.log('[AIMS API] PATCH /api/activities/[id]/general-info - Updating activity:', id);
    console.log('[AIMS API] Update data:', JSON.stringify(body, null, 2));
    
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 503 }
      );
    }

    // Fetch current activity to merge with existing general_info
    const { data: existingActivity, error: fetchError } = await supabase
      .from('activities')
      .select('general_info')
      .eq('id', id)
      .single();

    if (fetchError || !existingActivity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Merge the new general_info data with existing data
    const currentGeneralInfo = existingActivity.general_info || {};
    const updatedGeneralInfo = {
      ...currentGeneralInfo,
      ...body.general_info,
      // Ensure aidEffectiveness is properly nested
      aidEffectiveness: {
        ...currentGeneralInfo.aidEffectiveness,
        ...body.aidEffectiveness,
        ...body.general_info?.aidEffectiveness
      },
      // Include metadata
      metadata: {
        ...currentGeneralInfo.metadata,
        ...body.metadata,
        ...body.general_info?.metadata,
        lastUpdated: new Date().toISOString()
      }
    };

    // Update the activity with the merged general_info
    const { data: updatedActivity, error: updateError } = await supabase
      .from('activities')
      .update({ 
        general_info: updatedGeneralInfo,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[AIMS API] Error updating general_info:', updateError);
      return NextResponse.json(
        { error: 'Failed to update general information' },
        { status: 500 }
      );
    }

    console.log('[AIMS API] General info updated successfully for activity:', id);
    
    return NextResponse.json({
      success: true,
      general_info: updatedActivity.general_info
    });

  } catch (error) {
    console.error('[AIMS API] Error in PATCH /api/activities/[id]/general-info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

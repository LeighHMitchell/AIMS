import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: activityId } = params;
    const { tag_id } = await request.json();

    if (!activityId || !tag_id) {
      return NextResponse.json(
        { error: 'Activity ID and tag ID are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Check if the relationship already exists
    const { data: existing } = await supabase
      .from('activity_tags')
      .select('*')
      .eq('activity_id', activityId)
      .eq('tag_id', tag_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { message: 'Tag already linked to activity' },
        { status: 200 }
      );
    }

    // Create the relationship
    const { data, error } = await supabase
      .from('activity_tags')
      .insert([{
        activity_id: activityId,
        tag_id: tag_id
      }])
      .select()
      .single();

    if (error) {
      console.error('Error linking tag to activity:', error);
      return NextResponse.json(
        { error: 'Failed to link tag to activity', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in POST /api/activities/[id]/tags:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
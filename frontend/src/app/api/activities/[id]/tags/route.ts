import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: activityId } = params;

    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Fetch all tags for this activity with full IATI metadata
    const { data, error } = await supabase
      .from('activity_tags')
      .select(`
        tag_id,
        tags (
          id, 
          name, 
          vocabulary, 
          code, 
          vocabulary_uri, 
          created_by, 
          created_at,
          updated_at
        )
      `)
      .eq('activity_id', activityId);

    if (error) {
      console.error('Error fetching activity tags:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activity tags', details: error.message },
        { status: 500 }
      );
    }

    // Flatten the structure for easier consumption (filter out null tags in case of orphaned relationships)
    const tags = data?.filter(t => t.tags !== null).map(t => ({
      id: t.tags.id,
      name: t.tags.name,
      vocabulary: t.tags.vocabulary,
      code: t.tags.code,
      vocabulary_uri: t.tags.vocabulary_uri,
      created_by: t.tags.created_by,
      created_at: t.tags.created_at,
      updated_at: t.tags.updated_at
    })) || [];

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error in GET /api/activities/[id]/tags:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
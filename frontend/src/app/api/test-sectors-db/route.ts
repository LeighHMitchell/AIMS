import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { activityId } = body;

    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Query current sectors for this activity
    const { data: sectors, error: sectorsError } = await supabase
      .from('activity_sectors')
      .select('*')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: false });

    if (sectorsError) {
      console.error('Error querying sectors:', sectorsError);
      return NextResponse.json(
        { error: `Database error: ${sectorsError.message}` },
        { status: 500 }
      );
    }

    // Also check if the activity exists
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id, title_narrative, updated_at')
      .eq('id', activityId)
      .single();

    if (activityError) {
      console.error('Error querying activity:', activityError);
      return NextResponse.json(
        { error: `Activity not found: ${activityError.message}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      activityId,
      activity: {
        id: activity.id,
        title: activity.title_narrative,
        updatedAt: activity.updated_at
      },
      sectors: sectors || [],
      sectorCount: sectors?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test DB query error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
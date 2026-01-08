import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET /api/activities/[id]/humanitarian - Fetch humanitarian data for an activity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id: activityId } = await params;

    // Get humanitarian flag from activities table
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('humanitarian')
      .eq('id', activityId)
      .single();

    if (activityError) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Get humanitarian scopes with narratives
    const { data: scopes, error: scopesError } = await supabase
      .from('activity_humanitarian_scope')
      .select(`
        id,
        activity_id,
        scope_type,
        vocabulary,
        code,
        vocabulary_uri,
        narratives,
        created_at,
        updated_at
      `)
      .eq('activity_id', activityId)
      .order('created_at', { ascending: true });

    if (scopesError) {
      console.error('Error fetching humanitarian scopes:', scopesError);
      return NextResponse.json(
        { error: 'Failed to fetch humanitarian scopes' },
        { status: 500 }
      );
    }

    // Transform data to match frontend interface and normalize narratives to an array
    const humanitarianScopes = (scopes || []).map((scope: any) => {
      let narratives: any = scope.narratives;
      if (typeof narratives === 'string') {
        try {
          narratives = JSON.parse(narratives);
        } catch (e) {
          narratives = [];
        }
      }
      if (!Array.isArray(narratives)) {
        narratives = [];
      }
      return {
        ...scope,
        type: scope.scope_type, // Map scope_type to type for frontend compatibility
        narratives
      };
    });

    return NextResponse.json({
      humanitarian: activity.humanitarian || false,
      humanitarian_scopes: humanitarianScopes
    });
  } catch (error) {
    console.error('Error in GET /api/activities/[id]/humanitarian:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/activities/[id]/humanitarian - Update humanitarian data for an activity
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id: activityId } = await params;
    const body = await request.json();

    const { humanitarian, humanitarian_scopes } = body;

    // Update humanitarian flag on activities table
    const { error: updateError } = await supabase
      .from('activities')
      .update({ 
        humanitarian: humanitarian || false,
        updated_at: new Date().toISOString()
      })
      .eq('id', activityId);

    if (updateError) {
      console.error('Error updating humanitarian flag:', updateError);
      return NextResponse.json(
        { error: 'Failed to update humanitarian flag' },
        { status: 500 }
      );
    }

    // Delete existing scopes
    const { error: deleteError } = await supabase
      .from('activity_humanitarian_scope')
      .delete()
      .eq('activity_id', activityId);

    if (deleteError) {
      console.error('Error deleting existing scopes:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete existing scopes' },
        { status: 500 }
      );
    }

    // Insert new scopes
    if (humanitarian_scopes && humanitarian_scopes.length > 0) {
      const scopesToInsert = humanitarian_scopes.map((scope: any) => ({
        activity_id: activityId,
        scope_type: scope.type || '1',
        vocabulary: scope.vocabulary || '1-2',
        code: scope.code,
        vocabulary_uri: scope.vocabulary_uri || null,
        narratives: scope.narratives ? JSON.stringify(scope.narratives) : null
      }));

      const { error: scopeError } = await supabase
        .from('activity_humanitarian_scope')
        .insert(scopesToInsert);

      if (scopeError) {
        console.error('Error inserting humanitarian scopes:', scopeError);
        return NextResponse.json(
          { error: 'Failed to insert humanitarian scopes' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/activities/[id]/humanitarian:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


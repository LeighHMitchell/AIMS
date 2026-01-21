import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/activities/[id]/vote
 * Returns the activity's vote counts and the current user's vote (if authenticated)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { id: activityId } = await params
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    // Get userId from query params (for checking user's vote)
    const userId = request.nextUrl.searchParams.get('userId')

    // Get activity vote counts
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('upvote_count, downvote_count, vote_score')
      .eq('id', activityId)
      .single()

    if (activityError) {
      console.error('[Vote API] Error fetching activity:', activityError)
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    // Get user's vote if userId provided
    let userVote = 0
    if (userId) {
      const { data: voteData } = await supabase
        .from('activity_votes')
        .select('vote')
        .eq('activity_id', activityId)
        .eq('user_id', userId)
        .single()

      if (voteData) {
        userVote = voteData.vote
      }
    }

    return NextResponse.json({
      success: true,
      upvoteCount: activity.upvote_count || 0,
      downvoteCount: activity.downvote_count || 0,
      score: activity.vote_score || 0,
      userVote
    })

  } catch (err) {
    console.error('[Vote API] Error:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST /api/activities/[id]/vote
 * Create or update a user's vote
 * Body: { userId: string, vote: -1 | 0 | 1 }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { id: activityId } = await params
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const body = await request.json()
    const { userId, vote } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (vote === undefined || ![-1, 0, 1].includes(vote)) {
      return NextResponse.json({ error: 'Invalid vote value. Must be -1, 0, or 1' }, { status: 400 })
    }

    // Check if user already has a vote
    const { data: existingVote } = await supabase
      .from('activity_votes')
      .select('id, vote')
      .eq('activity_id', activityId)
      .eq('user_id', userId)
      .single()

    let result

    if (vote === 0) {
      // Remove vote if setting to 0
      if (existingVote) {
        const { error: deleteError } = await supabase
          .from('activity_votes')
          .delete()
          .eq('id', existingVote.id)

        if (deleteError) {
          console.error('[Vote API] Error deleting vote:', deleteError)
          return NextResponse.json({ error: 'Failed to remove vote' }, { status: 500 })
        }
      }
      result = { vote: 0 }
    } else if (existingVote) {
      // Update existing vote
      const { data, error: updateError } = await supabase
        .from('activity_votes')
        .update({ vote, updated_at: new Date().toISOString() })
        .eq('id', existingVote.id)
        .select('vote')
        .single()

      if (updateError) {
        console.error('[Vote API] Error updating vote:', updateError)
        return NextResponse.json({ error: 'Failed to update vote' }, { status: 500 })
      }
      result = data
    } else {
      // Insert new vote
      const { data, error: insertError } = await supabase
        .from('activity_votes')
        .insert({
          activity_id: activityId,
          user_id: userId,
          vote
        })
        .select('vote')
        .single()

      if (insertError) {
        console.error('[Vote API] Error inserting vote:', insertError)
        return NextResponse.json({ error: 'Failed to create vote' }, { status: 500 })
      }
      result = data
    }

    // Get updated vote counts
    const { data: activity } = await supabase
      .from('activities')
      .select('upvote_count, downvote_count, vote_score')
      .eq('id', activityId)
      .single()

    return NextResponse.json({
      success: true,
      userVote: result?.vote ?? 0,
      upvoteCount: activity?.upvote_count || 0,
      downvoteCount: activity?.downvote_count || 0,
      score: activity?.vote_score || 0
    })

  } catch (err) {
    console.error('[Vote API] Error:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
}

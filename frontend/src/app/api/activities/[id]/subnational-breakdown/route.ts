import { requireAuth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    const activityId = id

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 })
    }

    // Fetch subnational breakdown data for the activity
    const { data: breakdowns, error } = await supabase
      .from('subnational_breakdowns')
      .select('*')
      .eq('activity_id', activityId)
      .order('region_name')

    if (error) {
      console.error('Error fetching subnational breakdowns:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json(
        { error: 'Failed to fetch subnational breakdown data', details: error.message },
        { status: 500 }
      )
    }

    console.log('[DEBUG] Subnational GET for activity:', activityId, {
      count: breakdowns?.length || 0,
      data: breakdowns
    });

    return NextResponse.json(breakdowns || [])
  } catch (error) {
    console.error('Error in GET /api/activities/[id]/subnational-breakdown:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    const activityId = id

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 })
    }

    // Parse request body
    const body = await request.json()
    
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Request body must be an array' }, { status: 400 })
    }

    // Validate the data
    for (const item of body) {
      if (!item.region_name || typeof item.percentage !== 'number' || typeof item.is_nationwide !== 'boolean') {
        return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
      }
      
      if (item.percentage < 0 || item.percentage > 100) {
        return NextResponse.json({ error: 'Percentage must be between 0 and 100' }, { status: 400 })
      }
    }

    // Verify activity exists
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id')
      .eq('id', activityId)
      .single()

    if (activityError) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    // Begin transaction - delete existing breakdowns and insert new ones
    const { error: deleteError } = await supabase
      .from('subnational_breakdowns')
      .delete()
      .eq('activity_id', activityId)

    if (deleteError) {
      console.error('Error deleting existing breakdowns:', deleteError)
      return NextResponse.json(
        { error: 'Failed to update subnational breakdown data' },
        { status: 500 }
      )
    }

    // Insert new breakdowns if any
    console.log('[DEBUG] Subnational POST for activity:', activityId, {
      payloadCount: body.length,
      payload: body
    });
    
    if (body.length > 0) {
      const breakdownsToInsert = body.map(item => ({
        activity_id: activityId,
        region_name: item.region_name,
        percentage: item.percentage,
        is_nationwide: item.is_nationwide
      }))

      const { error: insertError } = await supabase
        .from('subnational_breakdowns')
        .insert(breakdownsToInsert)

      if (insertError) {
        console.error('Error inserting new breakdowns:', insertError)
        console.error('Insert error details:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          payload: breakdownsToInsert
        })
        return NextResponse.json(
          { error: 'Failed to save subnational breakdown data', details: insertError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/activities/[id]/subnational-breakdown:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    const activityId = id

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 })
    }

    // Verify activity exists
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id')
      .eq('id', activityId)
      .single()

    if (activityError) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    // Delete all subnational breakdowns for this activity
    const { error } = await supabase
      .from('subnational_breakdowns')
      .delete()
      .eq('activity_id', activityId)

    if (error) {
      console.error('Error deleting subnational breakdowns:', error)
      return NextResponse.json(
        { error: 'Failed to delete subnational breakdown data' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/activities/[id]/subnational-breakdown:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
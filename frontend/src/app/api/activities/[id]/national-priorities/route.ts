import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  ActivityNationalPriorityRow,
  NationalPriorityRow,
  nationalPriorityFromRow,
  buildPriorityPath,
} from '@/types/national-priorities';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/activities/[id]/national-priorities
 * Get all national priority allocations for an activity
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id: activityId } = await params;
    // Check if activity exists
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id')
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Get activity's national priorities with joined priority data
    const { data: allocations, error } = await supabase
      .from('activity_national_priorities')
      .select(`
        *,
        national_priorities (*)
      `)
      .eq('activity_id', activityId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Activity National Priorities API] Error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Get all priorities for building paths
    const { data: allPriorities } = await supabase
      .from('national_priorities')
      .select('*');

    const allPrioritiesFormatted = (allPriorities as NationalPriorityRow[] || [])
      .map(nationalPriorityFromRow);

    // Format response
    const formattedAllocations = (allocations || []).map((alloc: any) => {
      const priority = alloc.national_priorities
        ? nationalPriorityFromRow(alloc.national_priorities as NationalPriorityRow)
        : null;

      if (priority) {
        priority.fullPath = buildPriorityPath(priority.id, allPrioritiesFormatted);
      }

      return {
        id: alloc.id,
        activityId: alloc.activity_id,
        nationalPriorityId: alloc.national_priority_id,
        percentage: parseFloat(alloc.percentage) || 0,
        notes: alloc.notes,
        createdAt: alloc.created_at,
        updatedAt: alloc.updated_at,
        createdBy: alloc.created_by,
        nationalPriority: priority,
      };
    });

    // Calculate total percentage
    const totalPercentage = formattedAllocations.reduce(
      (sum, a) => sum + a.percentage,
      0
    );

    return NextResponse.json({
      success: true,
      data: formattedAllocations,
      totalPercentage,
      count: formattedAllocations.length,
    });
  } catch (error) {
    console.error('[Activity National Priorities API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/activities/[id]/national-priorities
 * Add or update national priority allocation for an activity
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id: activityId } = await params;
    const body = await request.json();

    const { nationalPriorityId, percentage, notes } = body;

    // Validate required fields
    if (!nationalPriorityId) {
      return NextResponse.json(
        { success: false, error: 'National priority ID is required' },
        { status: 400 }
      );
    }

    if (percentage === undefined || percentage === null) {
      return NextResponse.json(
        { success: false, error: 'Percentage is required' },
        { status: 400 }
      );
    }

    const parsedPercentage = parseFloat(percentage);
    if (isNaN(parsedPercentage) || parsedPercentage < 0 || parsedPercentage > 100) {
      return NextResponse.json(
        { success: false, error: 'Percentage must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Check if activity exists
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id')
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Check if priority exists
    const { data: priority, error: priorityError } = await supabase
      .from('national_priorities')
      .select('id, is_active')
      .eq('id', nationalPriorityId)
      .single();

    if (priorityError || !priority) {
      return NextResponse.json(
        { success: false, error: 'National priority not found' },
        { status: 404 }
      );
    }

    if (!priority.is_active) {
      return NextResponse.json(
        { success: false, error: 'Cannot allocate to inactive priority' },
        { status: 400 }
      );
    }

    // Check if allocation already exists (upsert)
    const { data: existing } = await supabase
      .from('activity_national_priorities')
      .select('id')
      .eq('activity_id', activityId)
      .eq('national_priority_id', nationalPriorityId)
      .single();

    let result;
    if (existing) {
      // Update existing allocation
      const { data, error } = await supabase
        .from('activity_national_priorities')
        .update({
          percentage: parsedPercentage,
          notes: notes || null,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new allocation
      const { data, error } = await supabase
        .from('activity_national_priorities')
        .insert({
          activity_id: activityId,
          national_priority_id: nationalPriorityId,
          percentage: parsedPercentage,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json(
            { success: false, error: 'This priority is already allocated to this activity' },
            { status: 400 }
          );
        }
        throw error;
      }
      result = data;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        activityId: result.activity_id,
        nationalPriorityId: result.national_priority_id,
        percentage: parseFloat(result.percentage),
        notes: result.notes,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      },
    }, { status: existing ? 200 : 201 });
  } catch (error: any) {
    console.error('[Activity National Priorities API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/activities/[id]/national-priorities
 * Remove a national priority allocation from an activity
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id: activityId } = await params;
    // Get allocationId from query params or body
    const searchParams = request.nextUrl.searchParams;
    const allocationId = searchParams.get('allocationId');
    const nationalPriorityId = searchParams.get('nationalPriorityId');

    if (!allocationId && !nationalPriorityId) {
      return NextResponse.json(
        { success: false, error: 'Either allocationId or nationalPriorityId is required' },
        { status: 400 }
      );
    }

    // Build delete query
    let query = supabase
      .from('activity_national_priorities')
      .delete()
      .eq('activity_id', activityId);

    if (allocationId) {
      query = query.eq('id', allocationId);
    } else if (nationalPriorityId) {
      query = query.eq('national_priority_id', nationalPriorityId);
    }

    const { error, count } = await query;

    if (error) {
      console.error('[Activity National Priorities API] Delete error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Priority allocation removed successfully',
      deletedCount: count || 1,
    });
  } catch (error) {
    console.error('[Activity National Priorities API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/activities/[id]/national-priorities
 * Bulk update all national priority allocations for an activity
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id: activityId } = await params;
    const body = await request.json();

    const { allocations } = body;

    if (!Array.isArray(allocations)) {
      return NextResponse.json(
        { success: false, error: 'Allocations must be an array' },
        { status: 400 }
      );
    }

    // Validate total percentage
    const totalPercentage = allocations.reduce(
      (sum, a) => sum + (parseFloat(a.percentage) || 0),
      0
    );

    if (totalPercentage > 100) {
      return NextResponse.json(
        { success: false, error: 'Total percentage cannot exceed 100%' },
        { status: 400 }
      );
    }

    // Validate each allocation
    for (const alloc of allocations) {
      if (!alloc.nationalPriorityId) {
        return NextResponse.json(
          { success: false, error: 'Each allocation must have a nationalPriorityId' },
          { status: 400 }
        );
      }
      const pct = parseFloat(alloc.percentage);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        return NextResponse.json(
          { success: false, error: 'Each percentage must be between 0 and 100' },
          { status: 400 }
        );
      }
    }

    // Delete existing allocations
    await supabase
      .from('activity_national_priorities')
      .delete()
      .eq('activity_id', activityId);

    // Insert new allocations
    if (allocations.length > 0) {
      const insertData = allocations.map((a) => ({
        activity_id: activityId,
        national_priority_id: a.nationalPriorityId,
        percentage: parseFloat(a.percentage),
        notes: a.notes || null,
      }));

      const { error: insertError } = await supabase
        .from('activity_national_priorities')
        .insert(insertData);

      if (insertError) {
        console.error('[Activity National Priorities API] Bulk insert error:', insertError);
        return NextResponse.json(
          { success: false, error: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Priority allocations updated successfully',
      count: allocations.length,
      totalPercentage,
    });
  } catch (error) {
    console.error('[Activity National Priorities API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}


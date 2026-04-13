import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAuthOrVisitor } from '@/lib/auth';
import { NationalPlanRow, nationalPlanFromRow } from '@/types/national-priorities';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/national-plans/[id]
 * Get a single national plan by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { supabase, response: authResponse } = await requireAuthOrVisitor(request);
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not available' }, { status: 500 });
    }

    const { data: row, error } = await supabase
      .from('national_plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'National plan not found' },
          { status: 404 }
        );
      }
      console.error('[National Plan API] Error fetching plan:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Get priority count for this plan
    const { count: priorityCount } = await supabase
      .from('national_priorities')
      .select('*', { count: 'exact', head: true })
      .eq('plan_id', id);

    const plan = nationalPlanFromRow(row as NationalPlanRow);

    return NextResponse.json({
      success: true,
      data: plan,
      priorityCount: priorityCount || 0,
    });

  } catch (error) {
    console.error('[National Plan API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/national-plans/[id]
 * Update a national plan
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not available' }, { status: 500 });
    }
    const body = await request.json();

    const { name, acronym, nameLocal, description, planType, level1Label, level2Label, level3Label, isPrimary, startDate, endDate, isActive, displayOrder } = body;

    // Check existence
    const { data: existing, error: existingError } = await supabase
      .from('national_plans')
      .select('id')
      .eq('id', id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { success: false, error: 'National plan not found' },
        { status: 404 }
      );
    }

    const updates: Partial<NationalPlanRow> = {};

    if (name !== undefined) {
      if (!name?.trim()) {
        return NextResponse.json(
          { success: false, error: 'Name cannot be empty' },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }
    if (acronym !== undefined) updates.acronym = acronym?.trim() || null;
    if (nameLocal !== undefined) updates.name_local = nameLocal?.trim() || null;
    if (description !== undefined) updates.description = description?.trim() || null;
    if (planType !== undefined) updates.plan_type = planType;
    if (level1Label !== undefined) updates.level1_label = level1Label?.trim() || 'Goal';
    if (level2Label !== undefined) updates.level2_label = level2Label?.trim() || 'Objective';
    if (level3Label !== undefined) updates.level3_label = level3Label?.trim() || 'Action';
    if (isPrimary !== undefined) {
      updates.is_primary = isPrimary;
      // If setting as primary, unset all others first
      if (isPrimary) {
        await supabase.from('national_plans').update({ is_primary: false }).neq('id', id);
      }
    }
    if (startDate !== undefined) updates.start_date = startDate || null;
    if (endDate !== undefined) updates.end_date = endDate || null;
    if (isActive !== undefined) updates.is_active = isActive;
    if (displayOrder !== undefined) updates.display_order = displayOrder;

    const { data: updated, error: updateError } = await supabase
      .from('national_plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[National Plan API] Update error:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    const plan = nationalPlanFromRow(updated as NationalPlanRow);

    return NextResponse.json({
      success: true,
      data: plan,
    });

  } catch (error) {
    console.error('[National Plan API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/national-plans/[id]
 * Delete a national plan (cascades to its priorities and their activity allocations)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not available' }, { status: 500 });
    }

    // Check existence and get info
    const { data: existing, error: existingError } = await supabase
      .from('national_plans')
      .select('id, name')
      .eq('id', id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { success: false, error: 'National plan not found' },
        { status: 404 }
      );
    }

    // Check for priorities and linked activities
    const { count: priorityCount } = await supabase
      .from('national_priorities')
      .select('*', { count: 'exact', head: true })
      .eq('plan_id', id);

    const forceDelete = request.nextUrl.searchParams.get('force') === 'true';

    if (!forceDelete && priorityCount && priorityCount > 0) {
      // Count activity allocations linked through this plan's priorities
      const { data: priorityIds } = await supabase
        .from('national_priorities')
        .select('id')
        .eq('plan_id', id);

      let activitiesCount = 0;
      if (priorityIds && priorityIds.length > 0) {
        const ids = priorityIds.map((p: { id: string }) => p.id);
        const { count } = await supabase
          .from('activity_national_priorities')
          .select('*', { count: 'exact', head: true })
          .in('national_priority_id', ids);
        activitiesCount = count || 0;
      }

      return NextResponse.json({
        success: false,
        error: 'This plan has priorities and/or linked activities. Use force=true to delete anyway.',
        priorityCount: priorityCount || 0,
        activitiesCount,
        requiresConfirmation: true,
      }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('national_plans')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[National Plan API] Delete error:', deleteError);
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Plan "${existing.name}" deleted successfully`,
      deletedId: id,
    });

  } catch (error) {
    console.error('[National Plan API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

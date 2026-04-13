import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAuthOrVisitor } from '@/lib/auth';
import { NationalPlanRow, nationalPlanFromRow } from '@/types/national-priorities';

/**
 * GET /api/national-plans
 * List all national plans/strategies
 */
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuthOrVisitor(request);
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not available' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let query = supabase
      .from('national_plans')
      .select('*')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error('[National Plans API] Error fetching plans:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const plans = (rows as NationalPlanRow[]).map(nationalPlanFromRow);

    return NextResponse.json({
      success: true,
      data: plans,
      count: plans.length,
    });

  } catch (error) {
    console.error('[National Plans API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/national-plans
 * Create a new national plan/strategy
 */
export async function POST(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not available' }, { status: 500 });
    }

    const body = await request.json();
    const { name, acronym, nameLocal, description, planType = 'national', level1Label = 'Goal', level2Label = 'Objective', level3Label = 'Action', isPrimary = false, startDate, endDate, isActive = true } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const validTypes = ['national', 'sectoral', 'thematic'];
    if (!validTypes.includes(planType)) {
      return NextResponse.json(
        { success: false, error: 'Plan type must be national, sectoral, or thematic' },
        { status: 400 }
      );
    }

    // Get next display order
    const { data: maxOrder } = await supabase
      .from('national_plans')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const displayOrder = (maxOrder?.display_order || 0) + 1;

    // If setting as primary, unset all others first
    if (isPrimary) {
      await supabase.from('national_plans').update({ is_primary: false }).eq('is_primary', true);
    }

    const { data: newPlan, error: insertError } = await supabase
      .from('national_plans')
      .insert({
        name: name.trim(),
        acronym: acronym?.trim() || null,
        name_local: nameLocal?.trim() || null,
        description: description?.trim() || null,
        plan_type: planType,
        level1_label: level1Label?.trim() || 'Goal',
        level2_label: level2Label?.trim() || 'Objective',
        level3_label: level3Label?.trim() || 'Action',
        is_primary: isPrimary,
        start_date: startDate || null,
        end_date: endDate || null,
        is_active: isActive,
        display_order: displayOrder,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[National Plans API] Insert error:', insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    const plan = nationalPlanFromRow(newPlan as NationalPlanRow);

    return NextResponse.json({
      success: true,
      data: plan,
    }, { status: 201 });

  } catch (error) {
    console.error('[National Plans API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

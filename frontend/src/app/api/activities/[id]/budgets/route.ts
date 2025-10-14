import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const activityId = params.id;

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    // Fetch budgets for the activity
    const { data: budgets, error } = await supabase
      .from('activity_budgets')
      .select('*')
      .eq('activity_id', activityId)
      .order('period_start', { ascending: true });

    if (error) {
      console.error('Error fetching activity budgets:', error);
      return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 });
    }

    console.log(`[Budgets API] Found ${budgets?.length || 0} budgets for activity ${activityId}:`, budgets);
    return NextResponse.json(budgets || []);
  } catch (error) {
    console.error('Unexpected error fetching activity budgets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const activityId = params.id;

    console.log('[DELETE /api/activities/[id]/budgets] Starting deletion for activity:', activityId);

    if (!activityId) {
      console.error('[DELETE /api/activities/[id]/budgets] No activity ID provided');
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    // First, let's check if there are budgets to delete
    const { data: existingBudgets, error: fetchError } = await supabase
      .from('activity_budgets')
      .select('id')
      .eq('activity_id', activityId);

    if (fetchError) {
      console.error('[DELETE /api/activities/[id]/budgets] Error fetching existing budgets:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch existing budgets', details: fetchError.message }, { status: 500 });
    }

    console.log('[DELETE /api/activities/[id]/budgets] Found', existingBudgets?.length || 0, 'budgets to delete');

    // Delete all budgets for the activity
    const { data: deletedData, error: deleteError } = await supabase
      .from('activity_budgets')
      .delete()
      .eq('activity_id', activityId)
      .select(); // Add select() to return deleted rows

    if (deleteError) {
      console.error('[DELETE /api/activities/[id]/budgets] Error deleting activity budgets:', deleteError);
      return NextResponse.json({ error: 'Failed to delete budgets', details: deleteError.message }, { status: 500 });
    }

    console.log('[DELETE /api/activities/[id]/budgets] Successfully deleted', deletedData?.length || 0, 'budgets');

    return NextResponse.json({ success: true, deleted: deletedData?.length || 0 });
  } catch (error) {
    console.error('[DELETE /api/activities/[id]/budgets] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const activityId = params.id;
    const body = await request.json();

    console.log('[POST /api/activities/[id]/budgets] Creating budget for activity:', activityId, body);

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    // Validate required fields (using !== undefined for value to allow 0)
    if (!body.type || !body.status || !body.period_start || !body.period_end || body.value === undefined || body.value === null || !body.currency || !body.value_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate IATI codes
    if (![1, 2].includes(Number(body.type))) {
      return NextResponse.json({ error: 'Invalid budget type (must be 1 or 2)' }, { status: 400 });
    }

    if (![1, 2].includes(Number(body.status))) {
      return NextResponse.json({ error: 'Invalid budget status (must be 1 or 2)' }, { status: 400 });
    }

    // Validate period dates
    if (new Date(body.period_start) >= new Date(body.period_end)) {
      return NextResponse.json({ error: 'Period start must be before period end' }, { status: 400 });
    }

    // Calculate USD value
    let usdValue = null;
    if (body.currency !== 'USD') {
      try {
        const result = await fixedCurrencyConverter.convertToUSD(
          body.value,
          body.currency,
          new Date(body.value_date)
        );
        usdValue = result.usd_amount;
      } catch (error) {
        console.error('Error converting to USD:', error);
        // Continue without USD value rather than failing
      }
    } else {
      usdValue = body.value;
    }

    const budgetData = {
      activity_id: activityId,
      type: Number(body.type),
      status: Number(body.status),
      period_start: body.period_start,
      period_end: body.period_end,
      value: Number(body.value),
      currency: body.currency,
      value_date: body.value_date,
      usd_value: usdValue,
      budget_lines: body.budget_lines || []
    };

    const { data: budget, error } = await supabase
      .from('activity_budgets')
      .insert(budgetData)
      .select()
      .single();

    if (error) {
      console.error('[POST /api/activities/[id]/budgets] Error creating budget:', error);
      return NextResponse.json({ error: 'Failed to create budget', details: error.message }, { status: 500 });
    }

    console.log('[POST /api/activities/[id]/budgets] Successfully created budget:', budget);
    return NextResponse.json(budget);
  } catch (error) {
    console.error('[POST /api/activities/[id]/budgets] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const activityId = params.id;
    const body = await request.json();

    console.log('[PUT /api/activities/[id]/budgets] Updating budget:', body);

    if (!activityId || !body.id) {
      return NextResponse.json({ error: 'Activity ID and Budget ID are required' }, { status: 400 });
    }

    // Validate IATI codes if provided
    if (body.type && ![1, 2].includes(Number(body.type))) {
      return NextResponse.json({ error: 'Invalid budget type (must be 1 or 2)' }, { status: 400 });
    }

    if (body.status && ![1, 2].includes(Number(body.status))) {
      return NextResponse.json({ error: 'Invalid budget status (must be 1 or 2)' }, { status: 400 });
    }

    // Validate period dates if both provided
    if (body.period_start && body.period_end) {
      if (new Date(body.period_start) >= new Date(body.period_end)) {
        return NextResponse.json({ error: 'Period start must be before period end' }, { status: 400 });
      }
    }

    // Calculate USD value if currency/value/value_date changed
    let usdValue = body.usd_value;
    if (body.value && body.currency && body.value_date) {
      if (body.currency !== 'USD') {
        try {
          const result = await fixedCurrencyConverter.convertToUSD(
            body.value,
            body.currency,
            new Date(body.value_date)
          );
          usdValue = result.usd_amount;
        } catch (error) {
          console.error('Error converting to USD:', error);
        }
      } else {
        usdValue = body.value;
      }
    }

    const updateData: any = {};
    if (body.type !== undefined) updateData.type = Number(body.type);
    if (body.status !== undefined) updateData.status = Number(body.status);
    if (body.period_start) updateData.period_start = body.period_start;
    if (body.period_end) updateData.period_end = body.period_end;
    if (body.value !== undefined) updateData.value = Number(body.value);
    if (body.currency) updateData.currency = body.currency;
    if (body.value_date) updateData.value_date = body.value_date;
    if (usdValue !== undefined) updateData.usd_value = usdValue;
    if (body.budget_lines !== undefined) updateData.budget_lines = body.budget_lines;

    const { data: budget, error } = await supabase
      .from('activity_budgets')
      .update(updateData)
      .eq('id', body.id)
      .eq('activity_id', activityId)
      .select()
      .single();

    if (error) {
      console.error('[PUT /api/activities/[id]/budgets] Error updating budget:', error);
      return NextResponse.json({ error: 'Failed to update budget', details: error.message }, { status: 500 });
    }

    console.log('[PUT /api/activities/[id]/budgets] Successfully updated budget:', budget);
    return NextResponse.json(budget);
  } catch (error) {
    console.error('[PUT /api/activities/[id]/budgets] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
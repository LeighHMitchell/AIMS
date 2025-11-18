import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const missingFields = searchParams.get('missing_fields') === 'true';

  try {
    // Fetch all budgets with activity information
    const { data: budgets, error } = await supabase
      .from('activity_budgets')
      .select(`
        id,
        activity_id,
        type,
        status,
        period_start,
        period_end,
        value,
        currency,
        value_date,
        usd_value,
        activities:activity_id (
          title_narrative,
          iati_identifier
        )
      `)
      .order('period_start', { ascending: false });

    if (error) throw error;

    if (!missingFields) {
      const formattedBudgets = (budgets || []).map(budget => ({
        ...budget,
        activityTitle: budget.activities?.title_narrative || 'Untitled Activity',
        value_usd: budget.usd_value
      }));
      return NextResponse.json({ budgets: formattedBudgets });
    }

    // Calculate data gaps
    const dataGaps = [];
    let missingType = 0;
    let missingStatus = 0;
    let missingPeriodStart = 0;
    let missingPeriodEnd = 0;
    let missingValue = 0;
    let missingCurrency = 0;
    let missingValueDate = 0;
    let missingUsdValue = 0;

    const budgetsWithGaps = [];

    for (const budget of budgets || []) {
      let hasGap = false;

      if (!budget.type) {
        missingType++;
        hasGap = true;
      }
      if (!budget.status) {
        missingStatus++;
        hasGap = true;
      }
      if (!budget.period_start) {
        missingPeriodStart++;
        hasGap = true;
      }
      if (!budget.period_end) {
        missingPeriodEnd++;
        hasGap = true;
      }
      if (!budget.value && budget.value !== 0) {
        missingValue++;
        hasGap = true;
      }
      if (!budget.currency) {
        missingCurrency++;
        hasGap = true;
      }
      if (!budget.value_date) {
        missingValueDate++;
        hasGap = true;
      }
      if (!budget.usd_value && budget.usd_value !== 0) {
        missingUsdValue++;
        hasGap = true;
      }

      if (hasGap) {
        budgetsWithGaps.push({
          id: budget.id,
          activity_id: budget.activity_id,
          activityTitle: budget.activities?.title_narrative || 'Untitled Activity',
          type: budget.type,
          status: budget.status,
          period_start: budget.period_start,
          period_end: budget.period_end,
          value: budget.value,
          currency: budget.currency,
          value_date: budget.value_date,
          usd_value: budget.usd_value,
          value_usd: budget.usd_value
        });
      }
    }

    // Add data gaps summary
    if (missingType > 0) {
      dataGaps.push({ field: 'missing_type', label: 'Missing Type', count: missingType });
    }
    if (missingStatus > 0) {
      dataGaps.push({ field: 'missing_status', label: 'Missing Status', count: missingStatus });
    }
    if (missingPeriodStart > 0) {
      dataGaps.push({ field: 'missing_period_start', label: 'Missing Start Date', count: missingPeriodStart });
    }
    if (missingPeriodEnd > 0) {
      dataGaps.push({ field: 'missing_period_end', label: 'Missing End Date', count: missingPeriodEnd });
    }
    if (missingValue > 0) {
      dataGaps.push({ field: 'missing_value', label: 'Missing Value', count: missingValue });
    }
    if (missingCurrency > 0) {
      dataGaps.push({ field: 'missing_currency', label: 'Missing Currency', count: missingCurrency });
    }
    if (missingValueDate > 0) {
      dataGaps.push({ field: 'missing_value_date', label: 'Missing Value Date', count: missingValueDate });
    }
    if (missingUsdValue > 0) {
      dataGaps.push({ field: 'missing_usd_value', label: 'Missing USD Value', count: missingUsdValue });
    }

    return NextResponse.json({
      budgets: budgetsWithGaps,
      dataGaps
    });

  } catch (error) {
    console.error('Error fetching budgets with gaps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budgets' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Debug endpoint to check if USD columns exist in budgets and planned disbursements tables
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    console.log('[Check USD Columns] Checking database schema...');

    // Try to query usd_value from activity_budgets
    const { data: budgetData, error: budgetError } = await supabase
      .from('activity_budgets')
      .select('id, value, currency, usd_value')
      .limit(3);

    const budgetStatus = {
      columnExists: !budgetError || !budgetError.message.includes('column "usd_value" does not exist'),
      error: budgetError?.message || null,
      sampleData: budgetData
    };

    // Try to query usd_amount from planned_disbursements
    const { data: disbursementData, error: disbursementError } = await supabase
      .from('planned_disbursements')
      .select('id, amount, currency, usd_amount')
      .limit(3);

    const disbursementStatus = {
      columnExists: !disbursementError || !disbursementError.message.includes('column "usd_amount" does not exist'),
      error: disbursementError?.message || null,
      sampleData: disbursementData
    };

    // Count how many records need conversion
    if (budgetStatus.columnExists) {
      const { count: budgetNullCount } = await supabase
        .from('activity_budgets')
        .select('*', { count: 'exact', head: true })
        .is('usd_value', null)
        .neq('currency', 'USD');

      budgetStatus['recordsNeedingConversion'] = budgetNullCount || 0;
    }

    if (disbursementStatus.columnExists) {
      const { count: disbursementNullCount } = await supabase
        .from('planned_disbursements')
        .select('*', { count: 'exact', head: true })
        .is('usd_amount', null)
        .neq('currency', 'USD');

      disbursementStatus['recordsNeedingConversion'] = disbursementNullCount || 0;
    }

    return NextResponse.json({
      activityBudgets: budgetStatus,
      plannedDisbursements: disbursementStatus,
      summary: {
        bothColumnsExist: budgetStatus.columnExists && disbursementStatus.columnExists,
        needsMigration: !budgetStatus.columnExists || !disbursementStatus.columnExists,
        needsBackfill: (budgetStatus['recordsNeedingConversion'] || 0) > 0 || (disbursementStatus['recordsNeedingConversion'] || 0) > 0
      }
    });

  } catch (error) {
    console.error('[Check USD Columns] Unexpected error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

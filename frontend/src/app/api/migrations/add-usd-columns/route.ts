import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Migration endpoint to add USD columns to activity_budgets and planned_disbursements
 * This fixes the currency conversion issue where USD values weren't being stored
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    console.log('[Add USD Columns Migration] Starting migration...');

    // Add usd_value column to activity_budgets
    console.log('[Add USD Columns Migration] Adding usd_value to activity_budgets...');
    const { error: budgetError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE activity_budgets ADD COLUMN IF NOT EXISTS usd_value DECIMAL(15,2);'
    });

    if (budgetError) {
      // Try direct query as fallback
      const { error: budgetError2 } = await supabase
        .from('activity_budgets')
        .select('usd_value')
        .limit(1);

      if (budgetError2 && budgetError2.message.includes('column "usd_value" does not exist')) {
        console.error('[Add USD Columns Migration] Column does not exist and could not be added:', budgetError);
        return NextResponse.json({
          error: 'Could not add usd_value column to activity_budgets',
          details: budgetError.message,
          note: 'You may need to run this migration via Supabase dashboard SQL editor'
        }, { status: 500 });
      }
    }

    console.log('[Add USD Columns Migration] Successfully added usd_value to activity_budgets');

    // Add usd_amount column to planned_disbursements
    console.log('[Add USD Columns Migration] Adding usd_amount to planned_disbursements...');
    const { error: disbursementError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS usd_amount DECIMAL(15,2);'
    });

    if (disbursementError) {
      // Try direct query as fallback
      const { error: disbursementError2 } = await supabase
        .from('planned_disbursements')
        .select('usd_amount')
        .limit(1);

      if (disbursementError2 && disbursementError2.message.includes('column "usd_amount" does not exist')) {
        console.error('[Add USD Columns Migration] Column does not exist and could not be added:', disbursementError);
        return NextResponse.json({
          error: 'Could not add usd_amount column to planned_disbursements',
          details: disbursementError.message,
          note: 'You may need to run this migration via Supabase dashboard SQL editor'
        }, { status: 500 });
      }
    }

    console.log('[Add USD Columns Migration] Successfully added usd_amount to planned_disbursements');

    // Verify columns exist by querying for them
    const { error: verifyBudgetError } = await supabase
      .from('activity_budgets')
      .select('usd_value')
      .limit(1);

    const { error: verifyDisbursementError } = await supabase
      .from('planned_disbursements')
      .select('usd_amount')
      .limit(1);

    if (verifyBudgetError || verifyDisbursementError) {
      return NextResponse.json({
        error: 'Columns may not have been added successfully',
        budgetError: verifyBudgetError?.message,
        disbursementError: verifyDisbursementError?.message
      }, { status: 500 });
    }

    console.log('[Add USD Columns Migration] Migration completed successfully!');

    return NextResponse.json({
      message: 'Migration completed successfully',
      changes: [
        'Added usd_value column to activity_budgets',
        'Added usd_amount column to planned_disbursements'
      ],
      nextSteps: [
        'Run POST /api/budgets/backfill-usd to populate existing budgets',
        'Run POST /api/planned-disbursements/backfill-usd to populate existing disbursements'
      ]
    });

  } catch (error) {
    console.error('[Add USD Columns Migration] Unexpected error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

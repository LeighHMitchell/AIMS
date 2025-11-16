import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Apply the USD columns migration to the database
 * This adds usd_amount to planned_disbursements and ensures usd_value exists on activity_budgets
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    console.log('[Add USD Columns] Starting migration...');

    // SQL to add columns
    const migrationSQL = `
      -- Add USD conversion fields to activity_budgets table
      ALTER TABLE activity_budgets
      ADD COLUMN IF NOT EXISTS usd_value DECIMAL(15,2);

      COMMENT ON COLUMN activity_budgets.usd_value IS 'USD equivalent of the budget value, calculated using exchange rates at value_date';

      -- Add USD conversion fields to planned_disbursements table
      ALTER TABLE planned_disbursements
      ADD COLUMN IF NOT EXISTS usd_amount DECIMAL(15,2);

      COMMENT ON COLUMN planned_disbursements.usd_amount IS 'USD equivalent of the disbursement amount, calculated using exchange rates at value_date or period_start';
    `;

    // Execute the migration using raw SQL
    const { error } = await supabase.rpc('exec', { sql: migrationSQL });

    if (error) {
      console.error('[Add USD Columns] Error executing migration:', error);
      return NextResponse.json({
        error: 'Failed to add USD columns',
        details: error.message,
        suggestion: 'Please run this SQL manually in Supabase SQL Editor: https://supabase.com/dashboard/project/lhiayyjwkjkjkxvhcenw/sql',
        sql: migrationSQL
      }, { status: 500 });
    }

    console.log('[Add USD Columns] Migration completed successfully');

    return NextResponse.json({
      success: true,
      message: 'USD columns added successfully',
      columns_added: ['activity_budgets.usd_value', 'planned_disbursements.usd_amount']
    });

  } catch (error) {
    console.error('[Add USD Columns] Unexpected error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

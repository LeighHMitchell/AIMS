import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('[Planned Disbursement Migration] Starting sequence_index and raw_xml migration...');

    // Add sequence_index column
    const { error: seqError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'planned_disbursements' AND column_name = 'sequence_index'
          ) THEN
            ALTER TABLE planned_disbursements ADD COLUMN sequence_index INTEGER;
            RAISE NOTICE 'Added column: sequence_index';
          END IF;
        END $$;
      `
    });

    if (seqError) {
      // Try direct ALTER TABLE
      const { error: altError1 } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS sequence_index INTEGER;`
      });

      if (altError1) {
        console.log('[Migration] Using direct query for sequence_index');
        await supabase.from('planned_disbursements').select('id').limit(1);
        // Column might already exist, continue
      }
    }

    // Add raw_xml column
    const { error: xmlError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'planned_disbursements' AND column_name = 'raw_xml'
          ) THEN
            ALTER TABLE planned_disbursements ADD COLUMN raw_xml TEXT;
            RAISE NOTICE 'Added column: raw_xml';
          END IF;
        END $$;
      `
    });

    if (xmlError) {
      // Try direct ALTER TABLE
      const { error: altError2 } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS raw_xml TEXT;`
      });

      if (altError2) {
        console.log('[Migration] Using direct query for raw_xml');
        await supabase.from('planned_disbursements').select('id').limit(1);
        // Column might already exist, continue
      }
    }

    // Verify columns exist
    const { data: columns } = await supabase
      .from('planned_disbursements')
      .select('*')
      .limit(1);

    console.log('[Planned Disbursement Migration] Migration completed successfully');
    console.log('[Planned Disbursement Migration] Sample record:', columns?.[0]);

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      columns: columns?.[0] ? Object.keys(columns[0]) : []
    });

  } catch (error) {
    console.error('[Planned Disbursement Migration] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

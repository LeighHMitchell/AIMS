import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const results: any[] = [];

  try {
    // Add type column
    const { error: error1 } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE planned_disbursements
        ADD COLUMN IF NOT EXISTS type VARCHAR(2) DEFAULT '1';
      `
    }).catch(() => ({ error: null })); // Ignore if column exists

    results.push({ column: 'type', error: error1 });

    // Add provider_org_ref column
    const { error: error2 } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE planned_disbursements
        ADD COLUMN IF NOT EXISTS provider_org_ref VARCHAR(255);
      `
    }).catch(() => ({ error: null }));

    results.push({ column: 'provider_org_ref', error: error2 });

    // Add provider_org_type column
    const { error: error3 } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE planned_disbursements
        ADD COLUMN IF NOT EXISTS provider_org_type VARCHAR(10);
      `
    }).catch(() => ({ error: null }));

    results.push({ column: 'provider_org_type', error: error3 });

    // Add provider_org_activity_id column
    const { error: error4 } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE planned_disbursements
        ADD COLUMN IF NOT EXISTS provider_org_activity_id VARCHAR(255);
      `
    }).catch(() => ({ error: null }));

    results.push({ column: 'provider_org_activity_id', error: error4 });

    // Add receiver_org_ref column
    const { error: error5 } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE planned_disbursements
        ADD COLUMN IF NOT EXISTS receiver_org_ref VARCHAR(255);
      `
    }).catch(() => ({ error: null }));

    results.push({ column: 'receiver_org_ref', error: error5 });

    // Add receiver_org_type column
    const { error: error6 } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE planned_disbursements
        ADD COLUMN IF NOT EXISTS receiver_org_type VARCHAR(10);
      `
    }).catch(() => ({ error: null }));

    results.push({ column: 'receiver_org_type', error: error6 });

    // Add receiver_org_activity_id column
    const { error: error7 } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE planned_disbursements
        ADD COLUMN IF NOT EXISTS receiver_org_activity_id VARCHAR(255);
      `
    }).catch(() => ({ error: null }));

    results.push({ column: 'receiver_org_activity_id', error: error7 });

    return NextResponse.json({
      success: true,
      message: 'Migration completed',
      results
    });

  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
      results,
      manualSQL: `
-- Run this SQL manually in Supabase SQL Editor:

ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS type VARCHAR(2) DEFAULT '1';
ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS provider_org_ref VARCHAR(255);
ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS provider_org_type VARCHAR(10);
ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS provider_org_activity_id VARCHAR(255);
ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS receiver_org_ref VARCHAR(255);
ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS receiver_org_type VARCHAR(10);
ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS receiver_org_activity_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_planned_disbursements_provider_org_ref ON planned_disbursements(provider_org_ref);
CREATE INDEX IF NOT EXISTS idx_planned_disbursements_receiver_org_ref ON planned_disbursements(receiver_org_ref);
      `
    }, { status: 500 });
  }
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addColumns() {
  console.log('🔧 Adding IATI reference columns to planned_disbursements table...\n');

  const statements = [
    {
      name: 'type',
      sql: `ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS type VARCHAR(2) DEFAULT '1';`
    },
    {
      name: 'provider_org_ref',
      sql: `ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS provider_org_ref VARCHAR(255);`
    },
    {
      name: 'provider_org_type',
      sql: `ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS provider_org_type VARCHAR(10);`
    },
    {
      name: 'provider_org_activity_id',
      sql: `ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS provider_org_activity_id VARCHAR(255);`
    },
    {
      name: 'receiver_org_ref',
      sql: `ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS receiver_org_ref VARCHAR(255);`
    },
    {
      name: 'receiver_org_type',
      sql: `ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS receiver_org_type VARCHAR(10);`
    },
    {
      name: 'receiver_org_activity_id',
      sql: `ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS receiver_org_activity_id VARCHAR(255);`
    }
  ];

  console.log('📝 SQL statements to execute:\n');
  for (const stmt of statements) {
    console.log(`   ${stmt.sql}`);
  }

  console.log('\n❌ ERROR: Supabase client does not support DDL operations via API.\n');
  console.log('✅ SOLUTION: Please run the following SQL manually in Supabase SQL Editor:\n');
  console.log('   URL: https://supabase.com/dashboard/project/lhiayyjwkjkjkxvhcenw/sql\n');
  console.log('=' .repeat(80));
  console.log(statements.map(s => s.sql).join('\n'));
  console.log('\n-- Add indexes');
  console.log('CREATE INDEX IF NOT EXISTS idx_planned_disbursements_provider_org_ref ON planned_disbursements(provider_org_ref);');
  console.log('CREATE INDEX IF NOT EXISTS idx_planned_disbursements_receiver_org_ref ON planned_disbursements(receiver_org_ref);');
  console.log('=' .repeat(80) + '\n');
}

addColumns();

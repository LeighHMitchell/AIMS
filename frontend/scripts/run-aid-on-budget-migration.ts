/**
 * Script to run the Aid on Budget migration
 * Usage: npx tsx scripts/run-aid-on-budget-migration.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running Aid on Budget migration...\n');

  // 1. Create budget_classifications table
  console.log('1. Creating budget_classifications table...');
  const { error: error1 } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS budget_classifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        name_local TEXT,
        description TEXT,
        classification_type TEXT NOT NULL CHECK (classification_type IN ('administrative', 'functional', 'economic', 'programme')),
        parent_id UUID REFERENCES budget_classifications(id) ON DELETE CASCADE,
        level INTEGER NOT NULL DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID,
        CONSTRAINT unique_budget_code_type UNIQUE(code, classification_type)
      );
    `
  });

  if (error1) {
    // Try direct SQL if RPC doesn't exist
    const { error: directError1 } = await supabase
      .from('budget_classifications')
      .select('id')
      .limit(1);

    if (directError1?.message?.includes('does not exist')) {
      console.log('   Table does not exist, creating via direct insert workaround...');
      // Use raw SQL via REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({})
      });
      console.log('   Note: Table creation may need to be done via Supabase Dashboard SQL editor');
    } else {
      console.log('   Table already exists or check error:', error1?.message || 'unknown');
    }
  } else {
    console.log('   Done');
  }

  // Check if table exists now
  const { data: checkTable, error: checkError } = await supabase
    .from('budget_classifications')
    .select('id')
    .limit(1);

  if (checkError?.message?.includes('does not exist')) {
    console.log('\n❌ Table creation failed. Please run the migration manually:');
    console.log('   1. Go to https://supabase.com/dashboard/project/lhiayyjwkjkjkxvhcenw/sql');
    console.log('   2. Copy and paste the contents of:');
    console.log('      supabase/migrations/20251215000000_create_aid_on_budget_tables.sql');
    console.log('   3. Click "Run"');
    return;
  }

  console.log('\n✓ Table exists, checking for seed data...');

  // Check if we have data
  const { data: existingData, count } = await supabase
    .from('budget_classifications')
    .select('*', { count: 'exact' })
    .limit(1);

  if (count && count > 0) {
    console.log(`   Found ${count} existing classifications. Skipping seed data.`);
  } else {
    console.log('   No data found. Inserting seed data...');

    // Insert functional classifications
    const functionalData = [
      { code: '01', name: 'General Public Services', description: 'Executive and legislative organs, financial and fiscal affairs, external affairs', classification_type: 'functional', level: 1, sort_order: 1 },
      { code: '02', name: 'Defence', description: 'Military defence, civil defence, foreign military aid', classification_type: 'functional', level: 1, sort_order: 2 },
      { code: '03', name: 'Public Order and Safety', description: 'Police services, fire-protection services, law courts, prisons', classification_type: 'functional', level: 1, sort_order: 3 },
      { code: '04', name: 'Economic Affairs', description: 'General economic, commercial and labour affairs', classification_type: 'functional', level: 1, sort_order: 4 },
      { code: '05', name: 'Environmental Protection', description: 'Waste management, pollution abatement, protection of biodiversity', classification_type: 'functional', level: 1, sort_order: 5 },
      { code: '06', name: 'Housing and Community Amenities', description: 'Housing development, community development, water supply', classification_type: 'functional', level: 1, sort_order: 6 },
      { code: '07', name: 'Health', description: 'Medical products, appliances and equipment, outpatient and hospital services', classification_type: 'functional', level: 1, sort_order: 7 },
      { code: '08', name: 'Recreation, Culture and Religion', description: 'Recreational and sporting services, cultural services', classification_type: 'functional', level: 1, sort_order: 8 },
      { code: '09', name: 'Education', description: 'Pre-primary, primary, secondary, tertiary and non-tertiary education', classification_type: 'functional', level: 1, sort_order: 9 },
      { code: '10', name: 'Social Protection', description: 'Sickness and disability, old age, family and children, unemployment', classification_type: 'functional', level: 1, sort_order: 10 },
    ];

    const { error: insertError1 } = await supabase
      .from('budget_classifications')
      .insert(functionalData);

    if (insertError1) {
      console.log('   Error inserting functional data:', insertError1.message);
    } else {
      console.log('   Inserted 10 functional classifications');
    }

    // Insert economic classifications
    const economicData = [
      { code: 'E1', name: 'Compensation of Employees', description: 'Wages, salaries, and allowances for employees', classification_type: 'economic', level: 1, sort_order: 1 },
      { code: 'E2', name: 'Use of Goods and Services', description: 'Operating costs, supplies, maintenance', classification_type: 'economic', level: 1, sort_order: 2 },
      { code: 'E3', name: 'Consumption of Fixed Capital', description: 'Depreciation of fixed assets', classification_type: 'economic', level: 1, sort_order: 3 },
      { code: 'E4', name: 'Interest', description: 'Interest payments on loans and debt', classification_type: 'economic', level: 1, sort_order: 4 },
      { code: 'E5', name: 'Subsidies', description: 'Subsidies to corporations and enterprises', classification_type: 'economic', level: 1, sort_order: 5 },
      { code: 'E6', name: 'Grants', description: 'Grants to other government units, international organizations', classification_type: 'economic', level: 1, sort_order: 6 },
      { code: 'E7', name: 'Social Benefits', description: 'Social security, social assistance benefits', classification_type: 'economic', level: 1, sort_order: 7 },
      { code: 'E8', name: 'Other Expenses', description: 'Property expense, other miscellaneous expenses', classification_type: 'economic', level: 1, sort_order: 8 },
    ];

    const { error: insertError2 } = await supabase
      .from('budget_classifications')
      .insert(economicData);

    if (insertError2) {
      console.log('   Error inserting economic data:', insertError2.message);
    } else {
      console.log('   Inserted 8 economic classifications');
    }

    // Insert administrative classifications
    const adminData = [
      { code: 'MOF', name: 'Ministry of Finance', description: 'Ministry responsible for fiscal policy and government revenue', classification_type: 'administrative', level: 1, sort_order: 1 },
      { code: 'MOH', name: 'Ministry of Health', description: 'Ministry responsible for health services and policy', classification_type: 'administrative', level: 1, sort_order: 2 },
      { code: 'MOE', name: 'Ministry of Education', description: 'Ministry responsible for education services and policy', classification_type: 'administrative', level: 1, sort_order: 3 },
      { code: 'MOAIF', name: 'Ministry of Agriculture', description: 'Ministry for productive sectors', classification_type: 'administrative', level: 1, sort_order: 4 },
      { code: 'MoWE', name: 'Ministry of Water and Environment', description: 'Ministry for water resources and environment', classification_type: 'administrative', level: 1, sort_order: 5 },
      { code: 'MoWT', name: 'Ministry of Works and Transport', description: 'Ministry for infrastructure and transport', classification_type: 'administrative', level: 1, sort_order: 6 },
    ];

    const { error: insertError3 } = await supabase
      .from('budget_classifications')
      .insert(adminData);

    if (insertError3) {
      console.log('   Error inserting administrative data:', insertError3.message);
    } else {
      console.log('   Inserted 6 administrative classifications');
    }
  }

  console.log('\n✅ Migration complete!');
}

runMigration().catch(console.error);

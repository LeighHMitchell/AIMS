import { getSupabaseAdmin } from '../src/lib/supabase';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  const supabase = getSupabaseAdmin();

  console.log('Reading migration file...');
  const migrationPath = join(__dirname, '../supabase/migrations/20250114000001_add_usd_to_budgets_and_disbursements.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  console.log('Running migration to add USD columns...');
  console.log(migrationSQL);

  // Execute the SQL directly
  const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

  if (error) {
    console.error('Error running migration:', error);

    // Try alternative approach - run each statement separately
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('COMMENT'));

    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 100) + '...');
      const result = await supabase.from('_sql_migrations').insert({ statement });
      console.log('Result:', result);
    }
  } else {
    console.log('Migration executed successfully!', data);
  }

  console.log('Done!');
}

runMigration().catch(console.error);

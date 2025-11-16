import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Running Planned Disbursement IATI Reference Fields Migration...\n');

  const migrationPath = path.join(__dirname, '../supabase/migrations/20250115000000_add_planned_disbursement_iati_ref_fields.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  try {
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // Try direct execution via query if rpc doesn't work
      console.log('⚠️  RPC exec_sql not available, trying direct execution...\n');

      // Split the SQL into individual statements and execute them
      const statements = migrationSQL
        .split('-- ')
        .filter(s => s.trim());

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            const { error: stmtError } = await supabase.rpc('exec', {
              query: statement
            });
            if (stmtError) {
              console.error('Statement error:', stmtError);
            }
          } catch (e) {
            // Ignore - will use manual SQL execution below
          }
        }
      }

      console.log('\n⚠️  Automatic migration failed. Please run the migration manually.');
      console.log('\nOption 1: Run this SQL directly in Supabase SQL Editor:');
      console.log('https://supabase.com/dashboard/project/lhiayyjwkjkjkxvhcenw/sql');
      console.log('\nOption 2: Copy and execute this SQL:');
      console.log('\n' + '='.repeat(80));
      console.log(migrationSQL);
      console.log('='.repeat(80) + '\n');
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!');
    console.log('Result:', data);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.log('\nPlease run the migration manually using Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/lhiayyjwkjkjkxvhcenw/sql');
    process.exit(1);
  }
}

runMigration();

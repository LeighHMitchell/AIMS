import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🚀 Applying performance optimization migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250711_performance_optimization_indexes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`\n⏳ Executing statement ${i + 1}/${statements.length}...`);
      
      // Show first 100 chars of the statement
      const preview = statement.substring(0, 100).replace(/\n/g, ' ');
      console.log(`   ${preview}${statement.length > 100 ? '...' : ''}`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // Some errors are expected (e.g., "already exists")
        if (error.message.includes('already exists')) {
          console.log(`   ✓ Already exists (skipped)`);
        } else {
          console.error(`   ❌ Error: ${error.message}`);
          // Continue with other statements
        }
      } else {
        console.log(`   ✅ Success`);
      }
    }
    
    console.log('\n🔄 Refreshing materialized view...');
    const { error: refreshError } = await supabase.rpc('refresh_activity_transaction_summaries');
    
    if (refreshError) {
      console.error('❌ Error refreshing materialized view:', refreshError.message);
    } else {
      console.log('✅ Materialized view refreshed successfully');
    }
    
    // Test the materialized view
    console.log('\n🧪 Testing materialized view...');
    const { data: testData, error: testError } = await supabase
      .from('activity_transaction_summaries')
      .select('*')
      .limit(5);
    
    if (testError) {
      console.error('❌ Error testing materialized view:', testError.message);
    } else {
      console.log(`✅ Materialized view is working! Found ${testData?.length || 0} records`);
      if (testData && testData.length > 0) {
        console.log('   Sample record:', {
          activity_id: testData[0].activity_id,
          total_transactions: testData[0].total_transactions,
          commitments: testData[0].commitments,
          disbursements: testData[0].disbursements
        });
      }
    }
    
    console.log('\n✨ Performance optimization migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Create exec_sql function if it doesn't exist
async function createExecSqlFunction() {
  const createFunction = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS void AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
  
  const { error } = await supabase.rpc('exec_sql', { sql: createFunction });
  
  if (!error) {
    console.log('✅ Created exec_sql function');
  }
}

async function main() {
  // First try to create the exec_sql function
  await createExecSqlFunction();
  
  // Then apply the migration
  await applyMigration();
}

main().catch(console.error);
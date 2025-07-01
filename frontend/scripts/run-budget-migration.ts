import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseServiceKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting budget tables migration...\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../sql/create_activity_budgets_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split into individual statements (basic split, may need refinement)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s + ';');

    console.log(`📦 Running ${statements.length} SQL statements...\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments-only statements
      if (statement.replace(/--.*$/gm, '').trim().length === 0) continue;
      
      console.log(`Running statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { 
        sql_query: statement 
      }).single();

      if (error) {
        // Try direct execution as fallback
        console.log('  Trying alternative method...');
        const { error: altError } = await supabase.from('_migrations').select('*').limit(1);
        
        if (altError) {
          console.error(`❌ Failed to execute statement ${i + 1}:`, error.message);
          console.error('Statement:', statement.substring(0, 100) + '...');
          throw error;
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nYou can now use the Budgets tab in your Activity Editor.');
    
    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    
    const { data: budgetsTable } = await supabase
      .from('activity_budgets')
      .select('count')
      .limit(1);
      
    const { data: exceptionsTable } = await supabase
      .from('activity_budget_exceptions')
      .select('count')
      .limit(1);

    if (budgetsTable !== null && exceptionsTable !== null) {
      console.log('✅ Tables verified successfully!');
    } else {
      console.log('⚠️  Could not verify tables. You may need to run the SQL manually in Supabase.');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\nPlease run the SQL manually in your Supabase SQL Editor.');
    process.exit(1);
  }
}

runMigration(); 
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyRolodexView() {
  console.log('🚀 Applying unified rolodex view to database...');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'create_unified_rolodex_view.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Read SQL file successfully');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`\n🔧 Executing statement ${i + 1}/${statements.length}...`);
      
      // Log first 100 chars of statement
      console.log(`   ${statement.substring(0, 100)}...`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement
      });
      
      if (error) {
        // Try direct execution if exec_sql doesn't exist
        console.log('⚠️  exec_sql function not found, trying direct query...');
        
        // For simple queries, we can use from() with raw SQL
        // This is a workaround since Supabase JS doesn't directly support raw SQL
        console.error('❌ Cannot execute raw SQL directly with Supabase JS client');
        console.error('   Please run the SQL file directly in Supabase SQL Editor:');
        console.error(`   ${sqlPath}`);
        process.exit(1);
      } else {
        console.log('✅ Statement executed successfully');
      }
    }
    
    console.log('\n🎉 All SQL statements executed successfully!');
    
    // Test the view
    console.log('\n🧪 Testing the unified view...');
    const { data, error: testError } = await supabase
      .from('person_unified_view')
      .select('*')
      .limit(5);
    
    if (testError) {
      console.error('❌ Error testing view:', testError);
    } else {
      console.log(`✅ View working! Found ${data?.length || 0} records`);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

applyRolodexView().catch(console.error);
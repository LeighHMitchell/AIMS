import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function createRolodexView() {
  console.log('🏗️  Creating rolodex view...');
  
  try {
    // Read the SQL file
    const sqlContent = readFileSync(path.join(process.cwd(), 'create_working_rolodex_view.sql'), 'utf-8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('❌ Error creating view:', error);
      
      // Try alternative approach - execute statements one by one
      console.log('🔄 Trying alternative approach...');
      
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        console.log('📝 Executing:', statement.substring(0, 50) + '...');
        const { error: statementError } = await supabase.rpc('exec_sql', { sql: statement });
        if (statementError) {
          console.error('❌ Statement failed:', statementError);
          console.error('Statement was:', statement);
        }
      }
    } else {
      console.log('✅ View created successfully');
    }
    
    // Test the view
    console.log('🧪 Testing the view...');
    const { data: testData, error: testError } = await supabase
      .from('person_unified_view')
      .select('*')
      .limit(5);
    
    if (testError) {
      console.error('❌ View test failed:', testError);
    } else {
      console.log('✅ View test successful - found', testData.length, 'records');
      console.log('📋 Sample records:', testData);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
createRolodexView().catch(console.error);
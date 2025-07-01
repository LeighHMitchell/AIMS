import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  if (!supabaseUrl) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseServiceKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUnifiedRolodexView() {
  console.log('🚀 Creating unified Rolodex view...');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../create_unified_rolodex_view.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try running the SQL directly through a different method
      console.log('⚠️  exec_sql RPC not available, attempting alternative method...');
      
      // Split the SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      // Execute each statement
      for (const statement of statements) {
        try {
          // For view creation, we'll use a workaround
          if (statement.includes('CREATE OR REPLACE VIEW') || statement.includes('DROP VIEW')) {
            console.log('📝 Executing view statement...');
            // Note: This is a placeholder - in production, you'd need to run this through
            // your database admin interface or use migrations
            console.log('⚠️  View creation must be done through Supabase dashboard or migrations');
          } else if (statement.includes('CREATE INDEX')) {
            console.log('📝 Creating index...');
            // Indexes also need to be created through migrations
            console.log('⚠️  Index creation must be done through Supabase dashboard or migrations');
          }
        } catch (stmtError) {
          console.error('❌ Error executing statement:', stmtError);
        }
      }

      console.log('\n✅ SQL statements prepared. To complete the setup:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to the SQL Editor');
      console.log('3. Copy and paste the contents of create_unified_rolodex_view.sql');
      console.log('4. Execute the SQL');
      
      return;
    }

    console.log('✅ Unified Rolodex view created successfully!');

    // Test the view
    console.log('\n🧪 Testing the unified view...');
    
    const { data: testData, error: testError } = await supabase
      .from('person_unified_view')
      .select('*')
      .limit(5);

    if (testError) {
      console.error('❌ Error testing view:', testError);
    } else {
      console.log(`✅ View test successful! Found ${testData?.length || 0} records`);
      if (testData && testData.length > 0) {
        console.log('\nSample record:');
        console.log(JSON.stringify(testData[0], null, 2));
      }
    }

    // Test the search function
    console.log('\n🧪 Testing the search function...');
    
    const { data: searchData, error: searchError } = await supabase
      .rpc('search_unified_rolodex', {
        p_limit: 5,
        p_offset: 0
      });

    if (searchError) {
      console.error('❌ Error testing search function:', searchError);
    } else {
      console.log(`✅ Search function test successful! Found ${searchData?.length || 0} records`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
createUnifiedRolodexView().catch(console.error); 
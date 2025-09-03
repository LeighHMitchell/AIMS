import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addFeatureColumn() {
  console.log('🔨 Adding feature column to feedback table...\n');

  try {
    // Execute the SQL migration
    const migrationSQL = `
      -- Add feature column if it doesn't exist
      ALTER TABLE feedback ADD COLUMN IF NOT EXISTS feature TEXT;
      
      -- Add comment
      COMMENT ON COLUMN feedback.feature IS 'App feature/functionality this feedback relates to';
    `;

    console.log('Executing SQL migration...');
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If the RPC doesn't work, try direct approach
      console.log('RPC failed, trying direct approach...');
      
      // Try using a simple query approach
      const { error: directError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'feedback')
        .eq('column_name', 'feature');

      if (directError) {
        console.log('Column check failed, but this might be expected.');
      }

      // Since we can't execute DDL directly through the client in most cases,
      // let's create a test insert to see if the column exists
      console.log('Testing if feature column exists by attempting insert...');
      
      const testData = {
        user_id: '00000000-0000-0000-0000-000000000000',
        category: 'comment',
        feature: 'test-feature', // This will fail if column doesn't exist
        message: 'test message for schema check',
        status: 'open',
        priority: 'medium'
      };

      const { error: testError } = await supabase
        .from('feedback')
        .insert(testData);

      if (testError) {
        if (testError.message.includes('feature')) {
          console.log('❌ Feature column still missing. You need to run the migration manually.');
          console.log('\n📋 Manual steps required:');
          console.log('1. Go to your Supabase Dashboard');
          console.log('2. Navigate to SQL Editor');
          console.log('3. Run this SQL:');
          console.log('\n' + '='.repeat(60));
          console.log('ALTER TABLE feedback ADD COLUMN IF NOT EXISTS feature TEXT;');
          console.log("COMMENT ON COLUMN feedback.feature IS 'App feature/functionality this feedback relates to';");
          console.log('='.repeat(60));
          return;
        } else {
          // Different error - might be user_id constraint, which means column exists
          console.log('✅ Feature column appears to exist (got different error)');
          
          // Clean up test data if it was inserted
          await supabase
            .from('feedback')
            .delete()
            .eq('message', 'test message for schema check');
        }
      } else {
        console.log('✅ Feature column exists and working!');
        
        // Clean up test data
        await supabase
          .from('feedback')
          .delete()
          .eq('message', 'test message for schema check');
      }
    } else {
      console.log('✅ Migration executed successfully!');
    }

    // Verify the column was added
    console.log('\nVerifying column was added...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('feedback')
      .select('*')
      .limit(1);

    if (verifyData && verifyData.length > 0) {
      const hasFeatureColumn = 'feature' in verifyData[0];
      if (hasFeatureColumn) {
        console.log('✅ Feature column verified - it exists in the table!');
      } else {
        console.log('❌ Feature column still not found in table structure');
      }
    } else {
      console.log('No data in table to verify against, but no errors occurred');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    console.log('\n📋 If the automatic migration failed, please run this SQL manually:');
    console.log('ALTER TABLE feedback ADD COLUMN IF NOT EXISTS feature TEXT;');
  }
}

// Run the migration
addFeatureColumn();
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function addCooperationModalityFields() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('🔧 Adding cooperation_modality and is_development_partner fields to organizations table...');

    // Read the SQL migration file
    const sqlPath = path.join(process.cwd(), '..', 'sql', 'add_cooperation_modality_fields.sql');
    const migrationSQL = fs.readFileSync(sqlPath, 'utf8');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql_query: migrationSQL });

    if (error) {
      console.error('❌ Error executing migration:', error);
      process.exit(1);
    }

    console.log('✅ Successfully added cooperation_modality and is_development_partner fields!');

    // Verify the columns were added
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'organizations')
      .in('column_name', ['cooperation_modality', 'is_development_partner']);

    if (columnsError) {
      console.log('⚠️  Could not verify columns were added:', columnsError);
    } else if (columns && columns.length === 2) {
      console.log('✅ Verified both new columns exist in the organizations table');
    } else {
      console.log('⚠️  Could not verify all columns were added properly');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// If running this script directly
if (require.main === module) {
  addCooperationModalityFields()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { addCooperationModalityFields }; 
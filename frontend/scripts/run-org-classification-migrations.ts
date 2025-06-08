import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function runOrgClassificationMigrations() {
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
    console.log('🚀 Running organization classification enhancement migrations...');

    // Migration 1: Add classification override fields
    console.log('📋 Step 1: Adding organization classification override fields...');
    const overrideMigrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20250110100000_add_org_classification_override.sql');
    const overrideMigrationSQL = fs.readFileSync(overrideMigrationPath, 'utf8');
    
    const { error: overrideError } = await supabase.rpc('exec_sql', { sql_query: overrideMigrationSQL });
    if (overrideError) {
      console.error('❌ Error running override migration:', overrideError);
      process.exit(1);
    }
    console.log('✅ Successfully added classification override fields!');

    // Migration 2: Update development partners
    console.log('📋 Step 2: Updating development partner classifications...');
    const devPartnerMigrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20250110000000_update_development_partners.sql');
    const devPartnerMigrationSQL = fs.readFileSync(devPartnerMigrationPath, 'utf8');
    
    const { error: devPartnerError } = await supabase.rpc('exec_sql', { sql_query: devPartnerMigrationSQL });
    if (devPartnerError) {
      console.error('❌ Error running development partner migration:', devPartnerError);
      process.exit(1);
    }
    console.log('✅ Successfully updated development partner classifications!');

    // Verify the columns were added
    console.log('🔍 Verifying migration results...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'organizations')
      .in('column_name', ['org_classification_override', 'org_classification_manual']);

    if (columnsError) {
      console.log('⚠️  Could not verify columns were added:', columnsError);
    } else if (columns && columns.length === 2) {
      console.log('✅ Verified all new columns exist in the organizations table');
    } else {
      console.log('⚠️  Could not verify all columns were added properly');
    }

    // Check if development partners were updated
    const { data: devPartners, error: devPartnersError } = await supabase
      .from('organizations')
      .select('name, is_development_partner')
      .eq('is_development_partner', true);

    if (devPartnersError) {
      console.log('⚠️  Could not verify development partners were updated:', devPartnersError);
    } else {
      console.log(`✅ Found ${devPartners?.length || 0} organizations marked as development partners`);
      if (devPartners && devPartners.length > 0) {
        console.log('📊 Development partners:');
        devPartners.forEach(partner => {
          console.log(`   - ${partner.name}`);
        });
      }
    }

    console.log('\n🎉 All organization classification enhancement migrations completed successfully!');
    console.log('📝 Summary of changes:');
    console.log('   • Added org_classification_override and org_classification_manual columns');
    console.log('   • Updated major development agencies with is_development_partner = true');
    console.log('   • Enhanced organization classification logic');
    console.log('   • Added admin override functionality for organization classifications');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the migrations if this script is executed directly
if (require.main === module) {
  runOrgClassificationMigrations();
}

export { runOrgClassificationMigrations }; 
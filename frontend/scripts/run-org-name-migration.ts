#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting organization name migration...\n');

  try {
    // Step 1: Get current state
    console.log('📊 Checking current organization data...');
    const { data: orgs, error: fetchError } = await supabase
      .from('organizations')
      .select('id, name, full_name, acronym')
      .order('name');

    if (fetchError) {
      throw new Error(`Failed to fetch organizations: ${fetchError.message}`);
    }

    console.log(`Found ${orgs?.length || 0} organizations\n`);

    // Step 2: Analyze data
    const needsUpdate = orgs?.filter(org => {
      // Check if full_name is empty but name might contain the full name
      const nameHasSpaces = org.name?.includes(' ');
      const nameIsLong = org.name?.length > 10;
      const fullNameEmpty = !org.full_name || org.full_name === '';
      const acronymEmpty = !org.acronym || org.acronym === '';
      
      return fullNameEmpty || (acronymEmpty && !nameHasSpaces && !nameIsLong);
    }) || [];

    console.log(`📝 ${needsUpdate.length} organizations need updating\n`);

    if (needsUpdate.length === 0) {
      console.log('✅ All organizations already have proper full_name and acronym fields');
      return;
    }

    // Step 3: Show preview of changes
    console.log('Preview of changes:');
    console.log('==================');
    needsUpdate.slice(0, 10).forEach(org => {
      const willSetFullName = !org.full_name && org.name;
      const willSetAcronym = !org.acronym && org.name && org.name.length <= 10 && !org.name.includes(' ');
      
      console.log(`\n${org.name}:`);
      if (willSetFullName) {
        console.log(`  full_name: null → "${org.name}"`);
      }
      if (willSetAcronym) {
        console.log(`  acronym: null → "${org.name}"`);
      }
    });
    
    if (needsUpdate.length > 10) {
      console.log(`\n... and ${needsUpdate.length - 10} more organizations\n`);
    }

    // Step 4: Ask for confirmation
    console.log('\n⚠️  This will update the organizations table.');
    console.log('Do you want to proceed? (yes/no): ');
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise<string>(resolve => {
      readline.question('', (ans: string) => {
        readline.close();
        resolve(ans.toLowerCase());
      });
    });

    if (answer !== 'yes' && answer !== 'y') {
      console.log('\n❌ Migration cancelled');
      return;
    }

    // Step 5: Run updates
    console.log('\n🔄 Updating organizations...');
    let successCount = 0;
    let errorCount = 0;

    for (const org of needsUpdate) {
      const updates: any = {};
      
      // Set full_name if empty
      if (!org.full_name || org.full_name === '') {
        updates.full_name = org.name;
      }
      
      // Set acronym if it looks like one
      if (!org.acronym && org.name && org.name.length <= 10 && !org.name.includes(' ')) {
        updates.acronym = org.name;
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('organizations')
          .update(updates)
          .eq('id', org.id);

        if (updateError) {
          console.error(`❌ Failed to update ${org.name}: ${updateError.message}`);
          errorCount++;
        } else {
          successCount++;
          if (successCount % 10 === 0) {
            console.log(`  Updated ${successCount} organizations...`);
          }
        }
      }
    }

    // Step 6: Run SQL migration for known organizations
    console.log('\n🔧 Running SQL migration for known organizations...');
    const sqlMigration = `
      -- Update known organizations with their full names
      UPDATE organizations
      SET 
        full_name = CASE
          WHEN name = 'DFAT' AND (full_name IS NULL OR full_name = '') THEN 'Department of Foreign Affairs and Trade'
          WHEN name = 'ADB' AND (full_name IS NULL OR full_name = '') THEN 'Asian Development Bank'
          WHEN name = 'UNDP' AND (full_name IS NULL OR full_name = '') THEN 'United Nations Development Programme'
          WHEN name = 'WHO' AND (full_name IS NULL OR full_name = '') THEN 'World Health Organization'
          WHEN name = 'UNICEF' AND (full_name IS NULL OR full_name = '') THEN 'United Nations Children''s Fund'
          WHEN name = 'WFP' AND (full_name IS NULL OR full_name = '') THEN 'World Food Programme'
          WHEN name = 'USAID' AND (full_name IS NULL OR full_name = '') THEN 'United States Agency for International Development'
          ELSE full_name
        END,
        acronym = CASE
          WHEN name IN ('DFAT', 'ADB', 'UNDP', 'WHO', 'UNICEF', 'WFP', 'USAID') AND (acronym IS NULL OR acronym = '') THEN name
          ELSE acronym
        END
      WHERE 
        name IN ('DFAT', 'ADB', 'UNDP', 'WHO', 'UNICEF', 'WFP', 'USAID');
    `;

    const { error: sqlError } = await supabase.rpc('exec_sql', { sql: sqlMigration });
    if (sqlError) {
      console.warn('⚠️  Could not run SQL migration for known organizations:', sqlError.message);
      console.log('You may need to run the SQL migration manually in Supabase');
    } else {
      console.log('✅ Known organizations updated');
    }

    // Step 7: Summary
    console.log('\n📊 Migration Summary:');
    console.log('====================');
    console.log(`✅ Successfully updated: ${successCount} organizations`);
    if (errorCount > 0) {
      console.log(`❌ Failed updates: ${errorCount} organizations`);
    }

    // Step 8: Verify results
    console.log('\n🔍 Verifying results...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('organizations')
      .select('id, name, full_name, acronym')
      .or('full_name.is.null,acronym.is.null')
      .limit(5);

    if (!verifyError && verifyData && verifyData.length > 0) {
      console.log(`\n⚠️  Found ${verifyData.length} organizations still missing data:`);
      verifyData.forEach(org => {
        console.log(`  - ${org.name} (full_name: ${org.full_name || 'null'}, acronym: ${org.acronym || 'null'})`);
      });
    } else {
      console.log('✅ All organizations now have proper naming fields!');
    }

    console.log('\n✨ Migration completed!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
}); 
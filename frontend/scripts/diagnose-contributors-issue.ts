import { getSupabaseAdmin } from '../src/lib/supabase';

async function diagnoseContributorsIssue() {
  console.log('🔍 Diagnosing Contributors Issue...\n');
  
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('❌ Supabase admin client not available');
    return;
  }

  try {
    // 1. Check table structure
    console.log('1️⃣ Checking activity_contributors table structure:');
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'activity_contributors')
      .order('ordinal_position');
    
    console.log('Columns in activity_contributors:');
    columns?.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    const hasNominatedByName = columns?.some((col: any) => col.column_name === 'nominated_by_name');
    const hasOrganizationName = columns?.some((col: any) => col.column_name === 'organization_name');
    
    console.log(`\n✅ Has nominated_by_name column: ${hasNominatedByName}`);
    console.log(`✅ Has organization_name column: ${hasOrganizationName}`);
    
    // 2. Check users table structure
    console.log('\n2️⃣ Checking users table structure:');
    const { data: userColumns } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'users')
      .order('ordinal_position');
    
    console.log('Columns in users table:');
    userColumns?.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // 3. Check sample data
    console.log('\n3️⃣ Checking sample contributor data:');
    const { data: contributors } = await supabase
      .from('activity_contributors')
      .select('*')
      .limit(5);
    
    if (contributors && contributors.length > 0) {
      console.log(`Found ${contributors.length} sample contributors:`);
      contributors.forEach((c: any) => {
        console.log(`\n  Contributor ID: ${c.id}`);
        console.log(`  Organization: ${c.organization_name || 'NOT SET'}`);
        console.log(`  Nominated by: ${c.nominated_by_name || 'NOT SET'} (ID: ${c.nominated_by || 'NULL'})`);
        console.log(`  Status: ${c.status}`);
      });
    } else {
      console.log('No contributors found in the database');
    }
    
    // 4. Check for contributors with missing nominated_by_name
    console.log('\n4️⃣ Checking for contributors with missing nominated_by_name:');
    const { data: missingNames, count } = await supabase
      .from('activity_contributors')
      .select('*', { count: 'exact' })
      .or('nominated_by_name.is.null,nominated_by_name.eq.Unknown User')
      .not('nominated_by', 'is', null);
    
    console.log(`Found ${count || 0} contributors with missing/unknown nominated_by_name`);
    
    if (missingNames && missingNames.length > 0) {
      console.log('\n5️⃣ Attempting to fix missing names:');
      
      // Get unique user IDs
      const userIds = Array.from(new Set(missingNames.map((c: any) => c.nominated_by).filter(Boolean)));
      
      // Fetch user details
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .in('id', userIds);
      
      if (users && users.length > 0) {
        console.log(`Found ${users.length} users to update:`);
        
        // Update each contributor with the correct user name
        for (const contributor of missingNames) {
          const user = users.find((u: any) => u.id === contributor.nominated_by);
          if (user) {
            // Determine the best name to use
            let userName = 'Unknown User';
            
            // Check various possible name fields
            if (user.full_name) {
              userName = user.full_name;
            } else if (user.first_name && user.last_name) {
              userName = `${user.first_name} ${user.last_name}`;
            } else if (user.first_name) {
              userName = user.first_name;
            } else if (user.last_name) {
              userName = user.last_name;
            } else if (user.name) {
              userName = user.name;
            } else if (user.email) {
              userName = user.email;
            } else if (user.username) {
              userName = user.username;
            }
            
            console.log(`  Updating contributor ${contributor.id}: ${contributor.nominated_by_name || 'NULL'} -> ${userName}`);
            
            // Update the contributor
            const { error } = await supabase
              .from('activity_contributors')
              .update({ nominated_by_name: userName })
              .eq('id', contributor.id);
            
            if (error) {
              console.error(`    ❌ Error updating: ${error.message}`);
            } else {
              console.log(`    ✅ Updated successfully`);
            }
          }
        }
      }
    }
    
    // 6. Add missing columns if needed
    if (!hasNominatedByName || !hasOrganizationName) {
      console.log('\n6️⃣ Missing required columns. Running migration...');
      
      if (!hasOrganizationName) {
        console.log('Adding organization_name column...');
        const { error: addOrgNameError } = await supabase.rpc('exec_sql', {
          sql: 'ALTER TABLE activity_contributors ADD COLUMN IF NOT EXISTS organization_name TEXT'
        });
        if (addOrgNameError) {
          console.error(`❌ Error adding organization_name: ${addOrgNameError.message}`);
        } else {
          console.log('✅ Added organization_name column');
        }
      }
      
      if (!hasNominatedByName) {
        console.log('Adding nominated_by_name column...');
        const { error: addNomNameError } = await supabase.rpc('exec_sql', {
          sql: 'ALTER TABLE activity_contributors ADD COLUMN IF NOT EXISTS nominated_by_name TEXT'
        });
        if (addNomNameError) {
          console.error(`❌ Error adding nominated_by_name: ${addNomNameError.message}`);
        } else {
          console.log('✅ Added nominated_by_name column');
        }
      }
      
      console.log('\nPlease run the migration script: add_missing_contributor_columns_fixed.sql');
    }
    
    console.log('\n✅ Diagnosis complete!');
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  }
}

diagnoseContributorsIssue();
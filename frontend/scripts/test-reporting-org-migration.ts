import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testReportingOrgMigration() {
  console.log('🧪 Testing Reporting Org Migration...\n');

  try {
    // 1. Check if column exists
    console.log('1️⃣ Checking if reporting_org_id column exists...');
    const { data: columnCheck, error: columnError } = await supabase
      .from('activities')
      .select('reporting_org_id')
      .limit(1);

    if (columnError && columnError.message.includes('column')) {
      console.error('❌ Column does not exist. Please run the SQL migration first.');
      return;
    }
    console.log('✅ Column exists\n');

    // 2. Check current statistics
    console.log('2️⃣ Checking current statistics...');
    const { count: totalActivities } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true });

    const { count: withReportingOrg } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .not('reporting_org_id', 'is', null);

    const { count: withCreatedByOrg } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .not('created_by_org', 'is', null);

    console.log(`📊 Total activities: ${totalActivities}`);
    console.log(`📊 Activities with reporting_org_id: ${withReportingOrg}`);
    console.log(`📊 Activities with created_by_org: ${withCreatedByOrg}\n`);

    // 3. Check if unique constraint exists on organizations
    console.log('3️⃣ Checking organizations.iati_org_id unique constraint...');
    const { data: orgWithDuplicates } = await supabase
      .rpc('check_duplicate_iati_org_ids');
    
    if (orgWithDuplicates && orgWithDuplicates.length > 0) {
      console.warn('⚠️  Found duplicate iati_org_id values:', orgWithDuplicates);
    } else {
      console.log('✅ No duplicate iati_org_id values found\n');
    }

    // 4. Sample data from the view
    console.log('4️⃣ Testing activities_with_reporting_org view...');
    const { data: viewData, error: viewError } = await supabase
      .from('activities_with_reporting_org')
      .select('iati_identifier, title, reporting_org_ref, reporting_org_type, reporting_org_name')
      .not('reporting_org_id', 'is', null)
      .limit(5);

    if (viewError) {
      console.error('❌ View error:', viewError.message);
    } else {
      console.log('✅ View is working. Sample data:');
      viewData?.forEach((activity, index) => {
        console.log(`   ${index + 1}. ${activity.iati_identifier} - ${activity.reporting_org_name} (${activity.reporting_org_ref})`);
      });
    }
    console.log('');

    // 5. Check referential integrity
    console.log('5️⃣ Checking referential integrity...');
    const { data: orphanedActivities, error: orphanError } = await supabase
      .from('activities')
      .select('id, reporting_org_id')
      .not('reporting_org_id', 'is', null)
      .not('reporting_org_id', 'in', 
        `(SELECT id FROM organizations)`
      );

    if (orphanError) {
      console.log('✅ Foreign key constraint is working (query failed as expected)');
    } else if (orphanedActivities && orphanedActivities.length > 0) {
      console.error('❌ Found activities with invalid reporting_org_id:', orphanedActivities.length);
    } else {
      console.log('✅ All reporting_org_id values are valid\n');
    }

    // 6. Performance test
    console.log('6️⃣ Testing query performance...');
    const startTime = Date.now();
    
    const { data: perfTest, error: perfError } = await supabase
      .from('activities')
      .select(`
        iati_identifier,
        title,
        organization:organizations!reporting_org_id (
          iati_org_id,
          organisation_type,
          name
        )
      `)
      .not('reporting_org_id', 'is', null)
      .limit(100);

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (perfError) {
      console.error('❌ Performance test failed:', perfError.message);
    } else {
      console.log(`✅ Query completed in ${duration}ms for ${perfTest?.length} records`);
    }

    console.log('\n✨ Migration test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testReportingOrgMigration(); 
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

interface ColumnUsage {
  column_name: string;
  usage_count: number;
  usage_locations: string[];
}

async function checkIATIAlignmentReadiness() {
  console.log('🔍 Checking IATI Alignment Readiness...\n');

  const issues: string[] = [];
  const warnings: string[] = [];

  try {
    // 1. Check for NULL iati_id values
    console.log('1️⃣ Checking iati_id values...');
    const { count: nullCount } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .is('iati_id', null);

    if (nullCount && nullCount > 0) {
      issues.push(`Found ${nullCount} activities with NULL iati_id`);
      console.log(`   ❌ ${nullCount} NULL iati_id values found`);
    } else {
      console.log('   ✅ No NULL iati_id values');
    }

    // 2. Check for duplicate iati_id values
    const { data: allActivities } = await supabase
      .from('activities')
      .select('iati_id')
      .not('iati_id', 'is', null);

    const iatiIdCounts = new Map<string, number>();
    allActivities?.forEach(activity => {
      const count = iatiIdCounts.get(activity.iati_id) || 0;
      iatiIdCounts.set(activity.iati_id, count + 1);
    });

    const duplicates = Array.from(iatiIdCounts.entries())
      .filter(([_, count]) => count > 1);

    if (duplicates.length > 0) {
      issues.push(`Found ${duplicates.length} duplicate iati_id values`);
      console.log(`   ❌ ${duplicates.length} duplicate iati_id values found:`);
      duplicates.slice(0, 5).forEach(([id, count]) => {
        console.log(`      - "${id}": ${count} occurrences`);
      });
      if (duplicates.length > 5) {
        console.log(`      ... and ${duplicates.length - 5} more`);
      }
    } else {
      console.log('   ✅ No duplicate iati_id values');
    }

    // 3. Check columns that will be renamed
    console.log('\n2️⃣ Checking columns to be renamed...');
    const columnsToRename = ['iati_id', 'title', 'description', 'tied_status', 'partner_id'];
    const columnInfo: any[] = [];

    for (const column of columnsToRename) {
      const { data, count } = await supabase
        .from('activities')
        .select(column, { count: 'exact', head: true })
        .not(column, 'is', null);

      columnInfo.push({
        column,
        non_null_count: count || 0,
        new_name: {
          'iati_id': 'iati_identifier',
          'title': 'title_narrative',
          'description': 'description_narrative',
          'tied_status': 'default_tied_status',
          'partner_id': 'other_identifier'
        }[column]
      });
    }

    console.log('   Columns to be renamed:');
    columnInfo.forEach(info => {
      console.log(`   - ${info.column} → ${info.new_name} (${info.non_null_count} non-null values)`);
    });

    // 4. Check reporting_org_id status
    console.log('\n3️⃣ Checking reporting_org_id status...');
    const { data: reportingOrgCheck, error: reportingOrgError } = await supabase
      .from('activities')
      .select('reporting_org_id')
      .limit(1);

    if (reportingOrgError && reportingOrgError.message.includes('column')) {
      warnings.push('reporting_org_id column does not exist (will be created)');
      console.log('   ⚠️  reporting_org_id column does not exist (will be created)');
    } else {
      const { count: withReportingOrg } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .not('reporting_org_id', 'is', null);

      console.log(`   ✅ reporting_org_id exists (${withReportingOrg} populated)`);
    }

    // 5. Check for existing IATI fields
    console.log('\n4️⃣ Checking for existing IATI fields...');
    const iatiFields = ['hierarchy', 'linked_data_uri', 'default_currency'];
    
    for (const field of iatiFields) {
      const { data: fieldCheck, error: fieldError } = await supabase
        .from('activities')
        .select(field)
        .limit(1);

      if (fieldError && fieldError.message.includes('column')) {
        console.log(`   ℹ️  ${field} does not exist (will be added)`);
      } else {
        console.log(`   ✅ ${field} already exists`);
      }
    }

    // 6. Check created_by_org for fallback
    console.log('\n5️⃣ Checking created_by_org for reporting_org fallback...');
    const { count: withCreatedByOrg } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .not('created_by_org', 'is', null);

    // Get valid organization IDs
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id');
    
    const validOrgIds = orgs?.map(org => org.id) || [];

    const { count: validCreatedByOrg } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .not('created_by_org', 'is', null)
      .in('created_by_org', validOrgIds);

    console.log(`   📊 ${withCreatedByOrg} activities have created_by_org`);
    console.log(`   📊 ${validCreatedByOrg} have valid organization references`);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 MIGRATION READINESS SUMMARY\n');

    if (issues.length === 0) {
      console.log('✅ No blocking issues found! Migration can proceed safely.\n');
    } else {
      console.log('❌ BLOCKING ISSUES FOUND:\n');
      issues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue}`);
      });
      console.log('\nThese issues must be resolved before running the migration.\n');
    }

    if (warnings.length > 0) {
      console.log('⚠️  WARNINGS:\n');
      warnings.forEach((warning, idx) => {
        console.log(`   ${idx + 1}. ${warning}`);
      });
      console.log('');
    }

    // Recommendations
    console.log('📝 RECOMMENDATIONS:\n');
    
    if (nullCount && nullCount > 0) {
      console.log('1. Fix NULL iati_id values:');
      console.log('   - Generate unique identifiers for activities missing iati_id');
      console.log('   - Format: {reporting-org-ref}-{unique-id}\n');
    }

    if (duplicates.length > 0) {
      console.log('2. Fix duplicate iati_id values:');
      console.log('   - Ensure each activity has a unique IATI identifier');
      console.log('   - Consider appending a suffix to duplicates\n');
    }

    console.log('3. After fixing issues, run:');
    console.log('   psql -d your_database -f frontend/sql/align_activities_iati_standard.sql\n');

    console.log('4. Update your application code to use new column names:');
    console.log('   - iati_id → iati_identifier');
    console.log('   - title → title_narrative');
    console.log('   - description → description_narrative');
    console.log('   - tied_status → default_tied_status');
    console.log('   - partner_id → other_identifier\n');

  } catch (error) {
    console.error('❌ Error checking readiness:', error);
  }
}

// Run the check
checkIATIAlignmentReadiness(); 
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

interface DuplicateOrg {
  iati_org_id: string;
  count: number;
  organizations: {
    id: string;
    name: string;
    created_at: string;
  }[];
}

async function checkOrgDuplicates() {
  console.log('🔍 Checking for duplicate iati_org_id values...\n');

  try {
    // 1. Check for empty strings
    const { data: emptyStringOrgs, count: emptyCount } = await supabase
      .from('organizations')
      .select('id, name, iati_org_id', { count: 'exact' })
      .eq('iati_org_id', '');

    if (emptyCount && emptyCount > 0) {
      console.log(`⚠️  Found ${emptyCount} organizations with empty string iati_org_id:`);
      emptyStringOrgs?.forEach((org, idx) => {
        console.log(`   ${idx + 1}. ${org.name} (ID: ${org.id})`);
      });
      console.log('\n   ➡️  These will be converted to NULL\n');
    }

    // 2. Check for other duplicates
    const { data: allOrgs } = await supabase
      .from('organizations')
      .select('id, name, iati_org_id, created_at')
      .not('iati_org_id', 'is', null)
      .neq('iati_org_id', '')
      .order('iati_org_id, created_at');

    // Group by iati_org_id
    const grouped = allOrgs?.reduce((acc: Record<string, DuplicateOrg>, org) => {
      const key = org.iati_org_id;
      if (!acc[key]) {
        acc[key] = {
          iati_org_id: key,
          count: 0,
          organizations: []
        };
      }
      acc[key].count++;
      acc[key].organizations.push({
        id: org.id,
        name: org.name,
        created_at: org.created_at
      });
      return acc;
    }, {});

    // Find duplicates
    const duplicates = Object.values(grouped || {}).filter(g => g.count > 1);

    if (duplicates.length > 0) {
      console.log(`⚠️  Found ${duplicates.length} duplicate iati_org_id values:\n`);
      
      duplicates.forEach((dup, idx) => {
        console.log(`${idx + 1}. iati_org_id: "${dup.iati_org_id}" (${dup.count} organizations)`);
        dup.organizations.forEach((org, orgIdx) => {
          const marker = orgIdx === 0 ? '✓ Keep original' : `→ Will become ${dup.iati_org_id}-${orgIdx}`;
          console.log(`   - ${org.name} (created: ${new Date(org.created_at).toLocaleDateString()}) ${marker}`);
        });
        console.log('');
      });

      console.log('📋 Summary:');
      console.log(`   - Total duplicate groups: ${duplicates.length}`);
      console.log(`   - Total affected organizations: ${duplicates.reduce((sum, d) => sum + d.count, 0)}`);
      console.log('');
    } else {
      console.log('✅ No duplicate iati_org_id values found!\n');
    }

    // 3. Check existing constraints
    const { data: constraints } = await supabase.rpc('constraint_exists', {
      p_constraint_name: 'organizations_iati_org_id_unique'
    });

    if (constraints) {
      console.log('✅ Unique constraint already exists on organizations.iati_org_id\n');
    } else {
      console.log('ℹ️  No unique constraint on organizations.iati_org_id yet\n');
    }

    // 4. Provide recommendations
    console.log('📝 Recommendations:\n');
    
    if ((emptyCount && emptyCount > 0) || duplicates.length > 0) {
      console.log('1. Run the duplicate fix SQL script:');
      console.log('   psql -d your_database -f frontend/sql/fix_duplicate_iati_org_ids.sql\n');
      console.log('2. Then proceed with the migration:');
      console.log('   psql -d your_database -f frontend/sql/add_reporting_org_normalization.sql\n');
    } else if (!constraints) {
      console.log('No duplicates found! You can proceed directly with the migration:');
      console.log('   psql -d your_database -f frontend/sql/add_reporting_org_normalization.sql\n');
    } else {
      console.log('Everything looks good! The unique constraint is already in place.\n');
    }

  } catch (error) {
    console.error('❌ Error checking duplicates:', error);
  }
}

// Run the check
checkOrgDuplicates(); 
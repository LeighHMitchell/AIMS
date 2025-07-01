#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Not set');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findBlessTransactions() {
  console.log('🔍 Searching for Bless organisation and related transactions...\n');

  try {
    // Step 1: Find Bless organization
    console.log('Step 1: Looking for Bless organization...');
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, type, country')
      .or('name.ilike.%bless%');

    if (orgError) {
      console.error('Error fetching organizations:', orgError);
      return;
    }

    if (!organizations || organizations.length === 0) {
      console.log('❌ No organization found with "Bless" in the name');
      console.log('\nTrying exact name match...');
      
      // Try exact match
      const { data: exactOrg, error: exactError } = await supabase
        .from('organizations')
        .select('id, name, type, country')
        .eq('name', 'Bless');
      
      if (exactOrg && exactOrg.length > 0) {
        organizations.push(...exactOrg);
      } else {
        console.log('❌ No exact match found either');
        return;
      }
    }

    console.log(`✅ Found ${organizations.length} organization(s):`);
    organizations.forEach(org => {
      console.log(`   - ${org.name} (ID: ${org.id}, Type: ${org.type}, Country: ${org.country})`);
    });

    // Step 2: Search for transactions
    console.log('\nStep 2: Searching for transactions...');
    
    for (const org of organizations) {
      console.log(`\n📊 Transactions for "${org.name}" (${org.id}):`);
      
      // Search by organization_id (UUID)
      console.log('\n  A. Searching by organization_id...');
      const { data: txByOrgId, error: txOrgIdError } = await supabase
        .from('transactions')
        .select(`
          uuid,
          activity_id,
          transaction_type,
          transaction_date,
          value,
          currency,
          description,
          provider_org_id,
          receiver_org_id,
          provider_org_name,
          receiver_org_name,
          created_at
        `)
        .or(`provider_org_id.eq.${org.id},receiver_org_id.eq.${org.id}`)
        .order('transaction_date', { ascending: false })
        .limit(10);

      if (txOrgIdError) {
        console.error('  Error fetching by org ID:', txOrgIdError);
      } else if (txByOrgId && txByOrgId.length > 0) {
        console.log(`  ✅ Found ${txByOrgId.length} transaction(s) by organization_id`);
        txByOrgId.forEach((tx, idx) => {
          console.log(`\n  Transaction ${idx + 1}:`);
          console.log(`    ID: ${tx.uuid}`);
          console.log(`    Type: ${tx.transaction_type}`);
          console.log(`    Date: ${tx.transaction_date}`);
          console.log(`    Value: ${tx.value} ${tx.currency}`);
          console.log(`    Activity: ${tx.activity_id}`);
          console.log(`    Role: ${tx.provider_org_id === org.id ? 'Provider' : 'Receiver'}`);
          if (tx.description) console.log(`    Description: ${tx.description}`);
        });
      } else {
        console.log('  ❌ No transactions found by organization_id');
      }

      // Search by organization name
      console.log('\n  B. Searching by organization name...');
      const { data: txByName, error: txNameError } = await supabase
        .from('transactions')
        .select(`
          uuid,
          activity_id,
          transaction_type,
          transaction_date,
          value,
          currency,
          description,
          provider_org_name,
          receiver_org_name,
          created_at
        `)
        .or(`provider_org_name.ilike.%${org.name}%,receiver_org_name.ilike.%${org.name}%`)
        .order('transaction_date', { ascending: false })
        .limit(10);

      if (txNameError) {
        console.error('  Error fetching by name:', txNameError);
      } else if (txByName && txByName.length > 0) {
        console.log(`  ✅ Found ${txByName.length} transaction(s) by organization name`);
        txByName.forEach((tx, idx) => {
          console.log(`\n  Transaction ${idx + 1}:`);
          console.log(`    ID: ${tx.uuid}`);
          console.log(`    Type: ${tx.transaction_type}`);
          console.log(`    Date: ${tx.transaction_date}`);
          console.log(`    Value: ${tx.value} ${tx.currency}`);
          console.log(`    Activity: ${tx.activity_id}`);
          console.log(`    Provider: ${tx.provider_org_name || 'N/A'}`);
          console.log(`    Receiver: ${tx.receiver_org_name || 'N/A'}`);
          if (tx.description) console.log(`    Description: ${tx.description}`);
        });
      } else {
        console.log('  ❌ No transactions found by organization name');
      }
    }

    // Step 3: Get activity details for found transactions
    console.log('\n\nStep 3: Getting activity details for transactions...');
    
    // Collect unique activity IDs from all transactions
    const activityIds = new Set<string>();
    
    for (const org of organizations) {
      const { data: allTx } = await supabase
        .from('transactions')
        .select('activity_id')
        .or(`provider_org_id.eq.${org.id},receiver_org_id.eq.${org.id},provider_org_name.ilike.%${org.name}%,receiver_org_name.ilike.%${org.name}%`);
      
      if (allTx) {
        allTx.forEach(tx => {
          if (tx.activity_id) activityIds.add(tx.activity_id);
        });
      }
    }

    if (activityIds.size > 0) {
      console.log(`\n📋 Found ${activityIds.size} unique activities with Bless transactions:`);
      
      const { data: activities, error: actError } = await supabase
        .from('activities')
        .select('id, title, iati_id, activity_status, start_date, end_date')
        .in('id', Array.from(activityIds))
        .limit(10);

      if (actError) {
        console.error('Error fetching activities:', actError);
      } else if (activities) {
        activities.forEach(activity => {
          console.log(`\n  Activity: ${activity.title || 'Untitled'}`);
          console.log(`    ID: ${activity.id}`);
          console.log(`    IATI ID: ${activity.iati_id || 'N/A'}`);
          console.log(`    Status: ${activity.activity_status}`);
          console.log(`    Period: ${activity.start_date} to ${activity.end_date}`);
        });
      }
    }

    // Step 4: Summary statistics
    console.log('\n\n📊 Summary Statistics:');
    
    for (const org of organizations) {
      const { count: providerCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .or(`provider_org_id.eq.${org.id},provider_org_name.ilike.%${org.name}%`);
      
      const { count: receiverCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .or(`receiver_org_id.eq.${org.id},receiver_org_name.ilike.%${org.name}%`);
      
      console.log(`\n  ${org.name}:`);
      console.log(`    As Provider: ${providerCount || 0} transactions`);
      console.log(`    As Receiver: ${receiverCount || 0} transactions`);
      console.log(`    Total: ${(providerCount || 0) + (receiverCount || 0)} transactions`);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the script
findBlessTransactions().catch(console.error);
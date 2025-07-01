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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function searchAllBlessReferences() {
  console.log('🔍 Comprehensive search for any Bless references in the system...\n');

  try {
    // 1. Check all organization name fields
    console.log('1. Searching all transaction organization name fields...');
    const { data: nameTransactions, error: nameError } = await supabase
      .from('transactions')
      .select('uuid, provider_org_name, receiver_org_name, provider_org_ref, receiver_org_ref, value, currency, transaction_date')
      .or('provider_org_name.ilike.%bless%,receiver_org_name.ilike.%bless%,provider_org_ref.ilike.%bless%,receiver_org_ref.ilike.%bless%')
      .limit(20);

    if (!nameError && nameTransactions && nameTransactions.length > 0) {
      console.log(`✅ Found ${nameTransactions.length} transactions with "bless" in organization names:`);
      nameTransactions.forEach(tx => {
        console.log(`\n  UUID: ${tx.uuid}`);
        console.log(`  Provider: ${tx.provider_org_name || tx.provider_org_ref || 'N/A'}`);
        console.log(`  Receiver: ${tx.receiver_org_name || tx.receiver_org_ref || 'N/A'}`);
        console.log(`  Value: ${tx.value} ${tx.currency}`);
        console.log(`  Date: ${tx.transaction_date}`);
      });
    } else {
      console.log('❌ No transactions found with "bless" in organization names');
    }

    // 2. Check description field
    console.log('\n2. Searching transaction descriptions...');
    const { data: descTransactions, error: descError } = await supabase
      .from('transactions')
      .select('uuid, description, value, currency, transaction_date')
      .ilike('description', '%bless%')
      .limit(10);

    if (!descError && descTransactions && descTransactions.length > 0) {
      console.log(`✅ Found ${descTransactions.length} transactions with "bless" in description:`);
      descTransactions.forEach(tx => {
        console.log(`\n  UUID: ${tx.uuid}`);
        console.log(`  Description: ${tx.description}`);
        console.log(`  Value: ${tx.value} ${tx.currency}`);
        console.log(`  Date: ${tx.transaction_date}`);
      });
    } else {
      console.log('❌ No transactions found with "bless" in description');
    }

    // 3. Check activities that might be related to Bless
    console.log('\n3. Searching activities related to Bless...');
    const { data: activities, error: actError } = await supabase
      .from('activities')
      .select('id, title, description, created_by_org')
      .or('title.ilike.%bless%,description.ilike.%bless%')
      .limit(10);

    if (!actError && activities && activities.length > 0) {
      console.log(`✅ Found ${activities.length} activities mentioning "bless":`);
      activities.forEach(act => {
        console.log(`\n  ID: ${act.id}`);
        console.log(`  Title: ${act.title}`);
        console.log(`  Created by: ${act.created_by_org}`);
      });
    } else {
      console.log('❌ No activities found mentioning "bless"');
    }

    // 4. Check if Bless created any activities
    console.log('\n4. Checking activities created by Bless organization...');
    const blessOrgId = '684ed2f8-a80d-4d4c-9a28-79072dc53058';
    const { data: blessActivities, error: blessActError } = await supabase
      .from('activities')
      .select('id, title, activity_status, start_date, end_date')
      .eq('created_by_org', blessOrgId)
      .limit(10);

    if (!blessActError && blessActivities && blessActivities.length > 0) {
      console.log(`✅ Found ${blessActivities.length} activities created by Bless:`);
      blessActivities.forEach(act => {
        console.log(`\n  ID: ${act.id}`);
        console.log(`  Title: ${act.title}`);
        console.log(`  Status: ${act.activity_status}`);
        console.log(`  Period: ${act.start_date} to ${act.end_date}`);
      });

      // Check transactions for these activities
      const activityIds = blessActivities.map(a => a.id);
      const { data: relatedTx, error: relTxError } = await supabase
        .from('transactions')
        .select('uuid, activity_id, transaction_type, value, currency, provider_org_name, receiver_org_name')
        .in('activity_id', activityIds)
        .limit(20);

      if (!relTxError && relatedTx && relatedTx.length > 0) {
        console.log(`\n  📊 Found ${relatedTx.length} transactions in Bless activities:`);
        relatedTx.forEach(tx => {
          console.log(`\n    Transaction: ${tx.uuid}`);
          console.log(`    Type: ${tx.transaction_type}`);
          console.log(`    Value: ${tx.value} ${tx.currency}`);
          console.log(`    Provider: ${tx.provider_org_name || 'N/A'}`);
          console.log(`    Receiver: ${tx.receiver_org_name || 'N/A'}`);
        });
      }
    } else {
      console.log('❌ No activities found created by Bless');
    }

    // 5. Check activity contributors
    console.log('\n5. Checking if Bless is a contributor to any activities...');
    const { data: contributions, error: contribError } = await supabase
      .from('activity_contributors')
      .select('activity_id, status')
      .eq('organization_id', blessOrgId)
      .limit(10);

    if (!contribError && contributions && contributions.length > 0) {
      console.log(`✅ Found ${contributions.length} activities where Bless is a contributor`);
      
      // Get activity details
      const contribActivityIds = contributions.map(c => c.activity_id);
      const { data: contribActivities } = await supabase
        .from('activities')
        .select('id, title')
        .in('id', contribActivityIds);

      if (contribActivities) {
        contribActivities.forEach(act => {
          console.log(`\n  Activity: ${act.title} (${act.id})`);
        });
      }
    } else {
      console.log('❌ Bless is not a contributor to any activities');
    }

    // 6. Raw query to double-check
    console.log('\n6. Getting raw transaction count...');
    const { count: totalTx } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\nℹ️  Total transactions in database: ${totalTx || 0}`);

    // Sample a few transactions to see the data pattern
    const { data: sampleTx } = await supabase
      .from('transactions')
      .select('provider_org_name, receiver_org_name, provider_org_id, receiver_org_id')
      .limit(5);

    if (sampleTx && sampleTx.length > 0) {
      console.log('\nSample of organization references in transactions:');
      sampleTx.forEach((tx, idx) => {
        console.log(`\n  Transaction ${idx + 1}:`);
        console.log(`    Provider: ${tx.provider_org_name || 'N/A'} (ID: ${tx.provider_org_id || 'N/A'})`);
        console.log(`    Receiver: ${tx.receiver_org_name || 'N/A'} (ID: ${tx.receiver_org_id || 'N/A'})`);
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the script
searchAllBlessReferences().catch(console.error);
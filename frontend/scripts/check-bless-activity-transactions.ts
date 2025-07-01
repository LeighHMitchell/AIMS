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

async function checkBlessActivityTransactions() {
  const activityId = '2d1315a1-98d7-4d0c-9931-d748a96e276e';
  const blessOrgId = '684ed2f8-a80d-4d4c-9a28-79072dc53058';
  
  console.log('🔍 Checking transactions for activity where Bless is a contributor...\n');
  
  // Get activity details
  const { data: activity, error: actError } = await supabase
    .from('activities')
    .select('*')
    .eq('id', activityId)
    .single();
    
  if (activity) {
    console.log('Activity Details:');
    console.log(`  Title: ${activity.title}`);
    console.log(`  IATI ID: ${activity.iati_id || 'N/A'}`);
    console.log(`  Status: ${activity.activity_status}`);
    console.log(`  Created by: ${activity.created_by_org}`);
    console.log(`  Period: ${activity.start_date} to ${activity.end_date}`);
  }
  
  // Get all transactions for this activity
  console.log('\n📊 Transactions for this activity:');
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('activity_id', activityId)
    .order('transaction_date', { ascending: false });
    
  if (txError) {
    console.error('Error fetching transactions:', txError);
    return;
  }
  
  if (!transactions || transactions.length === 0) {
    console.log('❌ No transactions found for this activity');
    return;
  }
  
  console.log(`✅ Found ${transactions.length} transactions:`);
  
  let blessAsProvider = 0;
  let blessAsReceiver = 0;
  let blessInName = 0;
  
  transactions.forEach((tx, idx) => {
    console.log(`\n Transaction ${idx + 1}:`);
    console.log(`   UUID: ${tx.uuid}`);
    console.log(`   Type: ${tx.transaction_type}`);
    console.log(`   Date: ${tx.transaction_date}`);
    console.log(`   Value: ${tx.value} ${tx.currency}`);
    console.log(`   Provider ID: ${tx.provider_org_id || 'N/A'}`);
    console.log(`   Provider Name: ${tx.provider_org_name || 'N/A'}`);
    console.log(`   Receiver ID: ${tx.receiver_org_id || 'N/A'}`);
    console.log(`   Receiver Name: ${tx.receiver_org_name || 'N/A'}`);
    
    // Check if Bless is involved
    if (tx.provider_org_id === blessOrgId) {
      console.log(`   ✅ BLESS IS PROVIDER (by ID)`);
      blessAsProvider++;
    }
    if (tx.receiver_org_id === blessOrgId) {
      console.log(`   ✅ BLESS IS RECEIVER (by ID)`);
      blessAsReceiver++;
    }
    if (tx.provider_org_name?.toLowerCase().includes('bless') || 
        tx.receiver_org_name?.toLowerCase().includes('bless')) {
      console.log(`   ✅ BLESS IN NAME FIELD`);
      blessInName++;
    }
    
    if (tx.description) {
      console.log(`   Description: ${tx.description}`);
    }
  });
  
  console.log('\n📊 Summary:');
  console.log(`  Total transactions: ${transactions.length}`);
  console.log(`  Bless as Provider (by ID): ${blessAsProvider}`);
  console.log(`  Bless as Receiver (by ID): ${blessAsReceiver}`);
  console.log(`  Bless mentioned in name fields: ${blessInName}`);
  
  // Check all contributors to this activity
  console.log('\n👥 All contributors to this activity:');
  const { data: contributors, error: contribError } = await supabase
    .from('activity_contributors')
    .select('organization_id, status')
    .eq('activity_id', activityId);
    
  if (contributors && contributors.length > 0) {
    // Get organization details
    const orgIds = contributors.map(c => c.organization_id);
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name')
      .in('id', orgIds);
      
    contributors.forEach(contrib => {
      const org = orgs?.find(o => o.id === contrib.organization_id);
      console.log(`  - ${org?.name || 'Unknown'} (${contrib.organization_id}) - Status: ${contrib.status}`);
    });
  }
}

// Run the script
checkBlessActivityTransactions().catch(console.error);
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugCalculationLogic() {
  console.log('🐛 Debugging the exact calculation logic from Partners API...');

  try {
    const afdOrgId = '16e93614-2437-4649-b932-9cc35458c444';
    
    // Step 1: Get AFD org details exactly like Partners API
    const { data: afdOrg } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', afdOrgId)
      .single();

    console.log('AFD org details:', {
      id: afdOrg.id,
      name: afdOrg.name,
      acronym: afdOrg.acronym
    });

    // Step 2: Get transactions exactly like Partners API (transaction types for disbursements)
    const transactionTypeCodes = ['3', '4']; // Disbursements
    
    const { data: transactions } = await supabase
      .from('transactions')
      .select('activity_id, provider_org_id, receiver_org_id, provider_org_name, receiver_org_name, value, transaction_date, value_usd, transaction_type')
      .in('transaction_type', transactionTypeCodes);

    console.log(`\nTotal disbursement transactions: ${transactions?.length || 0}`);

    // Step 3: Replicate the exact yearly calculation logic from Partners API
    const years = [2022, 2023, 2024, 2025, 2026, 2027];
    const financialData: Record<string, number> = {};
    
    // Initialize all years with 0
    years.forEach(year => {
      financialData[year.toString()] = 0;
    });

    console.log('\n🔢 Replicating Partners API calculation logic...');

    // Calculate yearly totals by aggregating transactions where this organization is involved
    years.forEach(year => {
      console.log(`\n--- Processing year ${year} ---`);
      
      const yearTotal = (transactions || []).reduce((sum: number, trans: any) => {
        // Check if transaction has a date
        if (!trans.transaction_date) {
          console.log(`   ❌ Transaction skipped: no date`);
          return sum;
        }
        
        try {
          const transYear = new Date(trans.transaction_date).getFullYear();
          
          // Check if this transaction is for the current year
          if (transYear !== year) {
            return sum; // Don't log non-matching years to reduce noise
          }
          
          console.log(`   📅 Transaction for ${year}: ${trans.transaction_date}`);
          console.log(`      Type: ${trans.transaction_type}`);
          console.log(`      Value: ${trans.value} (USD: ${trans.value_usd})`);
          console.log(`      Provider ID: ${trans.provider_org_id}`);
          console.log(`      Provider Name: ${trans.provider_org_name}`);
          console.log(`      Receiver ID: ${trans.receiver_org_id}`);
          console.log(`      Receiver Name: ${trans.receiver_org_name}`);
          
          // Check if this organization is involved in the transaction
          // For disbursements: organization can be provider or receiver
          let isInvolved = false;
          const isProvider = trans.provider_org_id === afdOrg.id || trans.provider_org_name === afdOrg.name;
          const isReceiver = trans.receiver_org_id === afdOrg.id || trans.receiver_org_name === afdOrg.name;
          
          console.log(`      AFD is provider: ${isProvider} (${trans.provider_org_id} === ${afdOrg.id} || ${trans.provider_org_name} === ${afdOrg.name})`);
          console.log(`      AFD is receiver: ${isReceiver} (${trans.receiver_org_id} === ${afdOrg.id} || ${trans.receiver_org_name} === ${afdOrg.name})`);
          
          isInvolved = isProvider || isReceiver;
          
          console.log(`      Is AFD involved: ${isInvolved}`);
          
          if (isInvolved) {
            // Use USD value if available, otherwise use original value
            const transValue = trans.value_usd || trans.value;
            const amount = (typeof transValue === 'number' && !isNaN(transValue)) ? transValue : 0;
            console.log(`      ✅ Adding amount: $${amount.toLocaleString()}`);
            return sum + amount;
          }
          
          console.log(`      ❌ Not adding (AFD not involved)`);
          return sum;
        } catch (dateError) {
          console.warn('Invalid transaction date:', trans.transaction_date);
          return sum;
        }
      }, 0);
      
      financialData[year.toString()] = yearTotal;
      console.log(`   🎯 Year ${year} total: $${yearTotal.toLocaleString()}`);
    });

    console.log('\n📋 Final AFD yearly totals:');
    Object.entries(financialData).forEach(([year, amount]) => {
      const marker = year === '2025' ? ' ⭐ EXPECTED: $1,000,000' : '';
      console.log(`   ${year}: $${amount.toLocaleString()}${marker}`);
    });

    // Check specific transaction details
    console.log('\n🔍 Checking our specific transaction in detail...');
    const ourTransaction = transactions?.find(t => 
      t.transaction_date === '2025-08-22' && 
      (t.provider_org_id === afdOrgId || t.provider_org_name === 'AFD')
    );

    if (ourTransaction) {
      console.log('Found our transaction:');
      console.log(`   Date: ${ourTransaction.transaction_date}`);
      console.log(`   Value: ${ourTransaction.value}`);
      console.log(`   Value USD: ${ourTransaction.value_usd}`);
      console.log(`   Type: ${ourTransaction.transaction_type}`);
      console.log(`   Provider ID: ${ourTransaction.provider_org_id}`);
      console.log(`   Provider Name: ${ourTransaction.provider_org_name}`);
    } else {
      console.log('❌ Our transaction not found in API results!');
    }

  } catch (error) {
    console.error('Error testing Partners API:', error);
  }
}

// Run the script
testPartnersAPIDirect();

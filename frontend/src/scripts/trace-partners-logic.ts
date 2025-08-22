import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function tracePartnersLogic() {
  console.log('🔍 Tracing Partners API logic step by step...');

  try {
    const afdOrgId = '16e93614-2437-4649-b932-9cc35458c444';
    const transactionType: 'C' | 'D' = 'D'; // Disbursements
    
    // Step 1: Get AFD organization (exactly like Partners API)
    const { data: organizations } = await supabase
      .from('organizations')
      .select('*')
      .order('name');

    const afdOrg = organizations?.find(org => org.id === afdOrgId);
    console.log('\n1️⃣ AFD Organization found:', {
      id: afdOrg?.id,
      name: afdOrg?.name,
      acronym: afdOrg?.acronym
    });

    // Step 2: Get transactions (exactly like Partners API)
    const transactionTypeCodes = transactionType === 'C' ? ['1', '2', '11'] : ['3', '4'];
    console.log('\n2️⃣ Transaction type codes for disbursements:', transactionTypeCodes);
    
    const { data: transactions } = await supabase
      .from('transactions')
      .select('activity_id, provider_org_id, receiver_org_id, provider_org_name, receiver_org_name, value, transaction_date, value_usd, transaction_type')
      .in('transaction_type', transactionTypeCodes);

    console.log(`   Total transactions found: ${transactions?.length || 0}`);

    // Step 3: Filter transactions involving AFD
    console.log('\n3️⃣ Filtering AFD transactions...');
    
    const afdTransactions = transactions?.filter(trans => {
      const isProvider = trans.provider_org_id === afdOrg?.id || trans.provider_org_name === afdOrg?.name;
      const isReceiver = trans.receiver_org_id === afdOrg?.id || trans.receiver_org_name === afdOrg?.name;
      const isInvolved = isProvider || isReceiver;
      
      if (isInvolved) {
        console.log(`   ✅ AFD transaction found:`);
        console.log(`      Date: ${trans.transaction_date}`);
        console.log(`      Type: ${trans.transaction_type}`);
        console.log(`      Value: ${trans.value}`);
        console.log(`      Value USD: ${trans.value_usd}`);
        console.log(`      Provider ID: ${trans.provider_org_id} (matches AFD: ${trans.provider_org_id === afdOrg?.id})`);
        console.log(`      Provider Name: ${trans.provider_org_name} (matches AFD: ${trans.provider_org_name === afdOrg?.name})`);
        console.log(`      Receiver ID: ${trans.receiver_org_id} (matches AFD: ${trans.receiver_org_id === afdOrg?.id})`);
        console.log(`      Receiver Name: ${trans.receiver_org_name} (matches AFD: ${trans.receiver_org_name === afdOrg?.name})`);
      }
      
      return isInvolved;
    }) || [];

    console.log(`   AFD transactions count: ${afdTransactions.length}`);

    // Step 4: Calculate 2025 total (exactly like Partners API)
    console.log('\n4️⃣ Calculating 2025 total...');
    
    const year2025Total = (transactions || []).reduce((sum: number, trans: any) => {
      if (!trans.transaction_date) {
        return sum;
      }
      
      try {
        const transYear = new Date(trans.transaction_date).getFullYear();
        if (transYear !== 2025) {
          return sum;
        }
        
        console.log(`   📅 Processing 2025 transaction: ${trans.transaction_date}`);
        console.log(`      Type: ${trans.transaction_type}`);
        console.log(`      Value: ${trans.value} (USD: ${trans.value_usd})`);
        
        // Check if this organization is involved in the transaction
        // For disbursements: organization can be provider or receiver
        let isInvolved = false;
        if (transactionType === 'C') {
          // For commitments, only count if organization is the provider
          isInvolved = trans.provider_org_id === afdOrg?.id || trans.provider_org_name === afdOrg?.name;
        } else {
          // For disbursements, count if organization is provider or receiver
          isInvolved = trans.provider_org_id === afdOrg?.id || 
                      trans.receiver_org_id === afdOrg?.id ||
                      trans.provider_org_name === afdOrg?.name || 
                      trans.receiver_org_name === afdOrg?.name;
        }
        
        console.log(`      Provider match: ${trans.provider_org_id === afdOrg?.id} (${trans.provider_org_id} === ${afdOrg?.id})`);
        console.log(`      Provider name match: ${trans.provider_org_name === afdOrg?.name} (${trans.provider_org_name} === ${afdOrg?.name})`);
        console.log(`      Receiver match: ${trans.receiver_org_id === afdOrg?.id} (${trans.receiver_org_id} === ${afdOrg?.id})`);
        console.log(`      Receiver name match: ${trans.receiver_org_name === afdOrg?.name} (${trans.receiver_org_name} === ${afdOrg?.name})`);
        console.log(`      Is involved: ${isInvolved}`);
        
        if (isInvolved) {
          // Use USD value if available, otherwise use original value
          const transValue = trans.value_usd || trans.value;
          const amount = (typeof transValue === 'number' && !isNaN(transValue)) ? transValue : 0;
          console.log(`      ✅ Adding to sum: $${amount.toLocaleString()}`);
          return sum + amount;
        }
        
        console.log(`      ❌ Not adding (not involved)`);
        return sum;
      } catch (dateError) {
        console.warn('Invalid transaction date:', trans.transaction_date);
        return sum;
      }
    }, 0);
    
    console.log(`\n🎯 Final 2025 total: $${year2025Total.toLocaleString()}`);

    if (year2025Total === 1000000) {
      console.log('✅ Calculation is working correctly!');
    } else {
      console.log('❌ Calculation is not working. Expected $1,000,000');
    }

  } catch (error) {
    console.error('Error in trace script:', error);
  }
}

// Run the script
tracePartnersLogic();

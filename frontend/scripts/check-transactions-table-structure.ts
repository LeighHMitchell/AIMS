import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTransactionsStructure() {
  console.log('🔍 Checking transactions table structure...\n');
  
  try {
    // Get table columns
    const { data: columns, error } = await supabase
      .from('transactions')
      .select('*')
      .limit(0);
    
    if (error) {
      console.error('❌ Error checking table structure:', error);
      return;
    }
    
    // Get a sample transaction to see actual columns
    const { data: sample, error: sampleError } = await supabase
      .from('transactions')
      .select('*')
      .limit(1)
      .single();
    
    if (sample) {
      console.log('📋 Transactions table columns:');
      Object.keys(sample).forEach(col => {
        console.log(`   - ${col}: ${typeof sample[col]} (${sample[col] === null ? 'null' : 'has value'})`);
      });
      
      console.log('\n📄 Sample transaction:');
      console.log(JSON.stringify(sample, null, 2));
    }
    
    // Check specific columns that might be org-related
    console.log('\n🔎 Checking for organization-related columns...');
    const orgColumns = ['organization_id', 'provider_org_id', 'receiver_org_id', 'provider_org', 'receiver_org'];
    
    if (sample) {
      orgColumns.forEach(col => {
        if (col in sample) {
          console.log(`   ✅ ${col} exists`);
        } else {
          console.log(`   ❌ ${col} does NOT exist`);
        }
      });
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

checkTransactionsStructure();
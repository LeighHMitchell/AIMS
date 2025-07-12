import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSpecificActivity() {
  console.log('🔍 Checking "The Kibera Food Security Initiative" activity...\n');
  
  // Find the activity
  const { data: activities, error: activitiesError } = await supabase
    .from('activities')
    .select('*')
    .ilike('title_narrative', '%Kibera%');
  
  if (activitiesError || !activities || activities.length === 0) {
    console.log('❌ Could not find Kibera activity');
    return;
  }
  
  const activity = activities[0];
  console.log('✅ Found activity:', {
    id: activity.id,
    title: activity.title_narrative
  });
  
  // Check transaction summaries for this activity
  const { data: summary, error: summaryError } = await supabase
    .from('activity_transaction_summaries')
    .select('*')
    .eq('activity_id', activity.id)
    .single();
  
  if (summaryError) {
    console.log('❌ Error getting summary:', summaryError.message);
  } else {
    console.log('📊 Transaction summary:', summary);
  }
  
  // Check actual transactions
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('activity_id', activity.id);
  
  if (txError) {
    console.log('❌ Error getting transactions:', txError.message);
  } else {
    console.log(`💰 Found ${transactions?.length || 0} transactions:`);
    transactions?.forEach((tx, i) => {
      console.log(`   ${i + 1}. Type: ${tx.transaction_type}, Value: $${tx.value}, Status: ${tx.status}`);
    });
  }
}

checkSpecificActivity();
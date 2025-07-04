import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testActivityUpdate() {
  const activityId = 'fa161586-8076-4c55-93e7-78e1a05e258c';
  
  console.log('Testing activity update with default values...\n');

  try {
    // First, check current state
    const { data: currentActivity, error: fetchError } = await supabase
      .from('activities')
      .select('title_narrative, default_aid_type, default_finance_type, default_currency, default_flow_type')
      .eq('id', activityId)
      .single();

    if (fetchError) {
      console.error('Error fetching activity:', fetchError);
      return;
    }

    console.log('Current activity state:');
    console.log(`Title: ${currentActivity.title_narrative}`);
    console.log(`Default Aid Type: ${currentActivity.default_aid_type || 'null'}`);
    console.log(`Default Finance Type: ${currentActivity.default_finance_type || 'null'}`);
    console.log(`Default Currency: ${currentActivity.default_currency || 'null'}`);
    console.log(`Default Flow Type: ${currentActivity.default_flow_type || 'null'}`);

    // Now let's try to update with test values
    console.log('\nUpdating with test values...');
    
    const updateData = {
      default_aid_type: 'B01',
      default_finance_type: '110',
      default_currency: 'USD',
      default_flow_type: '10'
    };

    const { data: updatedActivity, error: updateError } = await supabase
      .from('activities')
      .update(updateData)
      .eq('id', activityId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating activity:', updateError);
      return;
    }

    console.log('\nActivity updated successfully!');
    console.log('New values:');
    console.log(`Default Aid Type: ${updatedActivity.default_aid_type}`);
    console.log(`Default Finance Type: ${updatedActivity.default_finance_type}`);
    console.log(`Default Currency: ${updatedActivity.default_currency}`);
    console.log(`Default Flow Type: ${updatedActivity.default_flow_type}`);

    // Verify the update persisted
    console.log('\nVerifying update persisted...');
    const { data: verifyActivity, error: verifyError } = await supabase
      .from('activities')
      .select('default_aid_type, default_finance_type, default_currency, default_flow_type')
      .eq('id', activityId)
      .single();

    if (verifyError) {
      console.error('Error verifying update:', verifyError);
      return;
    }

    console.log('Verified values:');
    console.log(`Default Aid Type: ${verifyActivity.default_aid_type}`);
    console.log(`Default Finance Type: ${verifyActivity.default_finance_type}`);
    console.log(`Default Currency: ${verifyActivity.default_currency}`);
    console.log(`Default Flow Type: ${verifyActivity.default_flow_type}`);

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testActivityUpdate(); 
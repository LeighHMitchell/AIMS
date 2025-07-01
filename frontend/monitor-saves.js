// Monitor script to watch for activity saves
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 Monitoring activity saves...');
console.log('This script will show all activities created/updated in real-time\n');

let lastCheck = new Date();

async function checkForNewActivities() {
  try {
    // Get activities modified since last check
    const { data: activities, error } = await supabase
      .from('activities')
      .select('id, title, created_at, updated_at, activity_status, publication_status')
      .or(`created_at.gte.${lastCheck.toISOString()},updated_at.gte.${lastCheck.toISOString()}`)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error checking activities:', error);
      return;
    }

    if (activities && activities.length > 0) {
      console.log(`\n🆕 Found ${activities.length} new/updated activities:`);
      activities.forEach(activity => {
        const isNew = new Date(activity.created_at) >= lastCheck;
        console.log(`${isNew ? '✨ NEW' : '📝 UPDATED'}: ${activity.title}`);
        console.log(`   ID: ${activity.id}`);
        console.log(`   Status: ${activity.activity_status} | Publication: ${activity.publication_status}`);
        console.log(`   Created: ${activity.created_at}`);
        console.log(`   Updated: ${activity.updated_at}`);
        console.log('---');
      });
    }

    lastCheck = new Date();
  } catch (error) {
    console.error('Error:', error);
  }
}

// Check every 2 seconds
setInterval(checkForNewActivities, 2000);

console.log('Monitoring started. Try saving an activity in your browser...');
console.log('Press Ctrl+C to stop monitoring.\n'); 
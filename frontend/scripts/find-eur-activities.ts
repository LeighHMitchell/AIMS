import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findActivities() {
  // Get EUR planned disbursements
  const { data: disbursements, error } = await supabase
    .from('planned_disbursements')
    .select('activity_id, amount, currency')
    .eq('currency', 'EUR')
    .is('usd_amount', null);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const activityIds = [...new Set(disbursements?.map(d => d.activity_id))];

  // Get activity titles
  const { data: activities, error: actError } = await supabase
    .from('activities')
    .select('id, title')
    .in('id', activityIds);

  if (actError) {
    console.error('Error:', actError);
    return;
  }

  console.log('Activities with EUR planned disbursements needing conversion:\n');
  activities?.forEach(activity => {
    console.log(`- ${activity.title} (ID: ${activity.id})`);
  });
}

findActivities();

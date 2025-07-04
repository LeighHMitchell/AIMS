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

async function checkActivityDefaults() {
  console.log('Checking activity default values in Supabase...\n');

  try {
    // First, let's check what columns exist in the activities table
    const { data: columns, error: columnsError } = await supabase
      .from('activities')
      .select('*')
      .limit(0);

    if (columnsError) {
      console.error('Error checking table structure:', columnsError);
      return;
    }

    // Get column names from the empty result
    const columnNames = columns ? Object.keys(columns[0] || {}) : [];
    console.log('Available columns in activities table:');
    const defaultColumns = columnNames.filter(col => 
      col.includes('default_') || col === 'flow_type'
    );
    console.log('Default-related columns:', defaultColumns);
    console.log('');

    // Now let's check the most recent activity with default values
    const { data: activities, error } = await supabase
      .from('activities')
      .select(`
        id,
        title_narrative,
        default_aid_type,
        default_finance_type,
        default_currency,
        default_tied_status,
        flow_type,
        default_flow_type,
        created_at,
        updated_at
      `)
      .or('default_aid_type.not.is.null,default_finance_type.not.is.null,default_currency.not.is.null,flow_type.not.is.null,default_flow_type.not.is.null')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching activities:', error);
      // Try without the flow_type/default_flow_type columns in case they don't exist
      const { data: activitiesAlt, error: errorAlt } = await supabase
        .from('activities')
        .select(`
          id,
          title_narrative,
          default_aid_type,
          default_finance_type,
          default_currency,
          default_tied_status,
          created_at,
          updated_at
        `)
        .or('default_aid_type.not.is.null,default_finance_type.not.is.null,default_currency.not.is.null')
        .order('updated_at', { ascending: false })
        .limit(5);

      if (errorAlt) {
        console.error('Alternative query also failed:', errorAlt);
        return;
      }

      console.log('Activities with default values (without flow_type columns):');
      activitiesAlt?.forEach((activity, index) => {
        console.log(`\n${index + 1}. ${activity.title_narrative || 'Untitled'} (ID: ${activity.id})`);
        console.log(`   Default Aid Type: ${activity.default_aid_type || 'null'}`);
        console.log(`   Default Finance Type: ${activity.default_finance_type || 'null'}`);
        console.log(`   Default Currency: ${activity.default_currency || 'null'}`);
        console.log(`   Default Tied Status: ${activity.default_tied_status || 'null'}`);
        console.log(`   Updated: ${activity.updated_at}`);
      });
      return;
    }

    if (!activities || activities.length === 0) {
      console.log('No activities found with default values set.');
      
      // Let's check the most recent activities regardless
      const { data: recentActivities } = await supabase
        .from('activities')
        .select(`
          id,
          title_narrative,
          default_aid_type,
          default_finance_type,
          default_currency,
          default_tied_status,
          updated_at
        `)
        .order('updated_at', { ascending: false })
        .limit(3);

      if (recentActivities && recentActivities.length > 0) {
        console.log('\nMost recent activities:');
        recentActivities.forEach((activity, index) => {
          console.log(`\n${index + 1}. ${activity.title_narrative || 'Untitled'} (ID: ${activity.id})`);
          console.log(`   Default Aid Type: ${activity.default_aid_type || 'null'}`);
          console.log(`   Default Finance Type: ${activity.default_finance_type || 'null'}`);
          console.log(`   Default Currency: ${activity.default_currency || 'null'}`);
          console.log(`   Default Tied Status: ${activity.default_tied_status || 'null'}`);
          console.log(`   Updated: ${activity.updated_at}`);
        });
      }
      return;
    }

    console.log(`Found ${activities.length} activities with default values:\n`);
    activities.forEach((activity, index) => {
      console.log(`${index + 1}. ${activity.title_narrative || 'Untitled'} (ID: ${activity.id})`);
      console.log(`   Default Aid Type: ${activity.default_aid_type || 'null'}`);
      console.log(`   Default Finance Type: ${activity.default_finance_type || 'null'}`);
      console.log(`   Default Currency: ${activity.default_currency || 'null'}`);
      console.log(`   Default Tied Status: ${activity.default_tied_status || 'null'}`);
      
      // Check both flow_type columns
      if ('flow_type' in activity) {
        console.log(`   Flow Type (old column): ${activity.flow_type || 'null'}`);
      }
      if ('default_flow_type' in activity) {
        console.log(`   Default Flow Type (new column): ${activity.default_flow_type || 'null'}`);
      }
      
      console.log(`   Updated: ${activity.updated_at}`);
      console.log('');
    });

    // Check the specific activity from the logs
    const activityId = 'fa161586-8076-4c55-93e7-78e1a05e258c';
    console.log(`\nChecking specific activity: ${activityId}`);
    
    const { data: specificActivity, error: specificError } = await supabase
      .from('activities')
      .select('*')
      .eq('id', activityId)
      .single();

    if (specificError) {
      console.error('Error fetching specific activity:', specificError);
    } else if (specificActivity) {
      console.log('Activity found:');
      console.log(`Title: ${specificActivity.title_narrative}`);
      console.log('\nDefault values:');
      console.log(`- default_aid_type: ${specificActivity.default_aid_type || 'null'}`);
      console.log(`- default_finance_type: ${specificActivity.default_finance_type || 'null'}`);
      console.log(`- default_currency: ${specificActivity.default_currency || 'null'}`);
      console.log(`- default_tied_status: ${specificActivity.default_tied_status || 'null'}`);
      
      if ('flow_type' in specificActivity) {
        console.log(`- flow_type: ${specificActivity.flow_type || 'null'}`);
      }
      if ('default_flow_type' in specificActivity) {
        console.log(`- default_flow_type: ${specificActivity.default_flow_type || 'null'}`);
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the check
checkActivityDefaults(); 
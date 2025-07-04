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

async function checkTableStructure() {
  console.log('Checking activities table structure...\n');

  try {
    // Query to get column information
    const { data: columns, error } = await supabase
      .rpc('get_table_columns', { table_name: 'activities' });

    if (error) {
      // If the function doesn't exist, try a different approach
      console.log('Using alternative method to check columns...\n');
      
      // Get a single row to see the columns
      const { data: sample, error: sampleError } = await supabase
        .from('activities')
        .select('*')
        .limit(1)
        .single();

      if (sampleError && sampleError.code !== 'PGRST116') {
        console.error('Error fetching sample:', sampleError);
        return;
      }

      if (sample) {
        const columnNames = Object.keys(sample);
        console.log(`Total columns: ${columnNames.length}\n`);
        
        console.log('Default-related columns:');
        columnNames
          .filter(col => col.includes('default') || col === 'flow_type')
          .sort()
          .forEach(col => {
            console.log(`  - ${col}: ${typeof sample[col]} (value: ${sample[col] || 'null'})`);
          });

        console.log('\nAll columns:');
        columnNames.sort().forEach(col => {
          if (col.includes('default') || col === 'flow_type' || col.includes('currency') || col.includes('aid') || col.includes('finance')) {
            console.log(`  - ${col}`);
          }
        });
      } else {
        console.log('No activities found in the table.');
      }
    } else {
      console.log('Columns in activities table:');
      columns?.forEach((col: any) => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }

    // Now check the most recent activity
    console.log('\n\nChecking most recent activity:');
    const { data: recentActivity, error: recentError } = await supabase
      .from('activities')
      .select(`
        id,
        title_narrative,
        default_aid_type,
        default_finance_type,
        default_currency,
        default_tied_status,
        default_flow_type,
        updated_at
      `)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (recentError) {
      console.error('Error fetching recent activity:', recentError);
      
      // Try without default_flow_type
      const { data: recentActivityAlt, error: recentErrorAlt } = await supabase
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
        .limit(1)
        .single();

      if (!recentErrorAlt && recentActivityAlt) {
        console.log('\nMost recent activity (without default_flow_type):');
        console.log(`ID: ${recentActivityAlt.id}`);
        console.log(`Title: ${recentActivityAlt.title_narrative}`);
        console.log(`Default Aid Type: ${recentActivityAlt.default_aid_type || 'null'}`);
        console.log(`Default Finance Type: ${recentActivityAlt.default_finance_type || 'null'}`);
        console.log(`Default Currency: ${recentActivityAlt.default_currency || 'null'}`);
        console.log(`Default Tied Status: ${recentActivityAlt.default_tied_status || 'null'}`);
        console.log(`Updated: ${recentActivityAlt.updated_at}`);
      }
    } else if (recentActivity) {
      console.log(`ID: ${recentActivity.id}`);
      console.log(`Title: ${recentActivity.title_narrative}`);
      console.log(`Default Aid Type: ${recentActivity.default_aid_type || 'null'}`);
      console.log(`Default Finance Type: ${recentActivity.default_finance_type || 'null'}`);
      console.log(`Default Currency: ${recentActivity.default_currency || 'null'}`);
      console.log(`Default Tied Status: ${recentActivity.default_tied_status || 'null'}`);
      console.log(`Default Flow Type: ${recentActivity.default_flow_type || 'null'}`);
      console.log(`Updated: ${recentActivity.updated_at}`);
    }

    // Check the specific activity that was being edited
    const activityId = 'fa161586-8076-4c55-93e7-78e1a05e258c';
    console.log(`\n\nChecking specific activity (${activityId}):`);
    
    const { data: specificActivity, error: specificError } = await supabase
      .from('activities')
      .select(`
        id,
        title_narrative,
        default_aid_type,
        default_finance_type,
        default_currency,
        default_tied_status,
        default_flow_type,
        updated_at
      `)
      .eq('id', activityId)
      .single();

    if (specificError) {
      // Try without default_flow_type
      const { data: specificActivityAlt, error: specificErrorAlt } = await supabase
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
        .eq('id', activityId)
        .single();

      if (!specificErrorAlt && specificActivityAlt) {
        console.log('Activity found (without default_flow_type):');
        console.log(`Title: ${specificActivityAlt.title_narrative}`);
        console.log(`Default Aid Type: ${specificActivityAlt.default_aid_type || 'null'}`);
        console.log(`Default Finance Type: ${specificActivityAlt.default_finance_type || 'null'}`);
        console.log(`Default Currency: ${specificActivityAlt.default_currency || 'null'}`);
        console.log(`Default Tied Status: ${specificActivityAlt.default_tied_status || 'null'}`);
        console.log(`Updated: ${specificActivityAlt.updated_at}`);
      }
    } else if (specificActivity) {
      console.log('Activity found:');
      console.log(`Title: ${specificActivity.title_narrative}`);
      console.log(`Default Aid Type: ${specificActivity.default_aid_type || 'null'}`);
      console.log(`Default Finance Type: ${specificActivity.default_finance_type || 'null'}`);
      console.log(`Default Currency: ${specificActivity.default_currency || 'null'}`);
      console.log(`Default Tied Status: ${specificActivity.default_tied_status || 'null'}`);
      console.log(`Default Flow Type: ${specificActivity.default_flow_type || 'null'}`);
      console.log(`Updated: ${specificActivity.updated_at}`);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the check
checkTableStructure(); 
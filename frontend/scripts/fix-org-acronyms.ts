import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixOrgAcronyms() {
  console.log('🔧 Fixing organization acronyms in activities...\n');

  try {
    // First, let's see what activities have full names instead of acronyms
    const { data: problemActivities, error: checkError } = await supabase
      .from('activities')
      .select('id, title_narrative, created_by_org_name, created_by_org_acronym')
      .not('created_by_org_acronym', 'is', null)
      .limit(50);

    if (checkError) {
      console.error('Error checking activities:', checkError);
      return;
    }

    const issueActivities = problemActivities?.filter(act => 
      act.created_by_org_acronym && act.created_by_org_acronym.length > 10
    ) || [];
    
    console.log(`Found ${issueActivities.length} activities with potential issues (showing first 10):\n`);
    issueActivities.slice(0, 10).forEach(act => {
      console.log(`- ${act.title_narrative}`);
      console.log(`  Created by: "${act.created_by_org_acronym}" (likely should be an acronym)`);
    });

    // Get all organizations with their acronyms
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, acronym')
      .not('acronym', 'is', null);

    if (orgsError) {
      console.error('Error fetching organizations:', orgsError);
      return;
    }

    console.log(`\n📊 Found ${orgs?.length || 0} organizations with acronyms`);

    // Create a map for quick lookup
    const orgMap = new Map();
    orgs?.forEach(org => {
      if (org.name && org.acronym) {
        orgMap.set(org.name, org.acronym);
      }
    });

    // Update activities where created_by_org_acronym contains the full name
    const { data: activities, error: fetchError } = await supabase
      .from('activities')
      .select('id, created_by_org_name, created_by_org_acronym')
      .not('created_by_org_acronym', 'is', null);

    if (fetchError) {
      console.error('Error fetching activities:', fetchError);
      return;
    }

    let updateCount = 0;
    const updates = [];

    for (const activity of activities || []) {
      let shouldUpdate = false;
      let newAcronym = activity.created_by_org_acronym;

      // Check if the acronym field contains a full name
      if (activity.created_by_org_acronym && orgMap.has(activity.created_by_org_acronym)) {
        newAcronym = orgMap.get(activity.created_by_org_acronym);
        shouldUpdate = true;
      } else if (activity.created_by_org_name && orgMap.has(activity.created_by_org_name) && 
                 activity.created_by_org_acronym === activity.created_by_org_name) {
        // If acronym equals the full name, replace with actual acronym
        newAcronym = orgMap.get(activity.created_by_org_name);
        shouldUpdate = true;
      } else if (activity.created_by_org_acronym && activity.created_by_org_acronym.length > 10) {
        // If it's too long to be an acronym and we don't have a match, clear it
        newAcronym = null;
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        updates.push({
          id: activity.id,
          oldValue: activity.created_by_org_acronym,
          newValue: newAcronym
        });
      }
    }

    console.log(`\n🔄 Found ${updates.length} activities to update`);

    // Perform updates
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('activities')
        .update({ created_by_org_acronym: update.newValue })
        .eq('id', update.id);

      if (updateError) {
        console.error(`Error updating activity ${update.id}:`, updateError);
      } else {
        updateCount++;
        console.log(`✅ Updated activity ${update.id}: "${update.oldValue}" → "${update.newValue || 'NULL'}"`);
      }
    }

    console.log(`\n✨ Successfully updated ${updateCount} activities`);

    // Show sample of updated data
    const { data: sampleData } = await supabase
      .from('activities')
      .select('id, title_narrative, created_by_org_name, created_by_org_acronym')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('\n📋 Sample of activities after update:');
    sampleData?.forEach(act => {
      const display = act.created_by_org_acronym || act.created_by_org_name || 'Unknown';
      console.log(`- ${act.title_narrative}`);
      console.log(`  Created by: ${display}`);
    });

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the fix
fixOrgAcronyms(); 
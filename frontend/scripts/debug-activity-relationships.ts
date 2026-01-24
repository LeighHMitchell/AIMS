/**
 * Debug script to check activity_relationships data
 * Run with: npx tsx scripts/debug-activity-relationships.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugRelationships() {
  console.log('🔍 Debugging activity_relationships table...\n');

  // 1. Get all relationships
  console.log('1️⃣ Fetching all activity_relationships...');
  const { data: relationships, error: relError } = await supabase
    .from('activity_relationships')
    .select('*');
  
  if (relError) {
    console.error('Error:', relError);
    return;
  }

  console.log(`Found ${relationships?.length || 0} relationships:\n`);
  relationships?.forEach((rel, i) => {
    console.log(`Relationship ${i + 1}:`);
    console.log(`  ID: ${rel.id}`);
    console.log(`  activity_id: ${rel.activity_id}`);
    console.log(`  related_activity_id: ${rel.related_activity_id}`);
    console.log(`  external_iati_identifier: ${rel.external_iati_identifier}`);
    console.log(`  relationship_type: ${rel.relationship_type}`);
    console.log('');
  });

  // 2. Get the activity IDs involved
  const activityIds = new Set<string>();
  relationships?.forEach(rel => {
    if (rel.activity_id) activityIds.add(rel.activity_id);
    if (rel.related_activity_id) activityIds.add(rel.related_activity_id);
  });

  console.log(`\n2️⃣ Activity IDs involved: ${activityIds.size}`);
  console.log(Array.from(activityIds));

  // 3. Fetch those activities
  if (activityIds.size > 0) {
    console.log('\n3️⃣ Fetching activities for those IDs...');
    const { data: activities, error: actError } = await supabase
      .from('activities')
      .select('id, title_narrative, iati_identifier, publication_status')
      .in('id', Array.from(activityIds));
    
    if (actError) {
      console.error('Error fetching activities:', actError);
    } else {
      console.log(`Found ${activities?.length || 0} activities:\n`);
      activities?.forEach(act => {
        console.log(`  - ${act.title_narrative || 'Untitled'}`);
        console.log(`    ID: ${act.id}`);
        console.log(`    IATI: ${act.iati_identifier}`);
        console.log(`    Status: ${act.publication_status}`);
        console.log('');
      });

      // Check for missing activities
      const foundIds = new Set(activities?.map(a => a.id) || []);
      const missingIds = Array.from(activityIds).filter(id => !foundIds.has(id));
      if (missingIds.length > 0) {
        console.log('⚠️ Missing activities (referenced but not found):');
        console.log(missingIds);
      }
    }
  }

  // 4. Also check related_activities table
  console.log('\n4️⃣ Checking related_activities table...');
  const { data: relAct, error: relActError } = await supabase
    .from('related_activities')
    .select('*');
  
  if (relActError) {
    if (relActError.message.includes('does not exist')) {
      console.log('related_activities table does not exist (this is OK)');
    } else {
      console.error('Error:', relActError);
    }
  } else {
    console.log(`Found ${relAct?.length || 0} records in related_activities table`);
    if (relAct && relAct.length > 0) {
      console.log('Sample record:', relAct[0]);
    }
  }

  console.log('\n✅ Debug complete!');
}

debugRelationships();

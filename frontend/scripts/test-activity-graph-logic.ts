/**
 * Test script that mimics the activity-graph API logic
 * Run with: npx tsx scripts/test-activity-graph-logic.ts
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

interface NormalizedRelationship {
  id: string;
  sourceActivityId: string;
  targetActivityId: string | null;
  relationshipType: string;
  externalIatiIdentifier: string | null;
  externalActivityTitle: string | null;
}

async function testActivityGraphLogic() {
  console.log('🧪 Testing activity-graph API logic...\n');

  // Step 1: Fetch from related_activities table
  console.log('1️⃣ Fetching from related_activities table...');
  const { data: relatedActivitiesData, error: relError } = await supabase
    .from('related_activities')
    .select(`
      id,
      source_activity_id,
      linked_activity_id,
      relationship_type,
      iati_identifier,
      is_external,
      created_at
    `);
  
  if (relError) {
    console.log('   Error (may be OK if table does not exist):', relError.message);
  } else {
    console.log(`   Found ${relatedActivitiesData?.length || 0} records`);
  }

  // Step 2: Fetch from activity_relationships table
  console.log('\n2️⃣ Fetching from activity_relationships table...');
  const { data: activityRelationshipsData, error: intRelError } = await supabase
    .from('activity_relationships')
    .select(`
      id,
      activity_id,
      related_activity_id,
      relationship_type,
      external_iati_identifier,
      external_activity_title
    `);
  
  if (intRelError) {
    console.log('   Error:', intRelError.message);
    return;
  }
  console.log(`   Found ${activityRelationshipsData?.length || 0} records`);

  // Step 3: Normalize relationships
  console.log('\n3️⃣ Normalizing relationships...');
  const normalizedRelationships: NormalizedRelationship[] = [];

  // From related_activities
  (relatedActivitiesData || []).forEach((rel: any) => {
    if (rel.linked_activity_id || (rel.is_external && rel.iati_identifier)) {
      normalizedRelationships.push({
        id: rel.id,
        sourceActivityId: rel.source_activity_id,
        targetActivityId: rel.linked_activity_id,
        relationshipType: rel.relationship_type,
        externalIatiIdentifier: rel.is_external ? rel.iati_identifier : null,
        externalActivityTitle: rel.is_external ? rel.iati_identifier : null
      });
    }
  });

  // From activity_relationships
  (activityRelationshipsData || []).forEach((rel: any) => {
    if (rel.related_activity_id || rel.external_iati_identifier) {
      normalizedRelationships.push({
        id: rel.id,
        sourceActivityId: rel.activity_id,
        targetActivityId: rel.related_activity_id,
        relationshipType: rel.relationship_type,
        externalIatiIdentifier: rel.external_iati_identifier,
        externalActivityTitle: rel.external_activity_title
      });
    }
  });

  console.log(`   Total normalized: ${normalizedRelationships.length}`);
  normalizedRelationships.forEach((rel, i) => {
    console.log(`   ${i + 1}. source=${rel.sourceActivityId?.slice(0, 8)}... target=${rel.targetActivityId?.slice(0, 8) || rel.externalIatiIdentifier}`);
  });

  // Step 4: Collect activity IDs and external activities
  console.log('\n4️⃣ Collecting activity IDs...');
  const activityIds = new Set<string>();
  const externalActivities = new Map<string, { identifier: string; title: string }>();

  normalizedRelationships.forEach((rel) => {
    if (rel.sourceActivityId) activityIds.add(rel.sourceActivityId);
    if (rel.targetActivityId) {
      activityIds.add(rel.targetActivityId);
    } else if (rel.externalIatiIdentifier) {
      externalActivities.set(rel.externalIatiIdentifier, {
        identifier: rel.externalIatiIdentifier,
        title: rel.externalActivityTitle || rel.externalIatiIdentifier
      });
    }
  });

  console.log(`   Activity IDs: ${activityIds.size}`);
  console.log(`   External activities: ${externalActivities.size}`);
  Array.from(activityIds).forEach(id => console.log(`   - ${id}`));
  externalActivities.forEach((ext, id) => console.log(`   - External: ${id}`));

  // Step 5: Fetch activities
  console.log('\n5️⃣ Fetching activities from database...');
  let activities: any[] = [];
  if (activityIds.size > 0) {
    const { data: actData, error: actError } = await supabase
      .from('activities')
      .select(`
        id,
        title_narrative,
        acronym,
        iati_identifier,
        activity_status,
        publication_status,
        created_by_org_name,
        created_by_org_acronym
      `)
      .in('id', Array.from(activityIds));
    
    if (actError) {
      console.log('   Error:', actError.message);
    } else {
      activities = actData || [];
      console.log(`   Found ${activities.length} activities`);
      activities.forEach(act => {
        console.log(`   - ${act.title_narrative} (${act.publication_status})`);
      });
    }
  }

  // Check for missing activities
  const foundActivityIds = new Set(activities.map((a: any) => a.id));
  const missingActivityIds = Array.from(activityIds).filter(id => !foundActivityIds.has(id));
  if (missingActivityIds.length > 0) {
    console.log('\n   ⚠️ Missing activities:');
    missingActivityIds.forEach(id => console.log(`   - ${id}`));
  }

  // Step 6: Build nodes
  console.log('\n6️⃣ Building nodes...');
  const nodes: any[] = [];
  const nodeIds = new Set<string>();
  let groupCounter = 0;

  // Add internal activities
  activities.forEach((activity: any) => {
    if (!nodeIds.has(activity.id)) {
      nodes.push({
        id: activity.id,
        name: activity.title_narrative || 'Untitled',
        type: 'activity',
        group: groupCounter++,
        status: activity.activity_status
      });
      nodeIds.add(activity.id);
    }
  });

  // Add external activities
  externalActivities.forEach((ext, identifier) => {
    if (!nodeIds.has(identifier)) {
      nodes.push({
        id: identifier,
        name: ext.title,
        type: 'activity',
        group: groupCounter++,
        status: 'external'
      });
      nodeIds.add(identifier);
    }
  });

  console.log(`   Created ${nodes.length} nodes`);
  nodes.forEach(n => console.log(`   - ${n.name} (status: ${n.status})`));
  console.log(`   nodeIds set: ${Array.from(nodeIds).join(', ').slice(0, 100)}...`);

  // Step 7: Build links
  console.log('\n7️⃣ Building links...');
  const links: any[] = [];
  const linkSet = new Set<string>();

  normalizedRelationships.forEach((rel, index) => {
    const sourceId = rel.sourceActivityId;
    const targetId = rel.targetActivityId || rel.externalIatiIdentifier;
    
    console.log(`   Checking relationship ${index + 1}:`);
    console.log(`     sourceId: ${sourceId}`);
    console.log(`     targetId: ${targetId}`);
    console.log(`     sourceId in nodeIds: ${nodeIds.has(sourceId)}`);
    console.log(`     targetId in nodeIds: ${targetId ? nodeIds.has(targetId) : 'N/A'}`);

    if (sourceId && targetId && nodeIds.has(sourceId) && nodeIds.has(targetId)) {
      const linkKey = `${sourceId}-${targetId}-${rel.relationshipType}`;
      const reverseLinkKey = `${targetId}-${sourceId}-${rel.relationshipType}`;
      
      if (!linkSet.has(linkKey) && !linkSet.has(reverseLinkKey)) {
        links.push({
          source: sourceId,
          target: targetId,
          relationshipType: rel.relationshipType
        });
        linkSet.add(linkKey);
        console.log(`     ✅ Link created!`);
      } else {
        console.log(`     ⏭️ Duplicate, skipping`);
      }
    } else {
      console.log(`     ❌ Link NOT created (missing node)`);
    }
  });

  console.log(`\n   Total links created: ${links.length}`);

  // Step 8: Check hasValidInternalNodes
  console.log('\n8️⃣ Checking hasValidInternalNodes...');
  const hasValidInternalNodes = nodes.filter(n => n.status !== 'external').length > 0;
  console.log(`   hasValidInternalNodes: ${hasValidInternalNodes}`);
  console.log(`   Internal nodes: ${nodes.filter(n => n.status !== 'external').length}`);

  // Final result
  console.log('\n' + '='.repeat(50));
  console.log('📊 FINAL RESULT:');
  console.log(`   Nodes: ${nodes.length}`);
  console.log(`   Links: ${links.length}`);
  console.log(`   hasRelationships: ${links.length > 0}`);
  
  if (links.length === 0 && normalizedRelationships.length > 0) {
    console.log('\n⚠️ PROBLEM DETECTED: Relationships exist but no links were created!');
    console.log('   This means the source or target activities are not in the nodeIds set.');
  }
}

testActivityGraphLogic();

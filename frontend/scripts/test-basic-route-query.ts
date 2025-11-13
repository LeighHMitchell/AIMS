/**
 * Test script to diagnose the /api/activities/[id]/basic route 500 error
 * This replicates the query from the basic route to identify which part is failing
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testBasicQuery(activityId: string) {
  console.log('Testing basic query for activity:', activityId);

  // Test 1: Simple query
  console.log('\n=== Test 1: Simple activity query ===');
  const { data: simple, error: simpleError } = await supabase
    .from('activities')
    .select('id, title_narrative, acronym')
    .eq('id', activityId)
    .single();

  if (simpleError) {
    console.error('❌ Simple query failed:', simpleError);
  } else {
    console.log('✅ Simple query succeeded:', simple);
  }

  // Test 2: Query with activity_sectors
  console.log('\n=== Test 2: Query with activity_sectors ===');
  const { data: withSectors, error: sectorsError } = await supabase
    .from('activities')
    .select(`
      id, title_narrative,
      activity_sectors (
        id, activity_id, sector_code, sector_name, percentage, level,
        category_code, category_name, type, created_at, updated_at
      )
    `)
    .eq('id', activityId)
    .single();

  if (sectorsError) {
    console.error('❌ Sectors query failed:', sectorsError);
  } else {
    console.log('✅ Sectors query succeeded, sectors count:', withSectors?.activity_sectors?.length || 0);
  }

  // Test 3: Query with activity_policy_markers
  console.log('\n=== Test 3: Query with activity_policy_markers ===');
  const { data: withPolicyMarkers, error: pmError } = await supabase
    .from('activities')
    .select(`
      id, title_narrative,
      activity_policy_markers (
        id, activity_id, policy_marker_id, significance, rationale, created_at, updated_at,
        policy_markers (
          id, code, iati_code, name, vocabulary, is_iati_standard, created_at, updated_at
        )
      )
    `)
    .eq('id', activityId)
    .single();

  if (pmError) {
    console.error('❌ Policy markers query failed:', pmError);
  } else {
    console.log('✅ Policy markers query succeeded, count:', withPolicyMarkers?.activity_policy_markers?.length || 0);
  }

  // Test 4: Query with activity_tags
  console.log('\n=== Test 4: Query with activity_tags ===');
  const { data: withTags, error: tagsError } = await supabase
    .from('activities')
    .select(`
      id, title_narrative,
      activity_tags (
        tag_id,
        tags (id, name, vocabulary, code, vocabulary_uri, created_by, created_at, updated_at)
      )
    `)
    .eq('id', activityId)
    .single();

  if (tagsError) {
    console.error('❌ Tags query failed:', tagsError);
  } else {
    console.log('✅ Tags query succeeded, tags count:', withTags?.activity_tags?.length || 0);
  }

  // Test 5: Query with activity_working_groups
  console.log('\n=== Test 5: Query with activity_working_groups ===');
  const { data: withWG, error: wgError } = await supabase
    .from('activities')
    .select(`
      id, title_narrative,
      activity_working_groups (
        working_group_id,
        vocabulary,
        working_groups (id, code, label, description)
      )
    `)
    .eq('id', activityId)
    .single();

  if (wgError) {
    console.error('❌ Working groups query failed:', wgError);
  } else {
    console.log('✅ Working groups query succeeded, count:', withWG?.activity_working_groups?.length || 0);
  }

  // Test 6: Query with activity_sdg_mappings
  console.log('\n=== Test 6: Query with activity_sdg_mappings ===');
  const { data: withSDG, error: sdgError } = await supabase
    .from('activities')
    .select(`
      id, title_narrative,
      activity_sdg_mappings (*)
    `)
    .eq('id', activityId)
    .single();

  if (sdgError) {
    console.error('❌ SDG mappings query failed:', sdgError);
  } else {
    console.log('✅ SDG mappings query succeeded, count:', withSDG?.activity_sdg_mappings?.length || 0);
  }

  // Test 7: Full query (as in basic route)
  console.log('\n=== Test 7: Full combined query ===');
  const { data: fullQuery, error: fullError } = await supabase
    .from('activities')
    .select(`
      id,
      title_narrative,
      description_narrative,
      description_objectives,
      description_target_groups,
      description_other,
      acronym,
      collaboration_type,
      activity_scope,
      activity_status,
      planned_start_date,
      planned_end_date,
      actual_start_date,
      actual_end_date,
      iati_identifier,
      other_identifier,
      other_identifiers,
      default_aid_type,
      default_finance_type,
      default_currency,
      default_flow_type,
      default_tied_status,
      default_disbursement_channel,
      default_aid_modality,
      capital_spend_percentage,
      publication_status,
      submission_status,
      created_by_org_name,
      created_by_org_acronym,
      reporting_org_id,
      language,
      banner,
      icon,
      created_at,
      updated_at,
      activity_sectors (
        id, activity_id, sector_code, sector_name, percentage, level,
        category_code, category_name, type, created_at, updated_at
      ),
      activity_policy_markers (
        id, activity_id, policy_marker_id, significance, rationale, created_at, updated_at,
        policy_markers (
          id, code, iati_code, name, vocabulary, is_iati_standard, created_at, updated_at
        )
      ),
      activity_tags (
        tag_id,
        tags (id, name, vocabulary, code, vocabulary_uri, created_by, created_at, updated_at)
      ),
      activity_working_groups (
        working_group_id,
        vocabulary,
        working_groups (id, code, label, description)
      ),
      activity_sdg_mappings (*),
      recipient_countries,
      recipient_regions,
      custom_geographies
    `)
    .eq('id', activityId)
    .single();

  if (fullError) {
    console.error('❌ Full query failed:', fullError);
    console.error('Error details:', JSON.stringify(fullError, null, 2));
  } else {
    console.log('✅ Full query succeeded!');
    console.log('Activity:', fullQuery?.title_narrative);
  }
}

// Get activity ID from command line
const activityId = process.argv[2] || '9e786204-0995-441d-88bd-81b02968dbae';

testBasicQuery(activityId)
  .then(() => {
    console.log('\n✅ Diagnostic complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Diagnostic failed:', err);
    process.exit(1);
  });

/**
 * Duplicate Detection Script for Data Clinic
 * 
 * This script detects potential duplicate activities and organizations
 * and stores the results in the detected_duplicates table.
 * 
 * Run with: npx ts-node --project tsconfig.scripts.json scripts/detect-duplicates.ts
 * 
 * Options:
 *   --activities-only    Only detect activity duplicates
 *   --organizations-only Only detect organization duplicates
 *   --clear              Clear existing duplicates before detection
 *   --dry-run            Print results without saving to database
 */

import { getSupabaseAdmin } from '../src/lib/supabase';

// ============================================================================
// Types
// ============================================================================

interface Activity {
  id: string;
  title_narrative: string | null;
  iati_identifier: string | null;
  other_identifier: string | null;
  other_identifiers: any[] | null;
  reporting_org_id: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
  acronym: string | null;
  iati_org_id: string | null;
  created_at: string;
}

interface DetectedDuplicate {
  entity_type: 'activity' | 'organization';
  entity_id_1: string;
  entity_id_2: string;
  detection_type: string;
  confidence: 'high' | 'medium' | 'low';
  similarity_score: number | null;
  match_details: Record<string, any>;
  is_suggested_link: boolean;
}

// ============================================================================
// String Similarity Functions (Levenshtein Distance)
// ============================================================================

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function normalizeString(str: string | null): string {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Ensure consistent ordering of IDs (smaller ID first) to prevent duplicates
 */
function orderIds(id1: string, id2: string): [string, string] {
  return id1 < id2 ? [id1, id2] : [id2, id1];
}

/**
 * Check if two date ranges overlap (with some tolerance)
 */
function datesOverlap(
  start1: string | null, end1: string | null,
  start2: string | null, end2: string | null,
  toleranceDays: number = 90
): boolean {
  if (!start1 && !end1) return true; // No dates = assume overlap
  if (!start2 && !end2) return true;
  
  const d1Start = start1 ? new Date(start1) : null;
  const d1End = end1 ? new Date(end1) : null;
  const d2Start = start2 ? new Date(start2) : null;
  const d2End = end2 ? new Date(end2) : null;
  
  // Add tolerance in milliseconds
  const toleranceMs = toleranceDays * 24 * 60 * 60 * 1000;
  
  // If both have start dates, check if they're within tolerance
  if (d1Start && d2Start) {
    const diff = Math.abs(d1Start.getTime() - d2Start.getTime());
    if (diff <= toleranceMs) return true;
  }
  
  // Check actual date range overlap
  if (d1Start && d1End && d2Start && d2End) {
    return d1Start <= d2End && d2Start <= d1End;
  }
  
  return true; // Default to assuming overlap if we can't determine
}

/**
 * Extract CRS ID (type A2) from other_identifiers JSONB
 */
function extractCrsId(otherIdentifiers: any[] | null): string | null {
  if (!otherIdentifiers || !Array.isArray(otherIdentifiers)) return null;
  
  const crsEntry = otherIdentifiers.find(
    (id: any) => id.type === 'A2' || id.type === 'a2'
  );
  
  return crsEntry?.ref || null;
}

// ============================================================================
// Activity Duplicate Detection
// ============================================================================

async function detectActivityDuplicates(
  supabase: any,
  dryRun: boolean
): Promise<DetectedDuplicate[]> {
  console.log('\n📋 Detecting activity duplicates...');
  
  const { data: activities, error } = await supabase
    .from('activities')
    .select(`
      id,
      title_narrative,
      iati_identifier,
      other_identifier,
      other_identifiers,
      reporting_org_id,
      planned_start_date,
      planned_end_date,
      actual_start_date,
      actual_end_date,
      created_at
    `)
    .order('created_at');
  
  if (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
  
  if (!activities || activities.length === 0) {
    console.log('No activities found');
    return [];
  }
  
  console.log(`Found ${activities.length} activities to analyze`);
  
  const duplicates: DetectedDuplicate[] = [];
  const processedPairs = new Set<string>();
  
  // Helper to add a duplicate if not already processed
  const addDuplicate = (dup: DetectedDuplicate) => {
    const [orderedId1, orderedId2] = orderIds(dup.entity_id_1, dup.entity_id_2);
    const pairKey = `${orderedId1}-${orderedId2}`;
    
    if (!processedPairs.has(pairKey)) {
      processedPairs.add(pairKey);
      duplicates.push({
        ...dup,
        entity_id_1: orderedId1,
        entity_id_2: orderedId2,
      });
    }
  };
  
  // 1. Exact IATI ID matches (HIGH confidence)
  console.log('  Checking exact IATI ID matches...');
  const iatiIdGroups = new Map<string, Activity[]>();
  
  for (const activity of activities) {
    if (activity.iati_identifier) {
      const key = normalizeString(activity.iati_identifier);
      if (!iatiIdGroups.has(key)) {
        iatiIdGroups.set(key, []);
      }
      iatiIdGroups.get(key)!.push(activity);
    }
  }
  
  for (const [iatiId, group] of iatiIdGroups) {
    if (group.length > 1) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          addDuplicate({
            entity_type: 'activity',
            entity_id_1: group[i].id,
            entity_id_2: group[j].id,
            detection_type: 'exact_iati_id',
            confidence: 'high',
            similarity_score: 1.0,
            match_details: {
              field: 'iati_identifier',
              value: iatiId,
            },
            is_suggested_link: false,
          });
        }
      }
    }
  }
  
  // 2. Exact CRS ID matches (HIGH confidence)
  console.log('  Checking exact CRS ID (A2) matches...');
  const crsIdGroups = new Map<string, Activity[]>();
  
  for (const activity of activities) {
    const crsId = extractCrsId(activity.other_identifiers);
    if (crsId) {
      const key = normalizeString(crsId);
      if (!crsIdGroups.has(key)) {
        crsIdGroups.set(key, []);
      }
      crsIdGroups.get(key)!.push(activity);
    }
  }
  
  for (const [crsId, group] of crsIdGroups) {
    if (group.length > 1) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          addDuplicate({
            entity_type: 'activity',
            entity_id_1: group[i].id,
            entity_id_2: group[j].id,
            detection_type: 'exact_crs_id',
            confidence: 'high',
            similarity_score: 1.0,
            match_details: {
              field: 'other_identifiers.A2',
              value: crsId,
            },
            is_suggested_link: false,
          });
        }
      }
    }
  }
  
  // 3. Cross-org duplicates (MEDIUM confidence)
  // Different reporting orgs, similar titles, overlapping dates
  console.log('  Checking cross-org duplicates...');
  const crossOrgThreshold = 0.90; // 90% similarity for cross-org
  
  for (let i = 0; i < activities.length; i++) {
    const a1 = activities[i];
    if (!a1.title_narrative || !a1.reporting_org_id) continue;
    
    for (let j = i + 1; j < activities.length; j++) {
      const a2 = activities[j];
      if (!a2.title_narrative || !a2.reporting_org_id) continue;
      
      // Must be different reporting orgs
      if (a1.reporting_org_id === a2.reporting_org_id) continue;
      
      // Check title similarity
      const similarity = calculateSimilarity(
        normalizeString(a1.title_narrative),
        normalizeString(a2.title_narrative)
      );
      
      if (similarity >= crossOrgThreshold) {
        // Check date overlap
        const hasDateOverlap = datesOverlap(
          a1.planned_start_date || a1.actual_start_date,
          a1.planned_end_date || a1.actual_end_date,
          a2.planned_start_date || a2.actual_start_date,
          a2.planned_end_date || a2.actual_end_date
        );
        
        if (hasDateOverlap) {
          addDuplicate({
            entity_type: 'activity',
            entity_id_1: a1.id,
            entity_id_2: a2.id,
            detection_type: 'cross_org',
            confidence: 'medium',
            similarity_score: similarity,
            match_details: {
              field: 'title_narrative',
              value1: a1.title_narrative?.substring(0, 100),
              value2: a2.title_narrative?.substring(0, 100),
              reporting_org_1: a1.reporting_org_id,
              reporting_org_2: a2.reporting_org_id,
            },
            is_suggested_link: true, // Cross-org should be linked, not merged
          });
        }
      }
    }
  }
  
  // 4. Similar titles within same org (LOW confidence)
  console.log('  Checking similar titles within same org...');
  const sameOrgThreshold = 0.85; // 85% similarity for same-org
  
  // Group by reporting org
  const orgActivityGroups = new Map<string, Activity[]>();
  for (const activity of activities) {
    if (activity.reporting_org_id) {
      if (!orgActivityGroups.has(activity.reporting_org_id)) {
        orgActivityGroups.set(activity.reporting_org_id, []);
      }
      orgActivityGroups.get(activity.reporting_org_id)!.push(activity);
    }
  }
  
  for (const [orgId, orgActivities] of orgActivityGroups) {
    for (let i = 0; i < orgActivities.length; i++) {
      const a1 = orgActivities[i];
      if (!a1.title_narrative) continue;
      
      for (let j = i + 1; j < orgActivities.length; j++) {
        const a2 = orgActivities[j];
        if (!a2.title_narrative) continue;
        
        const similarity = calculateSimilarity(
          normalizeString(a1.title_narrative),
          normalizeString(a2.title_narrative)
        );
        
        if (similarity >= sameOrgThreshold && similarity < 1.0) {
          addDuplicate({
            entity_type: 'activity',
            entity_id_1: a1.id,
            entity_id_2: a2.id,
            detection_type: 'similar_name',
            confidence: 'low',
            similarity_score: similarity,
            match_details: {
              field: 'title_narrative',
              value1: a1.title_narrative?.substring(0, 100),
              value2: a2.title_narrative?.substring(0, 100),
              reporting_org_id: orgId,
            },
            is_suggested_link: false,
          });
        }
      }
    }
  }
  
  console.log(`  Found ${duplicates.length} activity duplicate pairs`);
  return duplicates;
}

// ============================================================================
// Organization Duplicate Detection
// ============================================================================

async function detectOrganizationDuplicates(
  supabase: any,
  dryRun: boolean
): Promise<DetectedDuplicate[]> {
  console.log('\n🏢 Detecting organization duplicates...');
  
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      acronym,
      iati_org_id,
      created_at
    `)
    .order('created_at');
  
  if (error) {
    console.error('Error fetching organizations:', error);
    return [];
  }
  
  if (!organizations || organizations.length === 0) {
    console.log('No organizations found');
    return [];
  }
  
  console.log(`Found ${organizations.length} organizations to analyze`);
  
  const duplicates: DetectedDuplicate[] = [];
  const processedPairs = new Set<string>();
  
  const addDuplicate = (dup: DetectedDuplicate) => {
    const [orderedId1, orderedId2] = orderIds(dup.entity_id_1, dup.entity_id_2);
    const pairKey = `${orderedId1}-${orderedId2}`;
    
    if (!processedPairs.has(pairKey)) {
      processedPairs.add(pairKey);
      duplicates.push({
        ...dup,
        entity_id_1: orderedId1,
        entity_id_2: orderedId2,
      });
    }
  };
  
  // 1. Exact IATI Org ID matches (HIGH confidence)
  console.log('  Checking exact IATI org ID matches...');
  const iatiOrgIdGroups = new Map<string, Organization[]>();
  
  for (const org of organizations) {
    if (org.iati_org_id) {
      const key = normalizeString(org.iati_org_id);
      if (!iatiOrgIdGroups.has(key)) {
        iatiOrgIdGroups.set(key, []);
      }
      iatiOrgIdGroups.get(key)!.push(org);
    }
  }
  
  for (const [iatiOrgId, group] of iatiOrgIdGroups) {
    if (group.length > 1) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          addDuplicate({
            entity_type: 'organization',
            entity_id_1: group[i].id,
            entity_id_2: group[j].id,
            detection_type: 'exact_iati_id',
            confidence: 'high',
            similarity_score: 1.0,
            match_details: {
              field: 'iati_org_id',
              value: iatiOrgId,
            },
            is_suggested_link: false,
          });
        }
      }
    }
  }
  
  // 2. Exact name matches (HIGH confidence)
  console.log('  Checking exact name matches...');
  const nameGroups = new Map<string, Organization[]>();
  
  for (const org of organizations) {
    if (org.name) {
      const key = normalizeString(org.name);
      if (!nameGroups.has(key)) {
        nameGroups.set(key, []);
      }
      nameGroups.get(key)!.push(org);
    }
  }
  
  for (const [name, group] of nameGroups) {
    if (group.length > 1) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          addDuplicate({
            entity_type: 'organization',
            entity_id_1: group[i].id,
            entity_id_2: group[j].id,
            detection_type: 'exact_name',
            confidence: 'high',
            similarity_score: 1.0,
            match_details: {
              field: 'name',
              value: name,
            },
            is_suggested_link: false,
          });
        }
      }
    }
  }
  
  // 3. Exact acronym matches (HIGH confidence)
  console.log('  Checking exact acronym matches...');
  const acronymGroups = new Map<string, Organization[]>();
  
  for (const org of organizations) {
    if (org.acronym) {
      const key = normalizeString(org.acronym);
      if (!acronymGroups.has(key)) {
        acronymGroups.set(key, []);
      }
      acronymGroups.get(key)!.push(org);
    }
  }
  
  for (const [acronym, group] of acronymGroups) {
    if (group.length > 1) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          addDuplicate({
            entity_type: 'organization',
            entity_id_1: group[i].id,
            entity_id_2: group[j].id,
            detection_type: 'exact_acronym',
            confidence: 'high',
            similarity_score: 1.0,
            match_details: {
              field: 'acronym',
              value: acronym,
            },
            is_suggested_link: false,
          });
        }
      }
    }
  }
  
  // 4. Similar names (LOW confidence)
  console.log('  Checking similar names...');
  const similarityThreshold = 0.85;
  
  for (let i = 0; i < organizations.length; i++) {
    const org1 = organizations[i];
    if (!org1.name) continue;
    
    for (let j = i + 1; j < organizations.length; j++) {
      const org2 = organizations[j];
      if (!org2.name) continue;
      
      const similarity = calculateSimilarity(
        normalizeString(org1.name),
        normalizeString(org2.name)
      );
      
      if (similarity >= similarityThreshold && similarity < 1.0) {
        addDuplicate({
          entity_type: 'organization',
          entity_id_1: org1.id,
          entity_id_2: org2.id,
          detection_type: 'similar_name',
          confidence: 'low',
          similarity_score: similarity,
          match_details: {
            field: 'name',
            value1: org1.name,
            value2: org2.name,
          },
          is_suggested_link: false,
        });
      }
    }
  }
  
  console.log(`  Found ${duplicates.length} organization duplicate pairs`);
  return duplicates;
}

// ============================================================================
// Database Operations
// ============================================================================

async function clearExistingDuplicates(supabase: any, entityType?: string): Promise<void> {
  console.log('\n🗑️  Clearing existing duplicates...');
  
  let query = supabase.from('detected_duplicates').delete();
  
  if (entityType) {
    query = query.eq('entity_type', entityType);
  } else {
    // Delete all - need to use a condition that matches all rows
    query = query.neq('id', '00000000-0000-0000-0000-000000000000');
  }
  
  const { error } = await query;
  
  if (error) {
    console.error('Error clearing duplicates:', error);
  } else {
    console.log('  Cleared existing duplicates');
  }
}

async function saveDuplicates(
  supabase: any,
  duplicates: DetectedDuplicate[]
): Promise<void> {
  if (duplicates.length === 0) {
    console.log('No duplicates to save');
    return;
  }
  
  console.log(`\n💾 Saving ${duplicates.length} duplicates to database...`);
  
  // Insert in batches of 100
  const batchSize = 100;
  let saved = 0;
  
  for (let i = 0; i < duplicates.length; i += batchSize) {
    const batch = duplicates.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('detected_duplicates')
      .upsert(batch, {
        onConflict: 'entity_type,entity_id_1,entity_id_2',
        ignoreDuplicates: false,
      });
    
    if (error) {
      console.error(`Error saving batch ${i / batchSize + 1}:`, error);
    } else {
      saved += batch.length;
    }
  }
  
  console.log(`  Saved ${saved} duplicates`);
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const activitiesOnly = args.includes('--activities-only');
  const organizationsOnly = args.includes('--organizations-only');
  const clearFirst = args.includes('--clear');
  const dryRun = args.includes('--dry-run');
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           Duplicate Detection for Data Clinic              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be saved to database');
  }
  
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    console.error('❌ Failed to initialize Supabase client');
    process.exit(1);
  }
  
  // Clear existing duplicates if requested
  if (clearFirst && !dryRun) {
    if (activitiesOnly) {
      await clearExistingDuplicates(supabase, 'activity');
    } else if (organizationsOnly) {
      await clearExistingDuplicates(supabase, 'organization');
    } else {
      await clearExistingDuplicates(supabase);
    }
  }
  
  const allDuplicates: DetectedDuplicate[] = [];
  
  // Detect activity duplicates
  if (!organizationsOnly) {
    const activityDuplicates = await detectActivityDuplicates(supabase, dryRun);
    allDuplicates.push(...activityDuplicates);
  }
  
  // Detect organization duplicates
  if (!activitiesOnly) {
    const orgDuplicates = await detectOrganizationDuplicates(supabase, dryRun);
    allDuplicates.push(...orgDuplicates);
  }
  
  // Save results
  if (!dryRun) {
    await saveDuplicates(supabase, allDuplicates);
  }
  
  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                        Summary                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const activityDups = allDuplicates.filter(d => d.entity_type === 'activity');
  const orgDups = allDuplicates.filter(d => d.entity_type === 'organization');
  
  console.log(`\n📋 Activity Duplicates: ${activityDups.length}`);
  console.log(`   - Exact IATI ID: ${activityDups.filter(d => d.detection_type === 'exact_iati_id').length}`);
  console.log(`   - Exact CRS ID: ${activityDups.filter(d => d.detection_type === 'exact_crs_id').length}`);
  console.log(`   - Cross-Org: ${activityDups.filter(d => d.detection_type === 'cross_org').length}`);
  console.log(`   - Similar Names: ${activityDups.filter(d => d.detection_type === 'similar_name').length}`);
  
  console.log(`\n🏢 Organization Duplicates: ${orgDups.length}`);
  console.log(`   - Exact IATI ID: ${orgDups.filter(d => d.detection_type === 'exact_iati_id').length}`);
  console.log(`   - Exact Name: ${orgDups.filter(d => d.detection_type === 'exact_name').length}`);
  console.log(`   - Exact Acronym: ${orgDups.filter(d => d.detection_type === 'exact_acronym').length}`);
  console.log(`   - Similar Names: ${orgDups.filter(d => d.detection_type === 'similar_name').length}`);
  
  console.log(`\n✅ Total: ${allDuplicates.length} duplicate pairs detected`);
  
  if (dryRun) {
    console.log('\n🔍 DRY RUN COMPLETE - No changes were saved');
  } else {
    console.log('\n✅ Detection complete - Results saved to detected_duplicates table');
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});








import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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

function orderIds(id1: string, id2: string): [string, string] {
  return id1 < id2 ? [id1, id2] : [id2, id1];
}

function datesOverlap(
  start1: string | null, end1: string | null,
  start2: string | null, end2: string | null,
  toleranceDays: number = 90
): boolean {
  if (!start1 && !end1) return true;
  if (!start2 && !end2) return true;
  
  const d1Start = start1 ? new Date(start1) : null;
  const d1End = end1 ? new Date(end1) : null;
  const d2Start = start2 ? new Date(start2) : null;
  const d2End = end2 ? new Date(end2) : null;
  
  const toleranceMs = toleranceDays * 24 * 60 * 60 * 1000;
  
  if (d1Start && d2Start) {
    const diff = Math.abs(d1Start.getTime() - d2Start.getTime());
    if (diff <= toleranceMs) return true;
  }
  
  if (d1Start && d1End && d2Start && d2End) {
    return d1Start <= d2End && d2Start <= d1End;
  }
  
  return true;
}

function extractCrsId(otherIdentifiers: any[] | null): string | null {
  if (!otherIdentifiers || !Array.isArray(otherIdentifiers)) return null;
  const crsEntry = otherIdentifiers.find((id: any) => id.type === 'A2' || id.type === 'a2');
  return crsEntry?.ref || null;
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

/**
 * POST /api/data-clinic/duplicates/refresh
 * 
 * Trigger a fresh detection of duplicates.
 * This is an admin-only operation that clears existing duplicates
 * and re-runs the detection algorithm.
 * 
 * Query params:
 *   - entity_type: 'activity' | 'organization' | 'all' (default: 'all')
 */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get('entity_type') || 'all';

    console.log(`[Data Clinic Duplicates] Starting refresh for: ${entityType}`);

    const duplicates: DetectedDuplicate[] = [];
    const processedPairs = new Set<string>();

    const addDuplicate = (dup: DetectedDuplicate) => {
      const [orderedId1, orderedId2] = orderIds(dup.entity_id_1, dup.entity_id_2);
      const pairKey = `${dup.entity_type}-${orderedId1}-${orderedId2}`;
      
      if (!processedPairs.has(pairKey)) {
        processedPairs.add(pairKey);
        duplicates.push({
          ...dup,
          entity_id_1: orderedId1,
          entity_id_2: orderedId2,
        });
      }
    };

    // Detect activity duplicates
    if (entityType === 'all' || entityType === 'activity') {
      console.log('[Data Clinic Duplicates] Detecting activity duplicates...');
      
      const { data: activities } = await supabase
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
          actual_end_date
        `);

      if (activities && activities.length > 0) {
        // 1. Exact IATI ID matches
        const iatiIdGroups = new Map<string, any[]>();
        for (const activity of activities) {
          if (activity.iati_identifier) {
            const key = normalizeString(activity.iati_identifier);
            if (!iatiIdGroups.has(key)) iatiIdGroups.set(key, []);
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
                  match_details: { field: 'iati_identifier', value: iatiId },
                  is_suggested_link: false,
                });
              }
            }
          }
        }

        // 2. Exact CRS ID matches
        const crsIdGroups = new Map<string, any[]>();
        for (const activity of activities) {
          const crsId = extractCrsId(activity.other_identifiers);
          if (crsId) {
            const key = normalizeString(crsId);
            if (!crsIdGroups.has(key)) crsIdGroups.set(key, []);
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
                  match_details: { field: 'other_identifiers.A2', value: crsId },
                  is_suggested_link: false,
                });
              }
            }
          }
        }

        // 3. Cross-org duplicates (90% similarity, different orgs)
        const crossOrgThreshold = 0.90;
        for (let i = 0; i < activities.length; i++) {
          const a1 = activities[i];
          if (!a1.title_narrative || !a1.reporting_org_id) continue;
          
          for (let j = i + 1; j < activities.length; j++) {
            const a2 = activities[j];
            if (!a2.title_narrative || !a2.reporting_org_id) continue;
            if (a1.reporting_org_id === a2.reporting_org_id) continue;
            
            const similarity = calculateSimilarity(
              normalizeString(a1.title_narrative),
              normalizeString(a2.title_narrative)
            );
            
            if (similarity >= crossOrgThreshold) {
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
                  },
                  is_suggested_link: true,
                });
              }
            }
          }
        }

        // 4. Similar titles within same org (85% similarity)
        const sameOrgThreshold = 0.85;
        const orgActivityGroups = new Map<string, any[]>();
        for (const activity of activities) {
          if (activity.reporting_org_id) {
            if (!orgActivityGroups.has(activity.reporting_org_id)) {
              orgActivityGroups.set(activity.reporting_org_id, []);
            }
            orgActivityGroups.get(activity.reporting_org_id)!.push(activity);
          }
        }
        
        for (const [, orgActivities] of orgActivityGroups) {
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
                  },
                  is_suggested_link: false,
                });
              }
            }
          }
        }
      }
    }

    // Detect organization duplicates
    if (entityType === 'all' || entityType === 'organization') {
      console.log('[Data Clinic Duplicates] Detecting organization duplicates...');
      
      const { data: organizations } = await supabase
        .from('organizations')
        .select('id, name, acronym, iati_org_id');

      if (organizations && organizations.length > 0) {
        // 1. Exact IATI org ID matches
        const iatiOrgIdGroups = new Map<string, any[]>();
        for (const org of organizations) {
          if (org.iati_org_id) {
            const key = normalizeString(org.iati_org_id);
            if (!iatiOrgIdGroups.has(key)) iatiOrgIdGroups.set(key, []);
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
                  match_details: { field: 'iati_org_id', value: iatiOrgId },
                  is_suggested_link: false,
                });
              }
            }
          }
        }

        // 2. Exact name matches
        const nameGroups = new Map<string, any[]>();
        for (const org of organizations) {
          if (org.name) {
            const key = normalizeString(org.name);
            if (!nameGroups.has(key)) nameGroups.set(key, []);
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
                  match_details: { field: 'name', value: name },
                  is_suggested_link: false,
                });
              }
            }
          }
        }

        // 3. Exact acronym matches
        const acronymGroups = new Map<string, any[]>();
        for (const org of organizations) {
          if (org.acronym) {
            const key = normalizeString(org.acronym);
            if (!acronymGroups.has(key)) acronymGroups.set(key, []);
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
                  match_details: { field: 'acronym', value: acronym },
                  is_suggested_link: false,
                });
              }
            }
          }
        }

        // 4. Similar names (85% similarity)
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
      }
    }

    // Clear existing duplicates for the entity type(s) being refreshed
    let clearError;
    if (entityType === 'all') {
      const { error } = await supabase
        .from('detected_duplicates')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      clearError = error;
    } else {
      const { error } = await supabase
        .from('detected_duplicates')
        .delete()
        .eq('entity_type', entityType);
      clearError = error;
    }

    // Handle missing table
    if (clearError && clearError.code === '42P01') {
      return NextResponse.json({
        success: false,
        error: 'Database tables not created yet',
        message: 'Please run the SQL migration first: frontend/sql/create_duplicates_tables.sql',
        migrationRequired: true,
        stats: {
          total: duplicates.length,
          activities: duplicates.filter(d => d.entity_type === 'activity').length,
          organizations: duplicates.filter(d => d.entity_type === 'organization').length,
        },
      }, { status: 503 });
    }

    // Save new duplicates
    if (duplicates.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < duplicates.length; i += batchSize) {
        const batch = duplicates.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('detected_duplicates')
          .upsert(batch, {
            onConflict: 'entity_type,entity_id_1,entity_id_2',
            ignoreDuplicates: false,
          });
        
        if (insertError && insertError.code === '42P01') {
          return NextResponse.json({
            success: false,
            error: 'Database tables not created yet',
            message: 'Please run the SQL migration first: frontend/sql/create_duplicates_tables.sql',
            migrationRequired: true,
          }, { status: 503 });
        }
      }
    }

    const activityDups = duplicates.filter(d => d.entity_type === 'activity');
    const orgDups = duplicates.filter(d => d.entity_type === 'organization');

    console.log(`[Data Clinic Duplicates] Refresh complete. Found ${duplicates.length} duplicates.`);

    return NextResponse.json({
      success: true,
      message: `Detection refresh complete`,
      stats: {
        total: duplicates.length,
        activities: activityDups.length,
        organizations: orgDups.length,
        byDetectionType: {
          exact_iati_id: duplicates.filter(d => d.detection_type === 'exact_iati_id').length,
          exact_crs_id: duplicates.filter(d => d.detection_type === 'exact_crs_id').length,
          exact_name: duplicates.filter(d => d.detection_type === 'exact_name').length,
          exact_acronym: duplicates.filter(d => d.detection_type === 'exact_acronym').length,
          cross_org: duplicates.filter(d => d.detection_type === 'cross_org').length,
          similar_name: duplicates.filter(d => d.detection_type === 'similar_name').length,
        },
      },
    });
  } catch (error) {
    console.error('[Data Clinic Duplicates] Refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error during refresh' },
      { status: 500 }
    );
  }
}







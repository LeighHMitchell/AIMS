import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/data-clinic/duplicates
 * 
 * Fetch detected duplicates with optional filters.
 * Excludes dismissed duplicates.
 * 
 * Query params:
 *   - entity_type: 'activity' | 'organization' (optional)
 *   - confidence: 'high' | 'medium' | 'low' (optional)
 *   - detection_type: string (optional)
 *   - is_suggested_link: 'true' | 'false' (optional)
 *   - limit: number (default 50)
 *   - offset: number (default 0)
 */
export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get('entity_type');
    const confidence = searchParams.get('confidence');
    const detectionType = searchParams.get('detection_type');
    const isSuggestedLink = searchParams.get('is_suggested_link');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // First, get dismissed pairs to exclude
    const { data: dismissals, error: dismissalsError } = await supabase
      .from('duplicate_dismissals')
      .select('entity_type, entity_id_1, entity_id_2');

    // Handle missing table gracefully
    if (dismissalsError && dismissalsError.code === '42P01') {
      console.log('[Data Clinic Duplicates] Tables not created yet. Run the SQL migration: frontend/sql/create_duplicates_tables.sql');
      return NextResponse.json({
        duplicates: [],
        total: 0,
        limit,
        offset,
        message: 'Duplicate detection tables not created yet. Please run the SQL migration.',
        migrationRequired: true,
      });
    }

    const dismissedPairs = new Set(
      (dismissals || []).map(
        (d: any) => `${d.entity_type}-${d.entity_id_1}-${d.entity_id_2}`
      )
    );

    // Build query for duplicates
    let query = supabase
      .from('detected_duplicates')
      .select('*', { count: 'exact' });

    // Apply filters
    if (entityType) {
      query = query.eq('entity_type', entityType);
    }
    if (confidence) {
      query = query.eq('confidence', confidence);
    }
    if (detectionType) {
      query = query.eq('detection_type', detectionType);
    }
    if (isSuggestedLink !== null && isSuggestedLink !== undefined) {
      query = query.eq('is_suggested_link', isSuggestedLink === 'true');
    }

    // Order by confidence (high first), then by detected_at
    query = query
      .order('confidence', { ascending: true }) // 'high' comes before 'low' alphabetically... need custom
      .order('detected_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: duplicates, error, count } = await query;

    if (error) {
      // Handle missing table gracefully
      if (error.code === '42P01') {
        console.log('[Data Clinic Duplicates] detected_duplicates table not created yet.');
        return NextResponse.json({
          duplicates: [],
          total: 0,
          limit,
          offset,
          message: 'Duplicate detection tables not created yet. Please run the SQL migration.',
          migrationRequired: true,
        });
      }
      console.error('[Data Clinic Duplicates] Error fetching duplicates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch duplicates' },
        { status: 500 }
      );
    }

    // Filter out dismissed pairs
    const filteredDuplicates = (duplicates || []).filter((d: any) => {
      const pairKey = `${d.entity_type}-${d.entity_id_1}-${d.entity_id_2}`;
      return !dismissedPairs.has(pairKey);
    });

    // Fetch entity details for each duplicate pair
    const enrichedDuplicates = await enrichDuplicatesWithDetails(
      supabase,
      filteredDuplicates
    );

    return NextResponse.json({
      duplicates: enrichedDuplicates,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Data Clinic Duplicates] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Enrich duplicates with activity/organization details
 */
async function enrichDuplicatesWithDetails(
  supabase: any,
  duplicates: any[]
): Promise<any[]> {
  if (duplicates.length === 0) return [];

  // Collect all entity IDs by type
  const activityIds = new Set<string>();
  const organizationIds = new Set<string>();

  for (const dup of duplicates) {
    if (dup.entity_type === 'activity') {
      activityIds.add(dup.entity_id_1);
      activityIds.add(dup.entity_id_2);
    } else if (dup.entity_type === 'organization') {
      organizationIds.add(dup.entity_id_1);
      organizationIds.add(dup.entity_id_2);
    }
  }

  // Fetch activity details
  const activityMap = new Map<string, any>();
  if (activityIds.size > 0) {
    const { data: activities } = await supabase
      .from('activities')
      .select(`
        id,
        title_narrative,
        acronym,
        iati_identifier,
        other_identifier,
        activity_status,
        reporting_org_id,
        planned_start_date,
        planned_end_date,
        created_by_org_name,
        created_by_org_acronym,
        icon
      `)
      .in('id', Array.from(activityIds));

    for (const activity of activities || []) {
      activityMap.set(activity.id, activity);
    }
  }

  // Fetch organization details with activity/transaction counts
  const organizationMap = new Map<string, any>();
  if (organizationIds.size > 0) {
    const { data: organizations } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        acronym,
        iati_org_id,
        Organisation_Type_Code,
        country_represented,
        logo,
        description,
        created_at
      `)
      .in('id', Array.from(organizationIds));

    // Get activity counts for each organization
    const { data: activityCounts } = await supabase
      .from('activities')
      .select('reporting_org_id')
      .in('reporting_org_id', Array.from(organizationIds));

    const orgActivityCounts = new Map<string, number>();
    for (const ac of activityCounts || []) {
      const count = orgActivityCounts.get(ac.reporting_org_id) || 0;
      orgActivityCounts.set(ac.reporting_org_id, count + 1);
    }

    // Get transaction counts
    const { data: providerCounts } = await supabase
      .from('transactions')
      .select('provider_org_id')
      .in('provider_org_id', Array.from(organizationIds));

    const { data: receiverCounts } = await supabase
      .from('transactions')
      .select('receiver_org_id')
      .in('receiver_org_id', Array.from(organizationIds));

    const orgTransactionCounts = new Map<string, number>();
    for (const tc of [...(providerCounts || []), ...(receiverCounts || [])]) {
      const orgId = tc.provider_org_id || tc.receiver_org_id;
      const count = orgTransactionCounts.get(orgId) || 0;
      orgTransactionCounts.set(orgId, count + 1);
    }

    for (const org of organizations || []) {
      organizationMap.set(org.id, {
        ...org,
        activityCount: orgActivityCounts.get(org.id) || 0,
        transactionCount: orgTransactionCounts.get(org.id) || 0,
      });
    }
  }

  // Enrich duplicates with entity details
  return duplicates.map((dup: any) => {
    if (dup.entity_type === 'activity') {
      const entity1 = activityMap.get(dup.entity_id_1);
      const entity2 = activityMap.get(dup.entity_id_2);
      
      return {
        ...dup,
        entity1: entity1 || { id: dup.entity_id_1, title_narrative: 'Unknown' },
        entity2: entity2 || { id: dup.entity_id_2, title_narrative: 'Unknown' },
      };
    } else if (dup.entity_type === 'organization') {
      const entity1 = organizationMap.get(dup.entity_id_1);
      const entity2 = organizationMap.get(dup.entity_id_2);
      
      // Calculate scores for primary recommendation
      const score1 = calculateOrgScore(entity1);
      const score2 = calculateOrgScore(entity2);
      
      return {
        ...dup,
        entity1: entity1 ? { ...entity1, score: score1 } : { id: dup.entity_id_1, name: 'Unknown', score: 0 },
        entity2: entity2 ? { ...entity2, score: score2 } : { id: dup.entity_id_2, name: 'Unknown', score: 0 },
        recommendedPrimaryId: score1 >= score2 ? dup.entity_id_1 : dup.entity_id_2,
      };
    }
    
    return dup;
  });
}

/**
 * Calculate organization score for primary recommendation
 */
function calculateOrgScore(org: any): number {
  if (!org) return 0;
  
  let score = 0;
  
  // Valid IATI org ID is most important
  if (org.iati_org_id && isValidIatiOrgId(org.iati_org_id)) {
    score += 50;
  }
  
  // More activities = more established
  score += Math.min((org.activityCount || 0) * 2, 20);
  
  // More transactions = more financial data
  score += Math.min((org.transactionCount || 0) * 0.5, 15);
  
  // Has logo = more complete profile
  if (org.logo) score += 5;
  
  // Has description = more complete profile
  if (org.description) score += 5;
  
  // Created earlier = bonus (applied elsewhere based on comparison)
  score += 5;
  
  return score;
}

/**
 * Basic validation of IATI organization identifier format
 */
function isValidIatiOrgId(identifier: string): boolean {
  if (!identifier || typeof identifier !== 'string') return false;
  if (!identifier.includes('-')) return false;
  
  const parts = identifier.split('-');
  if (parts.length < 2) return false;
  
  const registrationAgency = parts[0];
  if (!/^[A-Z0-9]{2,7}$/.test(registrationAgency)) return false;
  
  return true;
}


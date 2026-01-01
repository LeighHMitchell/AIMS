import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/data-clinic/duplicates/stats
 * 
 * Get summary statistics for detected duplicates.
 * Returns counts by entity type, detection type, and confidence level.
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
    // Get dismissed pairs to exclude from counts
    const { data: dismissals, error: dismissalsError } = await supabase
      .from('duplicate_dismissals')
      .select('entity_type, entity_id_1, entity_id_2');

    // Handle missing table gracefully
    if (dismissalsError && dismissalsError.code === '42P01') {
      console.log('[Data Clinic Duplicates Stats] Tables not created yet. Run the SQL migration.');
      return NextResponse.json({
        total: 0,
        activities: {
          total: 0,
          byDetectionType: { exact_iati_id: 0, exact_crs_id: 0, cross_org: 0, similar_name: 0 },
          byConfidence: { high: 0, medium: 0, low: 0 },
          suggestedLinks: 0,
        },
        organizations: {
          total: 0,
          byDetectionType: { exact_iati_id: 0, exact_name: 0, exact_acronym: 0, similar_name: 0 },
          byConfidence: { high: 0, medium: 0, low: 0 },
        },
        byConfidence: { high: 0, medium: 0, low: 0 },
        lastDetectedAt: null,
        dismissals: { total: 0, byAction: { not_duplicate: 0, linked: 0, merged: 0 } },
        migrationRequired: true,
        message: 'Duplicate detection tables not created yet. Please run the SQL migration.',
      });
    }

    const dismissedPairs = new Set(
      (dismissals || []).map(
        (d: any) => `${d.entity_type}-${d.entity_id_1}-${d.entity_id_2}`
      )
    );

    // Fetch all duplicates
    const { data: duplicates, error } = await supabase
      .from('detected_duplicates')
      .select('*');

    if (error) {
      // Handle missing table gracefully
      if (error.code === '42P01') {
        console.log('[Data Clinic Duplicates Stats] detected_duplicates table not created yet.');
        return NextResponse.json({
          total: 0,
          activities: {
            total: 0,
            byDetectionType: { exact_iati_id: 0, exact_crs_id: 0, cross_org: 0, similar_name: 0 },
            byConfidence: { high: 0, medium: 0, low: 0 },
            suggestedLinks: 0,
          },
          organizations: {
            total: 0,
            byDetectionType: { exact_iati_id: 0, exact_name: 0, exact_acronym: 0, similar_name: 0 },
            byConfidence: { high: 0, medium: 0, low: 0 },
          },
          byConfidence: { high: 0, medium: 0, low: 0 },
          lastDetectedAt: null,
          dismissals: { total: 0, byAction: { not_duplicate: 0, linked: 0, merged: 0 } },
          migrationRequired: true,
          message: 'Duplicate detection tables not created yet. Please run the SQL migration.',
        });
      }
      console.error('[Data Clinic Duplicates Stats] Error fetching duplicates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch duplicate stats' },
        { status: 500 }
      );
    }

    // Filter out dismissed pairs
    const activeDuplicates = (duplicates || []).filter((d: any) => {
      const pairKey = `${d.entity_type}-${d.entity_id_1}-${d.entity_id_2}`;
      return !dismissedPairs.has(pairKey);
    });

    // Calculate statistics
    const stats = {
      total: activeDuplicates.length,
      
      // By entity type
      activities: {
        total: 0,
        byDetectionType: {
          exact_iati_id: 0,
          exact_crs_id: 0,
          cross_org: 0,
          similar_name: 0,
        },
        byConfidence: {
          high: 0,
          medium: 0,
          low: 0,
        },
        suggestedLinks: 0,
      },
      
      organizations: {
        total: 0,
        byDetectionType: {
          exact_iati_id: 0,
          exact_name: 0,
          exact_acronym: 0,
          similar_name: 0,
        },
        byConfidence: {
          high: 0,
          medium: 0,
          low: 0,
        },
      },
      
      // Overall by confidence
      byConfidence: {
        high: 0,
        medium: 0,
        low: 0,
      },
      
      // Last detection run
      lastDetectedAt: null as string | null,
      
      // Dismissal stats
      dismissals: {
        total: dismissals?.length || 0,
        byAction: {
          not_duplicate: 0,
          linked: 0,
          merged: 0,
        },
      },
    };

    // Count duplicates
    for (const dup of activeDuplicates) {
      // Overall confidence
      if (dup.confidence === 'high') stats.byConfidence.high++;
      else if (dup.confidence === 'medium') stats.byConfidence.medium++;
      else stats.byConfidence.low++;

      // Track latest detection time
      if (!stats.lastDetectedAt || dup.detected_at > stats.lastDetectedAt) {
        stats.lastDetectedAt = dup.detected_at;
      }

      if (dup.entity_type === 'activity') {
        stats.activities.total++;
        
        // By detection type
        if (dup.detection_type === 'exact_iati_id') stats.activities.byDetectionType.exact_iati_id++;
        else if (dup.detection_type === 'exact_crs_id') stats.activities.byDetectionType.exact_crs_id++;
        else if (dup.detection_type === 'cross_org') stats.activities.byDetectionType.cross_org++;
        else if (dup.detection_type === 'similar_name') stats.activities.byDetectionType.similar_name++;
        
        // By confidence
        if (dup.confidence === 'high') stats.activities.byConfidence.high++;
        else if (dup.confidence === 'medium') stats.activities.byConfidence.medium++;
        else stats.activities.byConfidence.low++;
        
        // Suggested links
        if (dup.is_suggested_link) stats.activities.suggestedLinks++;
        
      } else if (dup.entity_type === 'organization') {
        stats.organizations.total++;
        
        // By detection type
        if (dup.detection_type === 'exact_iati_id') stats.organizations.byDetectionType.exact_iati_id++;
        else if (dup.detection_type === 'exact_name') stats.organizations.byDetectionType.exact_name++;
        else if (dup.detection_type === 'exact_acronym') stats.organizations.byDetectionType.exact_acronym++;
        else if (dup.detection_type === 'similar_name') stats.organizations.byDetectionType.similar_name++;
        
        // By confidence
        if (dup.confidence === 'high') stats.organizations.byConfidence.high++;
        else if (dup.confidence === 'medium') stats.organizations.byConfidence.medium++;
        else stats.organizations.byConfidence.low++;
      }
    }

    // Count dismissals by action
    const { data: dismissalActions } = await supabase
      .from('duplicate_dismissals')
      .select('action_taken');

    for (const d of dismissalActions || []) {
      if (d.action_taken === 'not_duplicate') stats.dismissals.byAction.not_duplicate++;
      else if (d.action_taken === 'linked') stats.dismissals.byAction.linked++;
      else if (d.action_taken === 'merged') stats.dismissals.byAction.merged++;
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Data Clinic Duplicates Stats] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}








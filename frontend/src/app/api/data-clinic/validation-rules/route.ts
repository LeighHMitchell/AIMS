import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { ValidationRulesResponse } from '@/types/validation-rules';

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organization_id');

  if (!organizationId) {
    return NextResponse.json(
      { error: 'organization_id is required' },
      { status: 400 }
    );
  }

  if (!supabase) {
    return NextResponse.json(
      { error: 'Database connection not available' },
      { status: 500 }
    );
  }

  try {
    console.log('[Validation Rules] Fetching validation failures for org:', organizationId);

    // Get current date for comparisons
    const today = new Date().toISOString().split('T')[0];

    // ============================================
    // ACTIVITY RULES
    // ============================================

    // Rule 1: Implementation past planned end date
    const { data: implementationPastEndDate, error: rule1Error } = await supabase
      .from('activities')
      .select('id, title_narrative, iati_identifier, activity_status, planned_end_date, updated_at')
      .eq('reporting_org_id', organizationId)
      .eq('activity_status', '2') // Implementation
      .lt('planned_end_date', today)
      .not('planned_end_date', 'is', null);

    if (rule1Error) {
      console.error('[Validation Rules] Rule 1 error:', rule1Error);
      throw rule1Error;
    }

    // Calculate days past end for Rule 1
    const rule1WithDays = (implementationPastEndDate || []).map(activity => ({
      ...activity,
      days_past_end: Math.floor(
        (new Date().getTime() - new Date(activity.planned_end_date).getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));

    // Rule 2: Implementation with actual end date set
    const { data: implementationWithActualEnd, error: rule2Error } = await supabase
      .from('activities')
      .select('id, title_narrative, iati_identifier, activity_status, actual_end_date, updated_at')
      .eq('reporting_org_id', organizationId)
      .eq('activity_status', '2') // Implementation
      .not('actual_end_date', 'is', null);

    if (rule2Error) {
      console.error('[Validation Rules] Rule 2 error:', rule2Error);
      throw rule2Error;
    }

    // Rule 3: Missing planned start date
    const { data: missingPlannedStart, error: rule3Error } = await supabase
      .from('activities')
      .select('id, title_narrative, iati_identifier, activity_status, created_at, updated_at')
      .eq('reporting_org_id', organizationId)
      .is('planned_start_date', null);

    if (rule3Error) {
      console.error('[Validation Rules] Rule 3 error:', rule3Error);
      throw rule3Error;
    }

    // Rule 4: Missing planned end date
    const { data: missingPlannedEnd, error: rule4Error } = await supabase
      .from('activities')
      .select('id, title_narrative, iati_identifier, planned_start_date, activity_status, updated_at')
      .eq('reporting_org_id', organizationId)
      .is('planned_end_date', null);

    if (rule4Error) {
      console.error('[Validation Rules] Rule 4 error:', rule4Error);
      throw rule4Error;
    }

    // Rule 5: Closed without actual end date
    const { data: closedWithoutActualEnd, error: rule5Error } = await supabase
      .from('activities')
      .select('id, title_narrative, iati_identifier, planned_end_date, activity_status, updated_at')
      .eq('reporting_org_id', organizationId)
      .eq('activity_status', '4') // Closed
      .is('actual_end_date', null);

    if (rule5Error) {
      console.error('[Validation Rules] Rule 5 error:', rule5Error);
      throw rule5Error;
    }

    // ============================================
    // TRANSACTION RULES
    // ============================================

    // Rule 6: Activities without commitment transactions
    // First get all activities for the org
    const { data: allActivities, error: activitiesError } = await supabase
      .from('activities')
      .select('id, title_narrative, iati_identifier, activity_status, updated_at')
      .eq('reporting_org_id', organizationId);

    if (activitiesError) {
      console.error('[Validation Rules] Activities query error:', activitiesError);
      throw activitiesError;
    }

    // Get commitment transactions for these activities
    const activityIds = (allActivities || []).map(a => a.id);
    let activitiesWithCommitments = new Set<string>();

    if (activityIds.length > 0) {
      const { data: commitments, error: commitmentsError } = await supabase
        .from('transactions')
        .select('activity_id')
        .in('activity_id', activityIds)
        .in('transaction_type', ['1', '2']); // Incoming and Outgoing Commitments

      if (commitmentsError) {
        console.error('[Validation Rules] Commitments query error:', commitmentsError);
        throw commitmentsError;
      }

      activitiesWithCommitments = new Set((commitments || []).map(t => t.activity_id));
    }

    // Get transaction counts for all activities
    const { data: transactionCounts, error: txCountError } = await supabase
      .from('transactions')
      .select('activity_id');

    if (txCountError) {
      console.error('[Validation Rules] Transaction count error:', txCountError);
      throw txCountError;
    }

    // Count transactions per activity
    const txCountMap = new Map<string, number>();
    (transactionCounts || []).forEach(t => {
      txCountMap.set(t.activity_id, (txCountMap.get(t.activity_id) || 0) + 1);
    });

    // Filter activities without commitments
    const noCommitmentTransaction = (allActivities || [])
      .filter(a => !activitiesWithCommitments.has(a.id))
      .map(a => ({
        ...a,
        transaction_count: txCountMap.get(a.id) || 0,
      }));

    // ============================================
    // LOCATION RULES
    // ============================================

    // Get all locations for the org's activities
    let locationsByActivity = new Map<string, any[]>();

    if (activityIds.length > 0) {
      const { data: locations, error: locationsError } = await supabase
        .from('activity_locations')
        .select('id, activity_id, location_name, percentage_allocation, admin_level')
        .in('activity_id', activityIds);

      if (locationsError) {
        console.error('[Validation Rules] Locations query error:', locationsError);
        throw locationsError;
      }

      // Group locations by activity
      (locations || []).forEach(loc => {
        const existing = locationsByActivity.get(loc.activity_id) || [];
        existing.push(loc);
        locationsByActivity.set(loc.activity_id, existing);
      });
    }

    // Rule 7: Location percentages don't sum to 100%
    const percentageNotHundred: any[] = [];
    locationsByActivity.forEach((locs, activityId) => {
      if (locs.length === 0) return;

      const totalPercentage = locs.reduce((sum, loc) => sum + (loc.percentage_allocation || 0), 0);

      // Only flag if they have locations with percentages that don't sum to 100
      // Skip if all percentages are null/0 (might be intentional)
      const hasPercentages = locs.some(loc => loc.percentage_allocation && loc.percentage_allocation > 0);

      if (hasPercentages && Math.abs(totalPercentage - 100) > 0.01) {
        const activity = allActivities?.find(a => a.id === activityId);
        if (activity) {
          percentageNotHundred.push({
            ...activity,
            total_percentage: totalPercentage,
            location_count: locs.length,
          });
        }
      }
    });

    // Rule 8: No locations
    const noLocations = (allActivities || [])
      .filter(a => !locationsByActivity.has(a.id) || locationsByActivity.get(a.id)!.length === 0)
      .map(a => ({
        ...a,
      }));

    // Rule 9: Mixed admin levels
    const mixedAdminLevels: any[] = [];
    locationsByActivity.forEach((locs, activityId) => {
      const adminLevels = Array.from(new Set(locs.map(loc => loc.admin_level).filter(Boolean)));

      if (adminLevels.length > 1) {
        const activity = allActivities?.find(a => a.id === activityId);
        if (activity) {
          mixedAdminLevels.push({
            ...activity,
            distinct_admin_levels: adminLevels.length,
            location_count: locs.length,
            admin_levels: adminLevels,
          });
        }
      }
    });

    // Rule 10: Zero percent location
    const zeroPercentLocation: any[] = [];
    locationsByActivity.forEach((locs, activityId) => {
      const zeroLocs = locs.filter(loc => loc.percentage_allocation === 0);

      zeroLocs.forEach(loc => {
        const activity = allActivities?.find(a => a.id === activityId);
        if (activity) {
          zeroPercentLocation.push({
            ...activity,
            location_name: loc.location_name || 'Unnamed Location',
            percentage_allocation: loc.percentage_allocation,
          });
        }
      });
    });

    // ============================================
    // PARTICIPATING ORGANISATION RULES
    // ============================================

    // Get all participating organisations for the org's activities
    let participatingOrgsByActivity = new Map<string, any[]>();

    if (activityIds.length > 0) {
      const { data: participatingOrgs, error: partOrgsError } = await supabase
        .from('activity_participating_organizations')
        .select('id, activity_id, role_type, iati_role_code')
        .in('activity_id', activityIds);

      if (partOrgsError) {
        console.error('[Validation Rules] Participating orgs query error:', partOrgsError);
        throw partOrgsError;
      }

      // Group participating orgs by activity
      (participatingOrgs || []).forEach(org => {
        const existing = participatingOrgsByActivity.get(org.activity_id) || [];
        existing.push(org);
        participatingOrgsByActivity.set(org.activity_id, existing);
      });
    }

    // Rule 11: No implementing organisation
    const noImplementingOrg = (allActivities || [])
      .filter(a => {
        const orgs = participatingOrgsByActivity.get(a.id) || [];
        // Check if any org has role_type = 'implementing' or iati_role_code = 4
        const hasImplementing = orgs.some(org =>
          org.role_type === 'implementing' || org.iati_role_code === 4
        );
        return !hasImplementing;
      })
      .map(a => ({
        ...a,
        participating_org_count: participatingOrgsByActivity.get(a.id)?.length || 0,
      }));

    // ============================================
    // SECTOR RULES
    // ============================================

    // Get all sectors for the org's activities
    let sectorsByActivity = new Map<string, any[]>();

    if (activityIds.length > 0) {
      const { data: sectors, error: sectorsError } = await supabase
        .from('activity_sectors')
        .select('id, activity_id, sector_code, sector_name, percentage')
        .in('activity_id', activityIds);

      if (sectorsError) {
        console.error('[Validation Rules] Sectors query error:', sectorsError);
        throw sectorsError;
      }

      // Group sectors by activity
      (sectors || []).forEach(sector => {
        const existing = sectorsByActivity.get(sector.activity_id) || [];
        existing.push(sector);
        sectorsByActivity.set(sector.activity_id, existing);
      });
    }

    // Rule 12: Sector percentages don't sum to 100%
    const sectorPercentageNotHundred: any[] = [];
    sectorsByActivity.forEach((sectors, activityId) => {
      if (sectors.length === 0) return;

      const totalPercentage = sectors.reduce((sum, sector) => sum + (sector.percentage || 0), 0);

      // Only flag if they have sectors with percentages that don't sum to 100
      const hasPercentages = sectors.some(sector => sector.percentage && sector.percentage > 0);

      if (hasPercentages && Math.abs(totalPercentage - 100) > 0.01) {
        const activity = allActivities?.find(a => a.id === activityId);
        if (activity) {
          sectorPercentageNotHundred.push({
            ...activity,
            total_sector_percentage: totalPercentage,
            sector_count: sectors.length,
          });
        }
      }
    });

    // Rule 13: Zero percent sector
    const zeroPercentSector: any[] = [];
    sectorsByActivity.forEach((sectors, activityId) => {
      const zeroSectors = sectors.filter(sector => sector.percentage === 0);

      zeroSectors.forEach(sector => {
        const activity = allActivities?.find(a => a.id === activityId);
        if (activity) {
          zeroPercentSector.push({
            ...activity,
            sector_code: sector.sector_code || 'Unknown',
            sector_name: sector.sector_name || 'Unnamed Sector',
            percentage: sector.percentage,
          });
        }
      });
    });

    // Calculate counts
    const activityRulesCount =
      rule1WithDays.length +
      (implementationWithActualEnd?.length || 0) +
      (missingPlannedStart?.length || 0) +
      (missingPlannedEnd?.length || 0) +
      (closedWithoutActualEnd?.length || 0);

    const transactionRulesCount = noCommitmentTransaction.length;

    const locationRulesCount =
      percentageNotHundred.length +
      noLocations.length +
      mixedAdminLevels.length +
      zeroPercentLocation.length;

    const participatingOrgRulesCount = noImplementingOrg.length;

    const sectorRulesCount =
      sectorPercentageNotHundred.length +
      zeroPercentSector.length;

    const response: ValidationRulesResponse = {
      activityRules: {
        implementationPastEndDate: rule1WithDays,
        implementationWithActualEnd: implementationWithActualEnd || [],
        missingPlannedStart: missingPlannedStart || [],
        missingPlannedEnd: missingPlannedEnd || [],
        closedWithoutActualEnd: closedWithoutActualEnd || [],
      },
      transactionRules: {
        noCommitmentTransaction,
      },
      locationRules: {
        percentageNotHundred,
        noLocations,
        mixedAdminLevels,
        zeroPercentLocation,
      },
      participatingOrgRules: {
        noImplementingOrg,
      },
      sectorRules: {
        sectorPercentageNotHundred,
        zeroPercentSector,
      },
      counts: {
        activityRules: activityRulesCount,
        transactionRules: transactionRulesCount,
        locationRules: locationRulesCount,
        participatingOrgRules: participatingOrgRulesCount,
        sectorRules: sectorRulesCount,
        total: activityRulesCount + transactionRulesCount + locationRulesCount + participatingOrgRulesCount + sectorRulesCount,
      },
    };

    console.log('[Validation Rules] Counts:', response.counts);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Validation Rules] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch validation rules data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

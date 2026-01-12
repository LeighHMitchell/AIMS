import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

interface SectorSummary {
  sectorCode: string;
  sectorName: string;
  newCommitments: number;
  plannedDisbursements: number;
  actualDisbursements: number;
  budgets: number;
  numberOfProjects: number;
  numberOfOrganisations: number;
}

// Helper to get sector code at specified grouping level
function getSectorCodeAtLevel(sectorCode: string, level: '1' | '3' | '5'): string {
  const codeStr = sectorCode.toString().padStart(5, '0');
  switch (level) {
    case '1':
      return codeStr.substring(0, 1);
    case '3':
      return codeStr.substring(0, 3);
    case '5':
    default:
      return codeStr;
  }
}

// DAC 5-digit sector category names (1-digit level)
const SECTOR_CATEGORIES: Record<string, string> = {
  '1': 'Social Infrastructure & Services',
  '2': 'Economic Infrastructure & Services',
  '3': 'Production Sectors',
  '4': 'Multi-Sector',
  '5': 'Commodity Aid & General Program Assistance',
  '6': 'Action Relating to Debt',
  '7': 'Humanitarian Aid',
  '9': 'Unallocated / Unspecified',
  '0': 'Admin Costs of Donors'
};

/**
 * Calculate pro-rata allocation for a period-spanning item
 * @param amount - The total amount to allocate
 * @param periodStart - Start of the budget/planned disbursement period
 * @param periodEnd - End of the budget/planned disbursement period
 * @param viewStart - Start of the view/filter date range
 * @param viewEnd - End of the view/filter date range
 * @returns The pro-rata allocated amount
 */
function calculateProRataAllocation(
  amount: number,
  periodStart: Date,
  periodEnd: Date,
  viewStart: Date,
  viewEnd: Date
): number {
  // Calculate the overlap between the two date ranges
  const overlapStart = new Date(Math.max(periodStart.getTime(), viewStart.getTime()));
  const overlapEnd = new Date(Math.min(periodEnd.getTime(), viewEnd.getTime()));

  // If no overlap, return 0
  if (overlapStart > overlapEnd) {
    return 0;
  }

  // Calculate days
  const msPerDay = 1000 * 60 * 60 * 24;
  const totalPeriodDays = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / msPerDay) + 1);
  const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / msPerDay) + 1;

  // Pro-rata allocation
  return amount * (overlapDays / totalPeriodDays);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const searchParams = request.nextUrl.searchParams;

    // Get filter parameters
    const dateFrom = searchParams.get('dateFrom'); // ISO date string e.g., "2024-01-01"
    const dateTo = searchParams.get('dateTo'); // ISO date string e.g., "2024-12-31"
    const groupByLevel = (searchParams.get('groupByLevel') || '5') as '1' | '3' | '5';

    // Parse dates - if not provided, use a wide range
    const viewStart = dateFrom ? new Date(dateFrom) : new Date('2000-01-01');
    const viewEnd = dateTo ? new Date(dateTo) : new Date('2099-12-31');

    // Set time to start/end of day
    viewStart.setHours(0, 0, 0, 0);
    viewEnd.setHours(23, 59, 59, 999);

    // Fetch all activities with their sectors, reporting org, and date fields
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        reporting_org_id,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        actual_end_date,
        activity_sectors (
          sector_code,
          sector_name,
          percentage
        )
      `);

    if (activitiesError) {
      console.error('[SectorDisbursementSummary] Error fetching activities:', activitiesError);
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }

    const activityIds = activities?.map(a => a.id) || [];

    if (activityIds.length === 0) {
      return NextResponse.json({
        sectors: [],
        dateRange: { from: dateFrom, to: dateTo }
      });
    }

    // Fetch all activity contributors (all types - we'll count unique orgs per sector)
    const { data: contributors, error: contributorsError } = await supabase
      .from('activity_contributors')
      .select('activity_id, organization_id, contribution_type')
      .in('activity_id', activityIds);

    if (contributorsError) {
      console.error('[SectorDisbursementSummary] Error fetching contributors:', contributorsError);
    }

    // Build a map of activity_id -> Set of org IDs (from contributors)
    const activityOrgsMap = new Map<string, Set<string>>();
    contributors?.forEach(contrib => {
      if (contrib.organization_id) {
        if (!activityOrgsMap.has(contrib.activity_id)) {
          activityOrgsMap.set(contrib.activity_id, new Set());
        }
        activityOrgsMap.get(contrib.activity_id)!.add(contrib.organization_id);
      }
    });

    // Also add reporting_org_id as an org for each activity (as fallback)
    activities?.forEach(activity => {
      if (activity.reporting_org_id) {
        if (!activityOrgsMap.has(activity.id)) {
          activityOrgsMap.set(activity.id, new Set());
        }
        activityOrgsMap.get(activity.id)!.add(activity.reporting_org_id);
      }
    });

    // Fetch all commitments (transaction_type = '2') within date range
    const { data: commitments, error: commitmentsError } = await supabase
      .from('transactions')
      .select('activity_id, transaction_date, value_usd')
      .in('activity_id', activityIds)
      .eq('transaction_type', '2')
      .eq('status', 'actual')
      .gte('transaction_date', viewStart.toISOString().split('T')[0])
      .lte('transaction_date', viewEnd.toISOString().split('T')[0]);

    if (commitmentsError) {
      console.error('[SectorDisbursementSummary] Error fetching commitments:', commitmentsError);
    }

    // Fetch all planned disbursements (with period_start and period_end for pro-rata)
    const { data: plannedDisbursements, error: plannedError } = await supabase
      .from('planned_disbursements')
      .select('activity_id, usd_amount, period_start, period_end');

    if (plannedError) {
      console.error('[SectorDisbursementSummary] Error fetching planned disbursements:', plannedError);
    }

    // Fetch all activity budgets (with period_start and period_end for pro-rata)
    const { data: budgets, error: budgetsError } = await supabase
      .from('activity_budgets')
      .select('activity_id, usd_value, period_start, period_end');

    if (budgetsError) {
      console.error('[SectorDisbursementSummary] Error fetching budgets:', budgetsError);
    }

    // Calculate actual data range (min/max dates with data)
    let dataMinDate: Date | null = null;
    let dataMaxDate: Date | null = null;

    // Helper to update min/max dates
    const updateDataRange = (dateStr: string | null) => {
      if (!dateStr) return;
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        if (!dataMinDate || date < dataMinDate) dataMinDate = date;
        if (!dataMaxDate || date > dataMaxDate) dataMaxDate = date;
      }
    };

    // Fetch all actual disbursements (transaction_type = '3') within date range
    const { data: disbursements, error: disbursementsError } = await supabase
      .from('transactions')
      .select('activity_id, transaction_date, value_usd')
      .in('activity_id', activityIds)
      .eq('transaction_type', '3')
      .eq('status', 'actual')
      .gte('transaction_date', viewStart.toISOString().split('T')[0])
      .lte('transaction_date', viewEnd.toISOString().split('T')[0]);

    if (disbursementsError) {
      console.error('[SectorDisbursementSummary] Error fetching disbursements:', disbursementsError);
    }

    // Fetch all transactions (for data range calculation - without date filter)
    const { data: allTransactions } = await supabase
      .from('transactions')
      .select('transaction_date, value_usd')
      .in('activity_id', activityIds)
      .in('transaction_type', ['2', '3'])
      .eq('status', 'actual')
      .not('value_usd', 'is', null);

    // Update data range from transactions
    allTransactions?.forEach(t => {
      if (t.value_usd && t.value_usd !== 0) {
        updateDataRange(t.transaction_date);
      }
    });

    // Update data range from planned disbursements
    plannedDisbursements?.forEach(pd => {
      if (pd.usd_amount && parseFloat(pd.usd_amount?.toString() || '0') !== 0) {
        updateDataRange(pd.period_start);
        updateDataRange(pd.period_end);
      }
    });

    // Update data range from budgets
    budgets?.forEach(b => {
      if (b.usd_value && parseFloat(b.usd_value?.toString() || '0') !== 0) {
        updateDataRange(b.period_start);
        updateDataRange(b.period_end);
      }
    });

    // Update data range from activity dates (for activity/org counts)
    activities?.forEach(a => {
      // Use actual dates if available, otherwise planned dates
      updateDataRange(a.actual_start_date || a.planned_start_date);
      updateDataRange(a.actual_end_date || a.planned_end_date);
    });

    // Build activity sectors map with grouping support
    const activitySectorsMap = new Map<string, any[]>();
    const allSectors = new Map<string, string>(); // code -> name

    activities?.forEach(activity => {
      if (activity.activity_sectors && activity.activity_sectors.length > 0) {
        // Transform sectors to use grouped codes if needed
        const groupedSectors = activity.activity_sectors.map((sector: any) => {
          const groupedCode = getSectorCodeAtLevel(sector.sector_code, groupByLevel);
          return {
            ...sector,
            original_sector_code: sector.sector_code,
            sector_code: groupedCode,
          };
        });

        activitySectorsMap.set(activity.id, groupedSectors);

        activity.activity_sectors.forEach((sector: any) => {
          const groupedCode = getSectorCodeAtLevel(sector.sector_code, groupByLevel);

          if (!allSectors.has(groupedCode)) {
            // Determine the name based on grouping level
            let sectorName: string;
            if (groupByLevel === '1') {
              sectorName = SECTOR_CATEGORIES[groupedCode] || sector.sector_name;
            } else if (groupByLevel === '3') {
              // For 3-digit, use the first sector name we encounter with this code prefix
              sectorName = sector.sector_name?.split(' - ')[0] || sector.sector_name || `Sector ${groupedCode}`;
            } else {
              sectorName = sector.sector_name;
            }
            allSectors.set(groupedCode, sectorName);
          }
        });
      }
    });

    // Initialize sector data map
    const sectorDataMap = new Map<string, {
      newCommitments: number;
      plannedDisbursements: number;
      actualDisbursements: number;
      budgets: number;
      projectIds: Set<string>;
      organisationIds: Set<string>;
    }>();

    allSectors.forEach((name, code) => {
      sectorDataMap.set(code, {
        newCommitments: 0,
        plannedDisbursements: 0,
        actualDisbursements: 0,
        budgets: 0,
        projectIds: new Set(),
        organisationIds: new Set()
      });
    });

    // Build a map of activity dates for date filtering
    const activityDatesMap = new Map<string, { start: Date | null; end: Date | null }>();
    activities?.forEach(activity => {
      const startDateStr = activity.actual_start_date || activity.planned_start_date;
      const endDateStr = activity.actual_end_date || activity.planned_end_date;
      activityDatesMap.set(activity.id, {
        start: startDateStr ? new Date(startDateStr) : null,
        end: endDateStr ? new Date(endDateStr) : null
      });
    });

    // Track which activities have financial data in the view period
    const activitiesWithFinancialData = new Set<string>();

    // Pre-populate from transactions (already date-filtered)
    commitments?.forEach(c => activitiesWithFinancialData.add(c.activity_id));
    disbursements?.forEach(d => activitiesWithFinancialData.add(d.activity_id));

    // Check planned disbursements for overlap with view period
    plannedDisbursements?.forEach(pd => {
      if (!pd.period_start || !pd.period_end) return;
      const periodStart = new Date(pd.period_start);
      const periodEnd = new Date(pd.period_end);
      if (periodStart <= viewEnd && periodEnd >= viewStart) {
        activitiesWithFinancialData.add(pd.activity_id);
      }
    });

    // Check budgets for overlap with view period
    budgets?.forEach(b => {
      if (!b.period_start || !b.period_end) return;
      const periodStart = new Date(b.period_start);
      const periodEnd = new Date(b.period_end);
      if (periodStart <= viewEnd && periodEnd >= viewStart) {
        activitiesWithFinancialData.add(b.activity_id);
      }
    });

    // Helper to check if an activity was active during the view period
    const isActivityActiveInPeriod = (activityId: string): boolean => {
      // First check if activity has financial data in this period
      if (activitiesWithFinancialData.has(activityId)) return true;

      const dates = activityDatesMap.get(activityId);
      if (!dates) return false;

      // If activity has no dates, include it only if it has financial data (checked above)
      if (!dates.start && !dates.end) return false;

      // Check for overlap between activity period and view period
      const activityStart = dates.start || new Date('1900-01-01');
      const activityEnd = dates.end || new Date('2100-12-31');

      // Activity is active if its period overlaps with the view period
      return activityStart <= viewEnd && activityEnd >= viewStart;
    };

    // Populate projects and organisations based on activity-sector mappings
    // Projects = unique activities per sector (filtered by date)
    // Organisations = unique organisations involved in activities in each sector
    activitySectorsMap.forEach((sectors, activityId) => {
      // Only include activities that were active during the view period
      if (!isActivityActiveInPeriod(activityId)) return;

      const orgs = activityOrgsMap.get(activityId);

      sectors.forEach((sector: any) => {
        const sectorData = sectorDataMap.get(sector.sector_code);
        if (sectorData) {
          sectorData.projectIds.add(activityId);
          // Add all organisations for this activity to this sector
          if (orgs) {
            orgs.forEach(orgId => sectorData.organisationIds.add(orgId));
          }
        }
      });
    });

    // Process commitments (point-in-time, already filtered by date)
    commitments?.forEach(commitment => {
      if (!commitment.transaction_date) return;

      const activitySectors = activitySectorsMap.get(commitment.activity_id) || [];
      const amount = commitment.value_usd || 0;

      activitySectors.forEach((sector: any) => {
        const sectorData = sectorDataMap.get(sector.sector_code);
        if (sectorData) {
          sectorData.newCommitments += amount * (sector.percentage / 100);
        }
      });
    });

    // Process planned disbursements with pro-rata allocation
    plannedDisbursements?.forEach(pd => {
      if (!pd.period_start || !pd.period_end) return;

      const periodStart = new Date(pd.period_start);
      const periodEnd = new Date(pd.period_end);
      const amount = parseFloat(pd.usd_amount?.toString() || '0') || 0;

      // Calculate pro-rata allocation
      const allocatedAmount = calculateProRataAllocation(
        amount,
        periodStart,
        periodEnd,
        viewStart,
        viewEnd
      );

      if (allocatedAmount <= 0) return;

      const activitySectors = activitySectorsMap.get(pd.activity_id) || [];

      activitySectors.forEach((sector: any) => {
        const sectorData = sectorDataMap.get(sector.sector_code);
        if (sectorData) {
          sectorData.plannedDisbursements += allocatedAmount * (sector.percentage / 100);
        }
      });
    });

    // Process budgets with pro-rata allocation
    budgets?.forEach(budget => {
      if (!budget.period_start || !budget.period_end) return;

      const periodStart = new Date(budget.period_start);
      const periodEnd = new Date(budget.period_end);
      const amount = parseFloat(budget.usd_value?.toString() || '0') || 0;

      // Calculate pro-rata allocation
      const allocatedAmount = calculateProRataAllocation(
        amount,
        periodStart,
        periodEnd,
        viewStart,
        viewEnd
      );

      if (allocatedAmount <= 0) return;

      const activitySectors = activitySectorsMap.get(budget.activity_id) || [];

      activitySectors.forEach((sector: any) => {
        const sectorData = sectorDataMap.get(sector.sector_code);
        if (sectorData) {
          sectorData.budgets += allocatedAmount * (sector.percentage / 100);
        }
      });
    });

    // Process actual disbursements (point-in-time, already filtered by date)
    disbursements?.forEach(disbursement => {
      if (!disbursement.transaction_date) return;

      const activitySectors = activitySectorsMap.get(disbursement.activity_id) || [];
      const amount = disbursement.value_usd || 0;

      activitySectors.forEach((sector: any) => {
        const sectorData = sectorDataMap.get(sector.sector_code);
        if (sectorData) {
          sectorData.actualDisbursements += amount * (sector.percentage / 100);
        }
      });
    });

    // Convert to response format and track unique totals across all sectors
    const sectors: SectorSummary[] = [];
    const allUniqueProjectIds = new Set<string>();
    const allUniqueOrganisationIds = new Set<string>();

    sectorDataMap.forEach((data, code) => {
      // Only include sectors that have some data
      if (data.newCommitments > 0 || data.plannedDisbursements > 0 ||
          data.actualDisbursements > 0 || data.budgets > 0 || data.projectIds.size > 0) {
        sectors.push({
          sectorCode: code,
          sectorName: allSectors.get(code) || 'Unknown',
          newCommitments: data.newCommitments,
          plannedDisbursements: data.plannedDisbursements,
          actualDisbursements: data.actualDisbursements,
          budgets: data.budgets,
          numberOfProjects: data.projectIds.size,
          numberOfOrganisations: data.organisationIds.size
        });

        // Add to global unique sets
        data.projectIds.forEach(id => allUniqueProjectIds.add(id));
        data.organisationIds.forEach(id => allUniqueOrganisationIds.add(id));
      }
    });

    // Sort sectors by total value (descending)
    sectors.sort((a, b) => {
      const totalA = a.newCommitments + a.plannedDisbursements + a.actualDisbursements + a.budgets;
      const totalB = b.newCommitments + b.plannedDisbursements + b.actualDisbursements + b.budgets;
      return totalB - totalA;
    });

    return NextResponse.json({
      sectors,
      totals: {
        uniqueProjects: allUniqueProjectIds.size,
        uniqueOrganisations: allUniqueOrganisationIds.size
      },
      dateRange: {
        from: dateFrom || viewStart.toISOString().split('T')[0],
        to: dateTo || viewEnd.toISOString().split('T')[0]
      },
      dataRange: dataMinDate && dataMaxDate ? {
        min: dataMinDate.toISOString().split('T')[0],
        max: dataMaxDate.toISOString().split('T')[0]
      } : null
    });
  } catch (error) {
    console.error('[SectorDisbursementSummary] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

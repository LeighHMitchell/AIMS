import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { excludeInternalTransfers, getPooledFundIds } from '@/lib/analytics-transaction-filters';
import sectorGroupData from '@/data/SectorGroup.json';
import {
  allocateAcrossCalendarYears,
  allocateAcrossFiscalYears,
  getFiscalYearForDate,
} from '@/utils/year-allocation';
import { fetchCustomYearById } from '@/lib/custom-year-server';
import { getCustomYearLabel } from '@/types/custom-years';

// Build sector hierarchy lookup map for O(1) access
interface SectorHierarchy {
  groupCode: string;
  groupName: string;
  categoryCode: string;
  categoryName: string;
}

const sectorHierarchyMap = new Map<string, SectorHierarchy>();
(sectorGroupData.data as any[]).forEach((sector) => {
  sectorHierarchyMap.set(sector.code, {
    groupCode: sector['codeforiati:group-code'] || '998',
    groupName: sector['codeforiati:group-name'] || 'Other / Uncategorized',
    categoryCode: sector['codeforiati:category-code'] || '998',
    categoryName: sector['codeforiati:category-name'] || 'Unallocated / Unspecified',
  });
});

// Default hierarchy for sectors not in the lookup
const defaultHierarchy: SectorHierarchy = {
  groupCode: '998',
  groupName: 'Other / Uncategorized',
  categoryCode: '998',
  categoryName: 'Unallocated / Unspecified',
};

function getSectorHierarchy(sectorCode: string): SectorHierarchy {
  return sectorHierarchyMap.get(sectorCode) || defaultHierarchy;
}

// All 13 IATI transaction type codes — mirrors the metric set used by the
// External Development Partners Financial Overview chart so both charts can
// share the same metric dropdown UX.
const TX_TYPE_CODES = ['1','2','3','4','5','6','7','8','9','10','11','12','13'] as const;
type TxCode = typeof TX_TYPE_CODES[number];

type YearMetrics = {
  label: string;
  // Legacy keys preserved for callers that read them directly
  // (DashboardDisbursementsBySection, SectorDistributionChart, sector-views/types).
  planned: number;
  actual: number;
  // New per-metric keys, additive.
  budgets: number;
} & Record<`tx_${TxCode}`, number>;

const makeEmptyYearMetrics = (label: string): YearMetrics => {
  const base = { label, planned: 0, actual: 0, budgets: 0 } as YearMetrics;
  for (const code of TX_TYPE_CODES) {
    (base as any)[`tx_${code}`] = 0;
  }
  return base;
};

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const searchParams = request.nextUrl.searchParams;

    // Get filter parameters
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const country = searchParams.get('country');
    const donor = searchParams.get('donor');
    const sector = searchParams.get('sector');
    const organizationId = searchParams.get('organizationId');
    const customYearId = searchParams.get('customYearId');

    const customYear = await fetchCustomYearById(supabase, customYearId);

    // Fetch all activities with their sectors
    let activitiesQuery = supabase
      .from('activities')
      .select(`
        id,
        activity_sectors (
          sector_code,
          sector_name,
          percentage
        )
      `);

    // Filter by organization if provided (where org is reporting org)
    if (organizationId) {
      activitiesQuery = activitiesQuery
        .eq('reporting_org_id', organizationId)
        .eq('publication_status', 'published');
    }

    const { data: activities, error: activitiesError } = await activitiesQuery;

    if (activitiesError) {
      console.error('[DisbursementsBySector] Error fetching activities:', activitiesError);
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }

    // Get activity IDs
    const activityIds = activities?.map(a => a.id) || [];

    if (activityIds.length === 0) {
      return NextResponse.json({ sectors: [] });
    }

    // Fetch planned disbursements with filters
    let plannedQuery = supabase
      .from('planned_disbursements')
      .select('activity_id, amount, usd_amount, currency, period_start, period_end')
      .in('activity_id', activityIds);

    if (dateFrom) {
      plannedQuery = plannedQuery.gte('period_start', dateFrom);
    }
    if (dateTo) {
      plannedQuery = plannedQuery.lte('period_start', dateTo);
    }

    const { data: plannedDisbursements, error: plannedError } = await plannedQuery;

    if (plannedError) {
      console.error('[DisbursementsBySector] Error fetching planned disbursements:', plannedError);
      return NextResponse.json({ error: 'Failed to fetch planned disbursements' }, { status: 500 });
    }

    // Fetch activity budgets. Budgets are period-spanning like planned
    // disbursements, so we pro-rate across years the same way.
    let budgetsQuery = supabase
      .from('activity_budgets')
      .select('activity_id, usd_value, period_start, period_end')
      .in('activity_id', activityIds);

    if (dateFrom) {
      budgetsQuery = budgetsQuery.gte('period_start', dateFrom);
    }
    if (dateTo) {
      budgetsQuery = budgetsQuery.lte('period_start', dateTo);
    }

    const { data: activityBudgets, error: budgetsError } = await budgetsQuery;

    if (budgetsError) {
      console.error('[DisbursementsBySector] Error fetching budgets:', budgetsError);
      // Non-fatal: continue with empty budgets so other metrics still resolve.
    }

    // Fetch transactions for ALL 13 IATI transaction types. We bucket each
    // into its `tx_<code>` field; `actual` is preserved as an alias of tx_3
    // for back-compat with callers reading the old shape.
    let transactionsQuery = supabase
      .from('transactions')
      .select(`
        uuid,
        activity_id,
        transaction_type,
        transaction_date,
        value,
        value_usd,
        currency,
        sector_code,
        provider_org_id,
        recipient_country_code
      `)
      .in('activity_id', activityIds)
      .in('transaction_type', TX_TYPE_CODES as unknown as string[])
      .eq('status', 'actual');
    // Exclude internal transfers (pooled fund flows). With all 13 types in
    // play, the helper applies both incoming and outgoing exclusions.
    const pooledFundIds = await getPooledFundIds(supabase);
    transactionsQuery = excludeInternalTransfers(
      transactionsQuery,
      pooledFundIds,
      TX_TYPE_CODES as unknown as string[]
    );

    if (dateFrom) {
      transactionsQuery = transactionsQuery.gte('transaction_date', dateFrom);
    }
    if (dateTo) {
      transactionsQuery = transactionsQuery.lte('transaction_date', dateTo);
    }
    if (donor && donor !== 'all') {
      transactionsQuery = transactionsQuery.eq('provider_org_id', donor);
    }
    if (country && country !== 'all') {
      transactionsQuery = transactionsQuery.eq('recipient_country_code', country);
    }

    const { data: transactions, error: transactionsError } = await transactionsQuery;

    if (transactionsError) {
      console.error('[DisbursementsBySector] Error fetching transactions:', transactionsError);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    // Fetch transaction sector lines for granular sector allocation
    const transactionIds = transactions?.map(t => t.uuid) || [];
    let transactionSectorLines: any[] = [];

    if (transactionIds.length > 0) {
      const { data: sectorLines, error: sectorLinesError } = await supabase
        .from('transaction_sector_lines')
        .select('transaction_id, sector_code, sector_name, percentage, amount_minor')
        .in('transaction_id', transactionIds)
        .is('deleted_at', null);

      if (!sectorLinesError && sectorLines) {
        transactionSectorLines = sectorLines;
      }
    }

    // Process data by sector and year (with hierarchy information).
    // Year key is the fiscal-year integer (matches calendar year when no customYear
    // is supplied), and we keep the display label alongside for the client.
    const sectorDataMap = new Map<string, {
      sectorCode: string;
      sectorName: string;
      groupCode: string;
      groupName: string;
      categoryCode: string;
      categoryName: string;
      yearlyData: Map<number, YearMetrics>;
    }>();

    const yearLabel = (year: number): string =>
      customYear ? getCustomYearLabel(customYear, year) : year.toString();

    const getOrCreateYear = (
      sectorEntry: { yearlyData: Map<number, YearMetrics> },
      year: number,
      label: string,
    ): YearMetrics => {
      let y = sectorEntry.yearlyData.get(year);
      if (!y) {
        y = makeEmptyYearMetrics(label);
        sectorEntry.yearlyData.set(year, y);
      }
      return y;
    };

    // Build activity sectors map. Alongside, track distinct activity ids per
    // hierarchy level so the client can show "N activities linked to this
    // sector category / sector / sub-sector" without double-counting an
    // activity that spans multiple sub-sectors within the same parent.
    // Counts are linkage-based (any activity tagged with the code), not
    // value- or date-filtered.
    const activitySectorsMap = new Map<string, any[]>();
    const activitiesByGroup = new Map<string, Set<string>>();
    const activitiesByCategory = new Map<string, Set<string>>();
    const activitiesBySector = new Map<string, Set<string>>();
    const addActivityToLevel = (map: Map<string, Set<string>>, code: string, activityId: string) => {
      let set = map.get(code);
      if (!set) {
        set = new Set();
        map.set(code, set);
      }
      set.add(activityId);
    };
    activities?.forEach(activity => {
      if (activity.activity_sectors && activity.activity_sectors.length > 0) {
        activitySectorsMap.set(activity.id, activity.activity_sectors);

        // Initialize sectors in our map with hierarchy info
        activity.activity_sectors.forEach((sector: any) => {
          const hierarchy = getSectorHierarchy(sector.sector_code);
          if (!sectorDataMap.has(sector.sector_code)) {
            sectorDataMap.set(sector.sector_code, {
              sectorCode: sector.sector_code,
              sectorName: sector.sector_name,
              groupCode: hierarchy.groupCode,
              groupName: hierarchy.groupName,
              categoryCode: hierarchy.categoryCode,
              categoryName: hierarchy.categoryName,
              yearlyData: new Map()
            });
          }
          // Distinct-activity tracking per level.
          addActivityToLevel(activitiesByGroup, hierarchy.groupCode, activity.id);
          addActivityToLevel(activitiesByCategory, hierarchy.categoryCode, activity.id);
          addActivityToLevel(activitiesBySector, sector.sector_code, activity.id);
        });
      }
    });

    // Helper: pro-rate a period-spanning record (planned disbursement, budget)
    // across the selected fiscal/calendar years.
    const allocatePeriodAcrossYears = (
      periodStart: string,
      periodEnd: string | null | undefined,
      amount: number,
    ): Array<{ year: number; label: string; amount: number }> => {
      const end = periodEnd || periodStart;
      return customYear
        ? allocateAcrossFiscalYears(periodStart, end, amount, customYear).map(a => ({
            year: a.fiscalYear,
            label: a.label,
            amount: a.amount,
          }))
        : allocateAcrossCalendarYears(periodStart, end, amount).map(a => ({
            year: a.year,
            label: a.year.toString(),
            amount: a.amount,
          }));
    };

    // Process planned disbursements — pro-rate USD amount across years and
    // sectors using the activity's sector percentages.
    plannedDisbursements?.forEach(pd => {
      if (!pd.period_start) return;

      const amount = parseFloat(pd.usd_amount?.toString() || '0') || 0;
      if (amount === 0) return;

      const activitySectors = activitySectorsMap.get(pd.activity_id) || [];
      if (activitySectors.length === 0) return;

      const yearAllocations = allocatePeriodAcrossYears(pd.period_start, pd.period_end, amount);

      activitySectors.forEach(sector => {
        const sectorData = sectorDataMap.get(sector.sector_code);
        if (!sectorData) return;

        yearAllocations.forEach(allocation => {
          const y = getOrCreateYear(sectorData, allocation.year, allocation.label);
          y.planned += allocation.amount * (sector.percentage / 100);
        });
      });
    });

    // Process activity budgets — same pro-rata pattern as planned disbursements.
    activityBudgets?.forEach((budget: any) => {
      if (!budget.period_start) return;

      const amount = parseFloat(budget.usd_value?.toString() || '0') || 0;
      if (amount === 0) return;

      const activitySectors = activitySectorsMap.get(budget.activity_id) || [];
      if (activitySectors.length === 0) return;

      const yearAllocations = allocatePeriodAcrossYears(budget.period_start, budget.period_end, amount);

      activitySectors.forEach(sector => {
        const sectorData = sectorDataMap.get(sector.sector_code);
        if (!sectorData) return;

        yearAllocations.forEach(allocation => {
          const y = getOrCreateYear(sectorData, allocation.year, allocation.label);
          y.budgets += allocation.amount * (sector.percentage / 100);
        });
      });
    });

    // Process transactions — bucket by year and by IATI transaction type.
    // Each transaction contributes to `tx_<code>`; the type 3 path also
    // increments the legacy `actual` field to keep the old response shape valid.
    transactions?.forEach(transaction => {
      if (!transaction.transaction_date) return;

      const code = String(transaction.transaction_type || '').trim() as TxCode;
      if (!(TX_TYPE_CODES as readonly string[]).includes(code)) return;

      const txDate = new Date(transaction.transaction_date);
      const year = customYear
        ? getFiscalYearForDate(txDate, customYear)
        : txDate.getFullYear();
      const label = yearLabel(year);
      const transactionValue = transaction.value_usd || 0;
      const activitySectors = activitySectorsMap.get(transaction.activity_id) || [];
      const txKey = `tx_${code}` as keyof YearMetrics;
      const isActual = code === '3';

      // Check if this transaction has sector lines
      const sectorLines = transactionSectorLines.filter(
        sl => sl.transaction_id === transaction.uuid
      );

      const applyToSector = (sectorCode: string, sectorName: string, share: number) => {
        let sectorData = sectorDataMap.get(sectorCode);
        if (!sectorData) {
          const hierarchy = getSectorHierarchy(sectorCode);
          sectorData = {
            sectorCode,
            sectorName,
            groupCode: hierarchy.groupCode,
            groupName: hierarchy.groupName,
            categoryCode: hierarchy.categoryCode,
            categoryName: hierarchy.categoryName,
            yearlyData: new Map(),
          };
          sectorDataMap.set(sectorCode, sectorData);
        }

        const y = getOrCreateYear(sectorData, year, label);
        const portion = transactionValue * share;
        (y as any)[txKey] = ((y as any)[txKey] || 0) + portion;
        if (isActual) y.actual += portion;
      };

      if (sectorLines.length > 0) {
        sectorLines.forEach(line => {
          applyToSector(line.sector_code, line.sector_name, (line.percentage || 0) / 100);
        });
      } else if (transaction.sector_code) {
        applyToSector(transaction.sector_code, 'Unknown Sector', 1);
      } else {
        activitySectors.forEach(sector => {
          // Only contribute to sectors that the activity already declares —
          // matches the original logic which used `sectorDataMap.get` (no upsert).
          if (!sectorDataMap.has(sector.sector_code)) return;
          applyToSector(sector.sector_code, sector.sector_name, (sector.percentage || 0) / 100);
        });
      }
    });

    // Filter by sector if specified
    let resultSectors = Array.from(sectorDataMap.values());
    if (sector && sector !== 'all') {
      resultSectors = resultSectors.filter(s => s.sectorCode === sector);
    }

    // Collapse the distinct-activity sets into plain count maps keyed by code,
    // one map per hierarchy level. The client picks the map matching the
    // currently-displayed level (group / category / sub-sector).
    const countsFromSets = (map: Map<string, Set<string>>): Record<string, number> => {
      const out: Record<string, number> = {};
      map.forEach((set, code) => { out[code] = set.size; });
      return out;
    };

    // Convert to response format (with hierarchy info)
    const result = {
      sectors: resultSectors.map(sector => ({
        sectorCode: sector.sectorCode,
        sectorName: sector.sectorName,
        groupCode: sector.groupCode,
        groupName: sector.groupName,
        categoryCode: sector.categoryCode,
        categoryName: sector.categoryName,
        years: Array.from(sector.yearlyData.entries())
          .map(([year, data]) => ({ year, ...data }))
          .sort((a, b) => a.year - b.year),
      })).filter(s => s.years.length > 0), // Only include sectors with data
      activityCounts: {
        byGroup: countsFromSets(activitiesByGroup),
        byCategory: countsFromSets(activitiesByCategory),
        bySector: countsFromSets(activitiesBySector),
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[DisbursementsBySector] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { fetchTransactionSectorLinesChunked } from '@/lib/sector-spend';
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

// Mirror the Financial Totals card's USD value resolution: prefer value_usd,
// fall back to the raw value only when the transaction is already in USD.
const txUsdValue = (t: { value_usd?: any; value?: any; currency?: any }): number =>
  Number(t.value_usd) || (t.currency === 'USD' ? Number(t.value) || 0 : 0);

// Sentinel code/name for the synthetic bucket holding disbursements (and other
// metrics) that could not be attributed to any sector — either the activity has
// no sector data, or its allocation percentages sum to under 100%.
const UNALLOCATED_CODE = 'N/A';
const UNALLOCATED_LABEL = 'Unallocated / No sector';

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
  // Data-quality split of the transaction sector attribution (additive, optional consumers):
  //   actualUsd  = value attributed via the transaction's own sectors (transaction_sector_lines)
  //   imputedUsd = value attributed by falling back to the activity-level sector %
  actualUsd: number;
  imputedUsd: number;
} & Record<`tx_${TxCode}`, number>;

const makeEmptyYearMetrics = (label: string): YearMetrics => {
  const base = { label, planned: 0, actual: 0, budgets: 0, actualUsd: 0, imputedUsd: 0 } as YearMetrics;
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

    // Fetch all activities with their sectors.
    // Restrict to published + non-deleted so the universe matches the
    // Financial Totals card (canonical aggregation: published-only). This
    // makes the "Unallocated" bucket below reconcile exactly with that card.
    let activitiesQuery = supabase
      .from('activities')
      .select(`
        id,
        activity_sectors (
          sector_code,
          sector_name,
          percentage
        )
      `)
      .is('deleted_at', null)
      .eq('publication_status', 'published');

    // Filter by organization if provided (where org is reporting org)
    if (organizationId) {
      activitiesQuery = activitiesQuery.eq('reporting_org_id', organizationId);
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
      .eq('status', 'actual')
      // Match the Financial Totals card: exclude soft-deleted transactions.
      .is('deleted_at', null);
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
    // Chunked fetch: a single `.in(...)` with hundreds of UUIDs fails/returns nothing (and risks
    // the ~1000-row cap), which silently dropped transaction-level sectors from the breakdown.
    const transactionSectorLines = transactionIds.length > 0
      ? await fetchTransactionSectorLinesChunked(supabase, transactionIds, 'transaction_id, sector_code, sector_name, percentage, amount_minor')
      : [];

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

    // Grand total per year per metric, accumulated independently of sector
    // tagging (same universe as the Financial Totals card). After processing,
    // the residual `total − allocated-to-sectors` becomes the Unallocated
    // bucket so the donut reconciles with that card.
    const totalsByYear = new Map<number, YearMetrics>();
    // Distinct activities that contributed any unallocated portion, so the
    // Unallocated slice can show a meaningful activity count.
    const unallocatedActivityIds = new Set<string>();

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

    const getOrCreateTotalYear = (year: number, label: string): YearMetrics => {
      let y = totalsByYear.get(year);
      if (!y) {
        y = makeEmptyYearMetrics(label);
        totalsByYear.set(year, y);
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

    // For activities that report sectors at the TRANSACTION level (no activity_sectors),
    // derive an effective sector mix from their transactions so their budgets and planned
    // disbursements can still be attributed to sectors (imputed). Value-weighted, with a
    // per-year mix that falls back to the overall mix for years that have no transactions
    // (e.g. a future-year budget).
    type SectorWeight = { code: string; name: string; percentage: number };
    const effectiveSectorsMap = new Map<string, { overall: SectorWeight[]; byYear: Map<number, SectorWeight[]> }>();
    {
      const txById = new Map<string, any>((transactions || []).map((t: any) => [t.uuid, t]));
      type Bucket = { map: Map<string, { name: string; value: number }>; total: number };
      type Acc = { overall: Bucket; byYear: Map<number, Bucket> };
      const acc = new Map<string, Acc>();
      const addTo = (b: Bucket, code: string, name: string, value: number) => {
        const cur = b.map.get(code) || { name, value: 0 };
        cur.value += value;
        b.map.set(code, cur);
        b.total += value;
      };
      for (const line of transactionSectorLines) {
        const t = txById.get(line.transaction_id);
        if (!t || !t.transaction_date) continue;
        // Only activities WITHOUT declared activity_sectors need a derived mix.
        if (activitySectorsMap.has(t.activity_id)) continue;
        const usd = txUsdValue(t);
        const portion = usd * ((Number(line.percentage) || 0) / 100);
        if (portion <= 0) continue;
        const txDate = new Date(t.transaction_date);
        const year = customYear ? getFiscalYearForDate(txDate, customYear) : txDate.getFullYear();
        let a = acc.get(t.activity_id);
        if (!a) { a = { overall: { map: new Map(), total: 0 }, byYear: new Map() }; acc.set(t.activity_id, a); }
        addTo(a.overall, line.sector_code, line.sector_name, portion);
        let yr = a.byYear.get(year);
        if (!yr) { yr = { map: new Map(), total: 0 }; a.byYear.set(year, yr); }
        addTo(yr, line.sector_code, line.sector_name, portion);
      }
      const toWeights = (b: Bucket): SectorWeight[] =>
        b.total > 0
          ? Array.from(b.map.entries()).map(([code, v]) => ({ code, name: v.name, percentage: (v.value / b.total) * 100 }))
          : [];
      for (const [activityId, a] of acc) {
        const byYear = new Map<number, SectorWeight[]>();
        for (const [year, yr] of a.byYear) byYear.set(year, toWeights(yr));
        const overall = toWeights(a.overall);
        effectiveSectorsMap.set(activityId, { overall, byYear });
        // Seed sectorDataMap so budgets/planned can attribute to these (transaction-derived) sectors.
        for (const s of overall) {
          if (!sectorDataMap.has(s.code)) {
            const h = getSectorHierarchy(s.code);
            sectorDataMap.set(s.code, {
              sectorCode: s.code,
              sectorName: s.name,
              groupCode: h.groupCode,
              groupName: h.groupName,
              categoryCode: h.categoryCode,
              categoryName: h.categoryName,
              yearlyData: new Map(),
            });
          }
        }
      }
    }

    // Sector weights to use for an activity's budgets/planned in a given year: its declared
    // activity_sectors if present, else its transaction-derived mix (this year's, falling back
    // to overall). Empty array → nothing to attribute.
    const getImputedSectors = (activityId: string, year: number): SectorWeight[] => {
      const act = activitySectorsMap.get(activityId);
      if (act && act.length > 0) {
        return act.map((s: any) => ({ code: s.sector_code, name: s.sector_name, percentage: s.percentage }));
      }
      const eff = effectiveSectorsMap.get(activityId);
      if (!eff) return [];
      const yr = eff.byYear.get(year);
      return yr && yr.length > 0 ? yr : eff.overall;
    };

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

      const yearAllocations = allocatePeriodAcrossYears(pd.period_start, pd.period_end, amount);

      // Split each year's allocation by the activity's sectors for that year — declared
      // activity_sectors, or (for transaction-level activities) the transaction-derived mix.
      yearAllocations.forEach(allocation => {
        // Full amount counts toward the grand total regardless of sector mix.
        getOrCreateTotalYear(allocation.year, allocation.label).planned += allocation.amount;

        const sectors = getImputedSectors(pd.activity_id, allocation.year);
        let allocatedShare = 0;
        sectors.forEach(sector => {
          const sectorData = sectorDataMap.get(sector.code);
          if (!sectorData) return;
          allocatedShare += (sector.percentage || 0) / 100;
          const y = getOrCreateYear(sectorData, allocation.year, allocation.label);
          y.planned += allocation.amount * (sector.percentage / 100);
        });
        if (allocation.amount > 0 && allocatedShare < 0.9999) {
          unallocatedActivityIds.add(pd.activity_id);
        }
      });
    });

    // Process activity budgets — same pro-rata pattern as planned disbursements.
    activityBudgets?.forEach((budget: any) => {
      if (!budget.period_start) return;

      const amount = parseFloat(budget.usd_value?.toString() || '0') || 0;
      if (amount === 0) return;

      const yearAllocations = allocatePeriodAcrossYears(budget.period_start, budget.period_end, amount);

      yearAllocations.forEach(allocation => {
        // Full amount counts toward the grand total regardless of sector mix.
        getOrCreateTotalYear(allocation.year, allocation.label).budgets += allocation.amount;

        const sectors = getImputedSectors(budget.activity_id, allocation.year);
        let allocatedShare = 0;
        sectors.forEach(sector => {
          const sectorData = sectorDataMap.get(sector.code);
          if (!sectorData) return;
          allocatedShare += (sector.percentage || 0) / 100;
          const y = getOrCreateYear(sectorData, allocation.year, allocation.label);
          y.budgets += allocation.amount * (sector.percentage / 100);
        });
        if (allocation.amount > 0 && allocatedShare < 0.9999) {
          unallocatedActivityIds.add(budget.activity_id);
        }
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
      const transactionValue = txUsdValue(transaction);
      const activitySectors = activitySectorsMap.get(transaction.activity_id) || [];
      const txKey = `tx_${code}` as keyof YearMetrics;
      const isActual = code === '3';

      // Grand total for this metric/year, independent of sector attribution.
      const totalYear = getOrCreateTotalYear(year, label);
      (totalYear as any)[txKey] = ((totalYear as any)[txKey] || 0) + transactionValue;
      if (isActual) totalYear.actual += transactionValue;

      // Check if this transaction has sector lines
      const sectorLines = transactionSectorLines.filter(
        sl => sl.transaction_id === transaction.uuid
      );

      const applyToSector = (sectorCode: string, sectorName: string, share: number, method: 'actual' | 'imputed') => {
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
        // Data-quality split of the sector attribution (independent of transaction type)
        if (method === 'actual') y.actualUsd += portion;
        else y.imputedUsd += portion;
      };

      // Track how much of this transaction's value reached a sector. Anything
      // short of 100% (no sector data, or percentages summing under 100) is the
      // residual surfaced in the Unallocated bucket.
      let allocatedShare = 0;

      if (sectorLines.length > 0) {
        // Sector taken from the transaction itself → actual
        sectorLines.forEach(line => {
          const share = (line.percentage || 0) / 100;
          allocatedShare += share;
          applyToSector(line.sector_code, line.sector_name, share, 'actual');
        });
      } else if (transaction.sector_code) {
        allocatedShare = 1;
        applyToSector(transaction.sector_code, 'Unknown Sector', 1, 'actual');
      } else {
        // Falling back to the activity-level split → imputed
        activitySectors.forEach(sector => {
          // Only contribute to sectors that the activity already declares —
          // matches the original logic which used `sectorDataMap.get` (no upsert).
          if (!sectorDataMap.has(sector.sector_code)) return;
          const share = (sector.percentage || 0) / 100;
          allocatedShare += share;
          applyToSector(sector.sector_code, sector.sector_name, share, 'imputed');
        });
      }

      if (transactionValue > 0 && allocatedShare < 0.9999) {
        unallocatedActivityIds.add(transaction.activity_id);
      }
    });

    // ---- Unallocated bucket -------------------------------------------------
    // Sum what actually reached sectors (per year, per metric), then surface the
    // residual against the grand totals as a synthetic "Unallocated" sector so
    // the donut total reconciles with the Financial Totals card. Computed BEFORE
    // the sector filter and before adding the synthetic entry to sectorDataMap.
    const allocatedByYear = new Map<number, YearMetrics>();
    sectorDataMap.forEach((sd) => {
      sd.yearlyData.forEach((y, year) => {
        let a = allocatedByYear.get(year);
        if (!a) { a = makeEmptyYearMetrics(y.label); allocatedByYear.set(year, a); }
        for (const txc of TX_TYPE_CODES) {
          const k = `tx_${txc}`;
          (a as any)[k] += (y as any)[k] || 0;
        }
        a.actual += y.actual;
        a.planned += y.planned;
        a.budgets += y.budgets;
      });
    });

    const UNALLOCATED_EPSILON = 0.005; // sub-cent rounding tolerance
    const unallocatedYearly = new Map<number, YearMetrics>();
    const residual = (total: number, allocated: number) => Math.max(0, total - allocated);
    totalsByYear.forEach((tot, year) => {
      const alloc = allocatedByYear.get(year);
      const u = makeEmptyYearMetrics(tot.label);
      let hasValue = false;
      for (const txc of TX_TYPE_CODES) {
        const k = `tx_${txc}`;
        const v = residual((tot as any)[k] || 0, alloc ? (alloc as any)[k] || 0 : 0);
        (u as any)[k] = v;
        if (v > UNALLOCATED_EPSILON) hasValue = true;
      }
      u.actual = residual(tot.actual, alloc?.actual || 0);
      u.planned = residual(tot.planned, alloc?.planned || 0);
      u.budgets = residual(tot.budgets, alloc?.budgets || 0);
      if (u.actual > UNALLOCATED_EPSILON || u.planned > UNALLOCATED_EPSILON || u.budgets > UNALLOCATED_EPSILON) {
        hasValue = true;
      }
      if (hasValue) unallocatedYearly.set(year, u);
    });

    if (unallocatedYearly.size > 0) {
      sectorDataMap.set(UNALLOCATED_CODE, {
        sectorCode: UNALLOCATED_CODE,
        sectorName: UNALLOCATED_LABEL,
        groupCode: UNALLOCATED_CODE,
        groupName: UNALLOCATED_LABEL,
        categoryCode: UNALLOCATED_CODE,
        categoryName: UNALLOCATED_LABEL,
        yearlyData: unallocatedYearly,
      });
    }

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

    const byGroup = countsFromSets(activitiesByGroup);
    const byCategory = countsFromSets(activitiesByCategory);
    const bySector = countsFromSets(activitiesBySector);
    // Distinct count of activities with unallocated funding, mirrored across all
    // three hierarchy levels (the Unallocated slice uses the same code at each).
    if (unallocatedYearly.size > 0 && unallocatedActivityIds.size > 0) {
      byGroup[UNALLOCATED_CODE] = unallocatedActivityIds.size;
      byCategory[UNALLOCATED_CODE] = unallocatedActivityIds.size;
      bySector[UNALLOCATED_CODE] = unallocatedActivityIds.size;
    }

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
        byGroup,
        byCategory,
        bySector,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[DisbursementsBySector] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

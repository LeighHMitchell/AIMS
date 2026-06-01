import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { fetchCustomYearById } from '@/lib/custom-year-server';
import { getSectorSpendByPeriod, SpendBasis, GroupByLevel } from '@/lib/sector-spend';

export const dynamic = 'force-dynamic';

/**
 * GET /api/activities/[id]/sector-spend-by-period
 *
 * Per-activity sector spend, USD per sector per period, tagged actual vs imputed.
 * Also returns an "imputed comparison": what the activity's static sector % WOULD
 * allocate for each period's actual spend — so the editor can contrast what the
 * transactions actually say vs what the activity-level split implies.
 *
 * Query params:
 *  - basis: 'disbursement' | 'disbursement_expenditure' (default) | 'commitment'
 *  - groupByLevel: '1' | '3' | '5' (default '5')
 *  - yearFrom, yearTo
 *  - customYearId: fiscal-year bucketing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id: activityId } = await params;
    const { searchParams } = new URL(request.url);
    const basis = (searchParams.get('basis') || 'disbursement_expenditure') as SpendBasis;
    const groupByLevel = (searchParams.get('groupByLevel') || '5') as GroupByLevel;
    const yearFrom = searchParams.get('yearFrom') ? parseInt(searchParams.get('yearFrom')!, 10) : undefined;
    const yearTo = searchParams.get('yearTo') ? parseInt(searchParams.get('yearTo')!, 10) : undefined;
    const customYear = await fetchCustomYearById(supabase as any, searchParams.get('customYearId'));

    const result = await getSectorSpendByPeriod(supabase, {
      activityIds: [activityId],
      basis,
      groupByLevel,
      yearFrom,
      yearTo,
      customYear,
      // Single-activity view: no portfolio-level internal-transfer exclusion.
      excludePooledInternal: false,
    });

    // Reshape cells into sector rows × periods for easy table rendering.
    const periodKeys = result.periods.map((p) => p.key);
    const rowsBySector = new Map<string, any>();
    for (const c of result.cells) {
      let row = rowsBySector.get(c.sectorKey);
      if (!row) {
        row = {
          sectorCode: c.sectorCode,
          sectorName: c.sectorName,
          categoryCode: c.categoryCode,
          categoryName: c.categoryName,
          byPeriod: new Map<number, { actualUsd: number; imputedUsd: number }>(),
          totalActualUsd: 0,
          totalImputedUsd: 0,
        };
        rowsBySector.set(c.sectorKey, row);
      }
      const prev = row.byPeriod.get(c.periodKey) || { actualUsd: 0, imputedUsd: 0 };
      prev.actualUsd += c.actualUsd;
      prev.imputedUsd += c.imputedUsd;
      row.byPeriod.set(c.periodKey, prev);
      row.totalActualUsd += c.actualUsd;
      row.totalImputedUsd += c.imputedUsd;
    }

    const rows = Array.from(rowsBySector.values())
      .map((r) => ({
        sectorCode: r.sectorCode,
        sectorName: r.sectorName,
        categoryCode: r.categoryCode,
        categoryName: r.categoryName,
        byPeriod: periodKeys.map((k) => {
          const v = r.byPeriod.get(k) || { actualUsd: 0, imputedUsd: 0 };
          return { periodKey: k, actualUsd: v.actualUsd, imputedUsd: v.imputedUsd };
        }),
        totalActualUsd: r.totalActualUsd,
        totalImputedUsd: r.totalImputedUsd,
      }))
      .sort((a, b) => (b.totalActualUsd + b.totalImputedUsd) - (a.totalActualUsd + a.totalImputedUsd));

    // Imputed comparison: apply the activity's static sector % to each period's total spend.
    const { data: actSec } = await supabase
      .from('activity_sectors')
      .select('sector_code, sector_name, percentage')
      .eq('activity_id', activityId);

    const periodTotals = new Map<number, number>();
    for (const c of result.cells) {
      periodTotals.set(c.periodKey, (periodTotals.get(c.periodKey) || 0) + c.actualUsd + c.imputedUsd);
    }

    const imputedComparison = (actSec || []).map((a: any) => {
      const pct = (parseFloat(a.percentage?.toString() || '0') || 0) / 100;
      return {
        sectorCode: a.sector_code,
        sectorName: a.sector_name,
        staticPercentage: parseFloat(a.percentage?.toString() || '0') || 0,
        byPeriod: periodKeys.map((k) => ({
          periodKey: k,
          impliedUsd: (periodTotals.get(k) || 0) * pct,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      basis,
      groupByLevel,
      periods: result.periods,
      rows,
      imputedComparison,
      dataQuality: {
        actualUsd: result.totals.actualUsd,
        imputedUsd: result.totals.imputedUsd,
        unallocatedUsd: result.unallocatedUsd,
        unconvertibleCount: result.unconvertibleCount,
      },
    });
  } catch (error) {
    console.error('[sector-spend-by-period] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to compute sector spend by period' },
      { status: 500 }
    );
  }
}

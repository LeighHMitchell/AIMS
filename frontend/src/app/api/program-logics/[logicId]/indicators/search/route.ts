import { NextRequest, NextResponse } from 'next/server';
import {
  loadForRead,
  serverError,
  resolveParams,
} from '@/lib/program-logic/route-helpers';
import { getInvestmentActivityIds } from '@/lib/program-logic/permissions';

export const dynamic = 'force-dynamic';

type Params = { params: { logicId: string } | Promise<{ logicId: string }> };

function localized(title: any): string {
  if (!title) return '';
  if (typeof title === 'string') return title;
  return title.en ?? Object.values(title)[0] ?? '';
}

/**
 * GET /api/program-logics/:id/indicators/search?q=&activity=
 * Search existing IATI result indicators belonging to this investment's
 * activities, for linking as measurement evidence. Returns each indicator with
 * its activity + result-type context (so e.g. World Bank PDO vs intermediate
 * indicators are distinguishable). Never creates indicators.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { logicId } = await resolveParams(params);
  const { ctx, error } = await loadForRead(logicId);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const activityFilter = searchParams.get('activity');

  try {
    let activityIds = await getInvestmentActivityIds(ctx.admin, ctx.logic.investment_id);
    if (activityFilter) activityIds = activityIds.filter((id) => id === activityFilter);
    if (activityIds.length === 0) return NextResponse.json({ indicators: [] });

    const { data: results } = await ctx.admin
      .from('activity_results')
      .select('id, activity_id, type, title')
      .in('activity_id', activityIds);
    const resultRows = (results as any[]) ?? [];
    if (resultRows.length === 0) return NextResponse.json({ indicators: [] });
    const resultById = new Map(resultRows.map((r) => [r.id, r]));

    const { data: indicators } = await ctx.admin
      .from('result_indicators')
      .select('id, result_id, title, measure, ascending, reference_code')
      .in(
        'result_id',
        resultRows.map((r) => r.id)
      );

    let out = ((indicators as any[]) ?? []).map((ind) => {
      const result = resultById.get(ind.result_id);
      return {
        id: ind.id,
        result_id: ind.result_id,
        title: localized(ind.title),
        measure: ind.measure,
        ascending: ind.ascending,
        reference_code: ind.reference_code,
        activity_id: result?.activity_id ?? null,
        result_type: result?.type ?? null,
        result_title: localized(result?.title),
      };
    });

    if (q)
      out = out.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.reference_code ?? '').toLowerCase().includes(q) ||
          i.result_title.toLowerCase().includes(q)
      );

    return NextResponse.json({ indicators: out });
  } catch (e) {
    console.error('[indicators/search] GET error:', e);
    return serverError();
  }
}

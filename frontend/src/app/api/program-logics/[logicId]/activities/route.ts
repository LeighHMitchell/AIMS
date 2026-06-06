import { NextRequest, NextResponse } from 'next/server';
import {
  loadForRead,
  serverError,
  resolveParams,
} from '@/lib/program-logic/route-helpers';
import { getInvestmentActivityIds } from '@/lib/program-logic/permissions';

export const dynamic = 'force-dynamic';

type Params = { params: { logicId: string } | Promise<{ logicId: string }> };

/**
 * GET the activities that belong to this investment (umbrella + child
 * activities), with titles — used by the scope toggle and node scope picker.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const { logicId } = await resolveParams(params);
  const { ctx, error } = await loadForRead(logicId);
  if (error) return error;

  try {
    const ids = await getInvestmentActivityIds(ctx.admin, ctx.logic.investment_id);
    const { data } = await ctx.admin
      .from('activities')
      .select('id, title_narrative, iati_identifier, activity_status')
      .in('id', ids);

    const activities = (data as any[] ?? []).map((a) => ({
      id: a.id,
      title: a.title_narrative ?? '(untitled activity)',
      iati_identifier: a.iati_identifier ?? null,
      activity_status: a.activity_status ?? null,
      is_umbrella: a.id === ctx.logic.investment_id,
    }));
    // umbrella first, then alphabetical
    activities.sort((x, y) =>
      x.is_umbrella ? -1 : y.is_umbrella ? 1 : x.title.localeCompare(y.title)
    );

    return NextResponse.json({ activities });
  } catch (e) {
    console.error('[program-logics/:id/activities] GET error:', e);
    return serverError();
  }
}

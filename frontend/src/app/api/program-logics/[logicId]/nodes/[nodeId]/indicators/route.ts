import { NextRequest, NextResponse } from 'next/server';
import {
  loadForRead,
  loadForWrite,
  badRequest,
  notFound,
  serverError,
  resolveParams,
} from '@/lib/program-logic/route-helpers';
import { getInvestmentActivityIds } from '@/lib/program-logic/permissions';

export const dynamic = 'force-dynamic';

type Params = {
  params:
    | { logicId: string; nodeId: string }
    | Promise<{ logicId: string; nodeId: string }>;
};

async function nodeExists(admin: any, logicId: string, nodeId: string) {
  const { data } = await admin
    .from('logic_nodes')
    .select('id')
    .eq('id', nodeId)
    .eq('program_logic_id', logicId)
    .maybeSingle();
  return !!data;
}

/**
 * GET indicators linked to a node, with baseline + period target/actual inline
 * (read-only measurement evidence). A node with zero links is valid.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const { logicId, nodeId } = await resolveParams(params);
  const { ctx, error } = await loadForRead(logicId);
  if (error) return error;
  if (!(await nodeExists(ctx.admin, logicId, nodeId))) return notFound('Node');

  const { data: links } = await ctx.admin
    .from('logic_indicator_links')
    .select('*')
    .eq('node_id', nodeId);
  const linkRows = (links as any[]) ?? [];
  const indicatorIds = linkRows.map((l) => l.indicator_id);
  if (indicatorIds.length === 0) return NextResponse.json({ links: [] });

  const [indRes, baseRes, periodRes] = await Promise.all([
    ctx.admin
      .from('result_indicators')
      .select('id, result_id, title, measure, ascending')
      .in('id', indicatorIds),
    ctx.admin
      .from('indicator_baselines')
      .select('indicator_id, baseline_year, iso_date, value')
      .in('indicator_id', indicatorIds),
    ctx.admin
      .from('indicator_periods')
      .select('indicator_id, period_start, period_end, target_value, actual_value')
      .in('indicator_id', indicatorIds),
  ]);

  const indById = new Map((indRes.data as any[] ?? []).map((i) => [i.id, i]));
  const baseById = new Map((baseRes.data as any[] ?? []).map((b) => [b.indicator_id, b]));
  const periodsById = new Map<string, any[]>();
  ((periodRes.data as any[]) ?? []).forEach((p) => {
    if (!periodsById.has(p.indicator_id)) periodsById.set(p.indicator_id, []);
    periodsById.get(p.indicator_id)!.push(p);
  });

  const result = linkRows.map((l) => ({
    link: l,
    indicator: indById.get(l.indicator_id) ?? null,
    baseline: baseById.get(l.indicator_id) ?? null,
    periods: periodsById.get(l.indicator_id) ?? [],
  }));

  return NextResponse.json({ links: result });
}

/**
 * POST link an existing IATI result indicator to a node.
 * Body: { indicator_id, note? }. The indicator must belong to one of the
 * investment's activities. Never creates an indicator.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { logicId, nodeId } = await resolveParams(params);
  const { ctx, error } = await loadForWrite(logicId);
  if (error) return error;
  if (!(await nodeExists(ctx.admin, logicId, nodeId))) return notFound('Node');

  let body: any;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }
  if (!body.indicator_id) return badRequest('indicator_id is required');

  try {
    // Verify the indicator belongs to an activity under this investment.
    const { data: indicator } = await ctx.admin
      .from('result_indicators')
      .select('id, result_id')
      .eq('id', body.indicator_id)
      .maybeSingle();
    if (!indicator) return badRequest('indicator_id not found');

    const { data: resultRow } = await ctx.admin
      .from('activity_results')
      .select('activity_id')
      .eq('id', indicator.result_id)
      .maybeSingle();
    const activityIds = await getInvestmentActivityIds(ctx.admin, ctx.logic.investment_id);
    if (!resultRow || !activityIds.includes(resultRow.activity_id))
      return badRequest(
        "indicator must belong to one of this investment's activities (the umbrella activity or its child activities)"
      );

    const { data, error: insErr } = await ctx.admin
      .from('logic_indicator_links')
      .insert({
        node_id: nodeId,
        indicator_id: body.indicator_id,
        note: body.note ?? null,
        created_by: ctx.user.id,
      })
      .select('*')
      .single();
    if (insErr) {
      if (insErr.code === '23505')
        return NextResponse.json(
          { error: 'This indicator is already linked to this node' },
          { status: 409 }
        );
      throw insErr;
    }
    return NextResponse.json({ link: data }, { status: 201 });
  } catch (e) {
    console.error('[nodes/:id/indicators] POST error:', e);
    return serverError();
  }
}

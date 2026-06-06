import { NextRequest, NextResponse } from 'next/server';
import {
  loadForRead,
  loadForWrite,
  badRequest,
  serverError,
  resolveParams,
} from '@/lib/program-logic/route-helpers';
import { getInvestmentActivityIds } from '@/lib/program-logic/permissions';
import type { NodeScope } from '@/lib/program-logic/types';

export const dynamic = 'force-dynamic';

type Params = { params: { logicId: string } | Promise<{ logicId: string }> };

/** GET nodes for a logic, filterable by ?scope= ?activity= ?tier= */
export async function GET(request: NextRequest, { params }: Params) {
  const { logicId } = await resolveParams(params);
  const { ctx, error } = await loadForRead(logicId);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  let q = ctx.admin
    .from('logic_nodes')
    .select('*')
    .eq('program_logic_id', logicId)
    .order('sort_order', { ascending: true });

  const scope = searchParams.get('scope');
  if (scope === 'investment' || scope === 'activity') q = q.eq('scope', scope);
  const activity = searchParams.get('activity');
  if (activity) q = q.eq('activity_id', activity);
  const tier = searchParams.get('tier');
  if (tier) q = q.eq('tier_id', tier);

  const { data, error: e } = await q;
  if (e) return serverError();
  return NextResponse.json({ nodes: data ?? [] });
}

/**
 * POST a new node.
 * Body: { tier_id, statement, scope?, activity_id?, description?, sort_order? }
 * scope='activity' requires activity_id that belongs to the investment.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { logicId } = await resolveParams(params);
  const { ctx, error } = await loadForWrite(logicId);
  if (error) return error;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const scope: NodeScope = body.scope ?? 'investment';
  if (scope !== 'investment' && scope !== 'activity')
    return badRequest(`Invalid scope: ${body.scope}`);
  if (!body.tier_id) return badRequest('tier_id is required');
  if (!body.statement || !String(body.statement).trim())
    return badRequest('statement is required');

  try {
    // tier must belong to this logic
    const { data: tier } = await ctx.admin
      .from('logic_tiers')
      .select('id')
      .eq('id', body.tier_id)
      .eq('program_logic_id', logicId)
      .maybeSingle();
    if (!tier) return badRequest('tier_id does not belong to this program logic');

    let activityId: string | null = null;
    if (scope === 'activity') {
      activityId = body.activity_id ?? null;
      if (!activityId)
        return badRequest("activity_id is required when scope = 'activity'");
      const allowed = await getInvestmentActivityIds(ctx.admin, ctx.logic.investment_id);
      if (!allowed.includes(activityId))
        return badRequest(
          'activity_id must be an activity under this investment (the umbrella activity or one of its child activities)'
        );
    }

    const { data, error: insErr } = await ctx.admin
      .from('logic_nodes')
      .insert({
        program_logic_id: logicId,
        tier_id: body.tier_id,
        scope,
        activity_id: activityId,
        statement: String(body.statement).trim(),
        description: body.description ?? null,
        sort_order: typeof body.sort_order === 'number' ? body.sort_order : 0,
        created_by: ctx.user.id,
      })
      .select('*')
      .single();
    if (insErr) throw insErr;

    return NextResponse.json(
      {
        node: data,
        revision_recommended: ctx.logic.status !== 'draft',
      },
      { status: 201 }
    );
  } catch (e) {
    console.error('[nodes] POST error:', e);
    return serverError();
  }
}

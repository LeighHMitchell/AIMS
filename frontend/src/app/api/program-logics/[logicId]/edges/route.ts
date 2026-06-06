import { NextRequest, NextResponse } from 'next/server';
import {
  loadForRead,
  loadForWrite,
  badRequest,
  serverError,
  resolveParams,
} from '@/lib/program-logic/route-helpers';
import {
  decideLinkType,
  levelWarning,
  crossScopeWarning,
} from '@/lib/program-logic/service';
import type {
  EdgeLinkType,
  LogicNodeRow,
  LogicTierRow,
} from '@/lib/program-logic/types';

export const dynamic = 'force-dynamic';

type Params = { params: { logicId: string } | Promise<{ logicId: string }> };

/** GET all edges for a logic. */
export async function GET(_request: NextRequest, { params }: Params) {
  const { logicId } = await resolveParams(params);
  const { ctx, error } = await loadForRead(logicId);
  if (error) return error;
  const { data, error: e } = await ctx.admin
    .from('logic_edges')
    .select('*')
    .eq('program_logic_id', logicId);
  if (e) return serverError();
  return NextResponse.json({ edges: data ?? [] });
}

/**
 * POST a new edge (from = contributing/lower node, to = receiving/higher node).
 * Guards:
 *  - hard block on cycles (would_create_cycle)
 *  - link_type defaults to 'contribution' when crossing the attribution ceiling
 *    (caller can override); explanation returned
 *  - non-blocking warnings for same-tier/downward and reverse cross-scope edges
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
  const fromId: string | undefined = body.from_node_id;
  const toId: string | undefined = body.to_node_id;
  const requested: EdgeLinkType | undefined = body.link_type;
  if (!fromId || !toId) return badRequest('from_node_id and to_node_id are required');
  if (fromId === toId) return badRequest('An edge cannot connect a node to itself');
  if (requested && requested !== 'attribution' && requested !== 'contribution')
    return badRequest(`Invalid link_type: ${requested}`);

  try {
    const { data: nodes } = await ctx.admin
      .from('logic_nodes')
      .select('*')
      .eq('program_logic_id', logicId)
      .in('id', [fromId, toId]);
    const nodeList = (nodes as LogicNodeRow[]) ?? [];
    const fromNode = nodeList.find((n) => n.id === fromId);
    const toNode = nodeList.find((n) => n.id === toId);
    if (!fromNode || !toNode)
      return badRequest('Both nodes must belong to this program logic');

    // Cycle guard (enforced in the API layer per spec).
    const { data: cycle, error: cycleErr } = await ctx.admin.rpc('would_create_cycle', {
      p_from: fromId,
      p_to: toId,
    });
    if (cycleErr) throw cycleErr;
    if (cycle === true)
      return NextResponse.json(
        {
          error:
            'This edge would create a cycle: the source node is already an ancestor of the target. A program logic must stay acyclic.',
        },
        { status: 409 }
      );

    const { data: tiers } = await ctx.admin
      .from('logic_tiers')
      .select('*')
      .eq('program_logic_id', logicId);
    const tierList = (tiers as LogicTierRow[]) ?? [];

    const decision = decideLinkType(
      tierList,
      fromNode.tier_id,
      toNode.tier_id,
      requested ?? null
    );

    const warnings: string[] = [];
    const lvl = levelWarning(tierList, fromNode.tier_id, toNode.tier_id);
    if (lvl) warnings.push(lvl);
    const cross = crossScopeWarning(fromNode, toNode);
    if (cross) warnings.push(cross);

    const { data, error: insErr } = await ctx.admin
      .from('logic_edges')
      .insert({
        program_logic_id: logicId,
        from_node_id: fromId,
        to_node_id: toId,
        link_type: decision.link_type,
        rationale: body.rationale ?? null,
        created_by: ctx.user.id,
      })
      .select('*')
      .single();
    if (insErr) {
      if (insErr.code === '23505')
        return NextResponse.json(
          { error: 'An edge between these two nodes already exists' },
          { status: 409 }
        );
      throw insErr;
    }

    return NextResponse.json(
      {
        edge: data,
        link_type_decision: decision,
        warnings,
        revision_recommended: ctx.logic.status !== 'draft',
      },
      { status: 201 }
    );
  } catch (e) {
    console.error('[edges] POST error:', e);
    return serverError();
  }
}

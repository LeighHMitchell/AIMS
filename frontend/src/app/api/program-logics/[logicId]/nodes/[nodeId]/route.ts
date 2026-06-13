import { NextRequest, NextResponse } from 'next/server';
import {
  loadForRead,
  loadForWrite,
  recordSnapshot,
  badRequest,
  notFound,
  serverError,
  resolveParams,
} from '@/lib/program-logic/route-helpers';
import { getInvestmentActivityIds } from '@/lib/program-logic/permissions';
import type { LogicNodeRow, NodeScope } from '@/lib/program-logic/types';

export const dynamic = 'force-dynamic';

type Params = {
  params:
    | { logicId: string; nodeId: string }
    | Promise<{ logicId: string; nodeId: string }>;
};

/**
 * Does changing/deleting this node require a recorded revision reason?
 * True when the logic has been baselined (status != 'draft') AND the node sits at
 * or above the attribution-boundary tier — mirroring the formal-change discipline
 * agencies apply to end-outcome statements.
 */
async function requiresRevision(
  admin: any,
  logicId: string,
  status: string,
  nodeTierId: string
): Promise<boolean> {
  if (status === 'draft') return false;
  const { data: tiers } = await admin
    .from('logic_tiers')
    .select('id, level_order, attribution_boundary')
    .eq('program_logic_id', logicId);
  const list = (tiers as any[]) ?? [];
  const boundary = list.find((t) => t.attribution_boundary);
  if (!boundary) return false;
  const nodeTier = list.find((t) => t.id === nodeTierId);
  if (!nodeTier) return false;
  return nodeTier.level_order >= boundary.level_order;
}

async function getNode(
  admin: any,
  logicId: string,
  nodeId: string
): Promise<LogicNodeRow | null> {
  const { data } = await admin
    .from('logic_nodes')
    .select('*')
    .eq('id', nodeId)
    .eq('program_logic_id', logicId)
    .maybeSingle();
  return (data as LogicNodeRow) ?? null;
}

/** GET a single node. */
export async function GET(_request: NextRequest, { params }: Params) {
  const { logicId, nodeId } = await resolveParams(params);
  const { ctx, error } = await loadForRead(logicId);
  if (error) return error;
  const node = await getNode(ctx.admin, logicId, nodeId);
  if (!node) return notFound('Node');
  return NextResponse.json({ node });
}

/** PATCH a node. Requires revision_reason when editing an at/above-ceiling node after baseline. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { logicId, nodeId } = await resolveParams(params);
  const { ctx, error } = await loadForWrite(logicId);
  if (error) return error;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const node = await getNode(ctx.admin, logicId, nodeId);
  if (!node) return notFound('Node');

  const needsRevision = await requiresRevision(
    ctx.admin,
    logicId,
    ctx.logic.status,
    node.tier_id
  );
  const reason: string | undefined = body.revision_reason?.trim();
  if (needsRevision && !reason)
    return badRequest(
      'This node is at or above the attribution ceiling and the logic is baselined. A non-empty revision_reason is required to change it.'
    );

  const update: Record<string, unknown> = {};
  if (typeof body.statement === 'string') {
    if (!body.statement.trim()) return badRequest('statement cannot be empty');
    update.statement = body.statement.trim();
  }
  if ('description' in body) update.description = body.description ?? null;
  if (body.tier_id !== undefined) {
    const { data: tier } = await ctx.admin
      .from('logic_tiers')
      .select('id')
      .eq('id', body.tier_id)
      .eq('program_logic_id', logicId)
      .maybeSingle();
    if (!tier) return badRequest('tier_id does not belong to this program logic');
    update.tier_id = body.tier_id;
  }
  if (body.scope !== undefined) {
    const scope: NodeScope = body.scope;
    if (scope !== 'investment' && scope !== 'activity')
      return badRequest(`Invalid scope: ${body.scope}`);
    if (scope === 'activity') {
      const activityId = body.activity_id ?? node.activity_id;
      if (!activityId)
        return badRequest("activity_id is required when scope = 'activity'");
      const allowed = await getInvestmentActivityIds(ctx.admin, ctx.logic.investment_id);
      if (!allowed.includes(activityId))
        return badRequest('activity_id must be an activity under this investment');
      update.scope = 'activity';
      update.activity_id = activityId;
    } else {
      update.scope = 'investment';
      update.activity_id = null;
    }
  } else if (body.activity_id !== undefined && node.scope === 'activity') {
    const allowed = await getInvestmentActivityIds(ctx.admin, ctx.logic.investment_id);
    if (!allowed.includes(body.activity_id))
      return badRequest('activity_id must be an activity under this investment');
    update.activity_id = body.activity_id;
  }
  if (typeof body.sort_order === 'number') update.sort_order = body.sort_order;

  if (Object.keys(update).length === 0) return badRequest('No updatable fields provided');
  update.updated_at = new Date().toISOString();

  try {
    const { data, error: upErr } = await ctx.admin
      .from('logic_nodes')
      .update(update)
      .eq('id', nodeId)
      .eq('program_logic_id', logicId)
      .select('*')
      .single();
    if (upErr) throw upErr;

    let snapshot = null;
    if (needsRevision && reason) {
      snapshot = await recordSnapshot(ctx.admin, logicId, {
        type: 'revision',
        version_label: body.revision_label?.trim() || `Revision: edit "${data.statement}"`,
        reason,
        userId: ctx.user.id,
      });
    }

    return NextResponse.json({
      node: data,
      revision_recommended: ctx.logic.status !== 'draft' && !needsRevision,
      snapshot,
    });
  } catch (e) {
    console.error('[nodes/:id] PATCH error:', e);
    return serverError();
  }
}

/** DELETE a node. Requires revision_reason when deleting an at/above-ceiling node after baseline. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { logicId, nodeId } = await resolveParams(params);
  const { ctx, error } = await loadForWrite(logicId);
  if (error) return error;

  const node = await getNode(ctx.admin, logicId, nodeId);
  if (!node) return notFound('Node');

  const needsRevision = await requiresRevision(
    ctx.admin,
    logicId,
    ctx.logic.status,
    node.tier_id
  );
  // Accept reason via query param or JSON body for DELETE.
  const { searchParams } = new URL(request.url);
  let reason = searchParams.get('revision_reason')?.trim();
  if (!reason) {
    try {
      const body = await request.json();
      reason = body?.revision_reason?.trim();
    } catch {
      /* no body */
    }
  }
  if (needsRevision && !reason)
    return badRequest(
      'This node is at or above the attribution ceiling and the logic is baselined. A non-empty revision_reason is required to delete it.'
    );

  try {
    // Snapshot BEFORE the delete so the removed node is captured in the revision.
    let snapshot = null;
    if (needsRevision && reason) {
      snapshot = await recordSnapshot(ctx.admin, logicId, {
        type: 'revision',
        version_label: `Revision: delete "${node.statement}"`,
        reason,
        userId: ctx.user.id,
      });
    }

    const { error: delErr } = await ctx.admin
      .from('logic_nodes')
      .delete()
      .eq('id', nodeId)
      .eq('program_logic_id', logicId);
    if (delErr) throw delErr;

    return NextResponse.json({ success: true, snapshot });
  } catch (e) {
    console.error('[nodes/:id] DELETE error:', e);
    return serverError();
  }
}

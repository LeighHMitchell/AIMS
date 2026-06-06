import { NextRequest, NextResponse } from 'next/server';
import {
  loadForRead,
  notFound,
  serverError,
  resolveParams,
} from '@/lib/program-logic/route-helpers';

export const dynamic = 'force-dynamic';

type Params = {
  params:
    | { logicId: string; nodeId: string }
    | Promise<{ logicId: string; nodeId: string }>;
};

/**
 * GET roll-up for a node: every node that contributes to it directly or
 * transitively (the read-only roll-up view). Uses the program_logic_rollup()
 * recursive SQL function.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const { logicId, nodeId } = await resolveParams(params);
  const { ctx, error } = await loadForRead(logicId);
  if (error) return error;

  const { data: target } = await ctx.admin
    .from('logic_nodes')
    .select('id')
    .eq('id', nodeId)
    .eq('program_logic_id', logicId)
    .maybeSingle();
  if (!target) return notFound('Node');

  try {
    const { data, error: rpcErr } = await ctx.admin.rpc('program_logic_rollup', {
      p_target_node_id: nodeId,
    });
    if (rpcErr) throw rpcErr;
    const contributors = (data as any[]) ?? [];
    return NextResponse.json({
      target_node_id: nodeId,
      contributors,
      // convenience split for the activity-contribution view
      activity_contributors: contributors.filter((n) => n.scope === 'activity'),
    });
  } catch (e) {
    console.error('[nodes/:id/rollup] GET error:', e);
    return serverError();
  }
}

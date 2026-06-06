import { NextRequest, NextResponse } from 'next/server';
import {
  loadForRead,
  serverError,
  resolveParams,
} from '@/lib/program-logic/route-helpers';
import { fetchGraph, validateGraph } from '@/lib/program-logic/service';

export const dynamic = 'force-dynamic';

type Params = { params: { logicId: string } | Promise<{ logicId: string }> };

/**
 * GET a validation report: cycles (error), orphan nodes, nodes above the
 * attribution ceiling reached only by attribution edges, same-tier/downward
 * edges, and reverse cross-scope roll-up edges (warnings).
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const { logicId } = await resolveParams(params);
  const { ctx, error } = await loadForRead(logicId);
  if (error) return error;
  try {
    const graph = await fetchGraph(ctx.admin, ctx.logic);
    return NextResponse.json(validateGraph(graph));
  } catch (e) {
    console.error('[validate] GET error:', e);
    return serverError();
  }
}

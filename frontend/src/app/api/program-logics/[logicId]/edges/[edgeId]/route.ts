import { NextRequest, NextResponse } from 'next/server';
import {
  loadForWrite,
  badRequest,
  notFound,
  serverError,
  resolveParams,
} from '@/lib/program-logic/route-helpers';
import type { EdgeLinkType } from '@/lib/program-logic/types';

export const dynamic = 'force-dynamic';

type Params = {
  params:
    | { logicId: string; edgeId: string }
    | Promise<{ logicId: string; edgeId: string }>;
};

/** PATCH an edge's link_type and/or rationale. (Re-pointing an edge = delete + recreate, so cycle checks re-run.) */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { logicId, edgeId } = await resolveParams(params);
  const { ctx, error } = await loadForWrite(logicId);
  if (error) return error;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const update: Record<string, unknown> = {};
  if (body.link_type !== undefined) {
    const lt: EdgeLinkType = body.link_type;
    if (lt !== 'attribution' && lt !== 'contribution')
      return badRequest(`Invalid link_type: ${body.link_type}`);
    update.link_type = lt;
  }
  if ('rationale' in body) update.rationale = body.rationale ?? null;
  if (Object.keys(update).length === 0) return badRequest('No updatable fields provided');

  try {
    const { data, error: upErr } = await ctx.admin
      .from('logic_edges')
      .update(update)
      .eq('id', edgeId)
      .eq('program_logic_id', logicId)
      .select('*')
      .maybeSingle();
    if (upErr) throw upErr;
    if (!data) return notFound('Edge');
    return NextResponse.json({ edge: data });
  } catch (e) {
    console.error('[edges/:id] PATCH error:', e);
    return serverError();
  }
}

/** DELETE an edge. */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { logicId, edgeId } = await resolveParams(params);
  const { ctx, error } = await loadForWrite(logicId);
  if (error) return error;

  try {
    const { error: delErr } = await ctx.admin
      .from('logic_edges')
      .delete()
      .eq('id', edgeId)
      .eq('program_logic_id', logicId);
    if (delErr) throw delErr;
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[edges/:id] DELETE error:', e);
    return serverError();
  }
}

import { NextRequest, NextResponse } from 'next/server';
import {
  loadForWrite,
  serverError,
  resolveParams,
} from '@/lib/program-logic/route-helpers';

export const dynamic = 'force-dynamic';

type Params = {
  params:
    | { logicId: string; nodeId: string; linkId: string }
    | Promise<{ logicId: string; nodeId: string; linkId: string }>;
};

/**
 * DELETE an indicator link. Removes ONLY the link row — the node and the
 * underlying IATI indicator are untouched.
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { logicId, nodeId, linkId } = await resolveParams(params);
  const { ctx, error } = await loadForWrite(logicId);
  if (error) return error;

  try {
    const { error: delErr } = await ctx.admin
      .from('logic_indicator_links')
      .delete()
      .eq('id', linkId)
      .eq('node_id', nodeId);
    if (delErr) throw delErr;
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[indicators/:linkId] DELETE error:', e);
    return serverError();
  }
}

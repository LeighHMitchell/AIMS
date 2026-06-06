import { NextRequest, NextResponse } from 'next/server';
import {
  loadForRead,
  badRequest,
  notFound,
  serverError,
  resolveParams,
} from '@/lib/program-logic/route-helpers';
import { diffSnapshots } from '@/lib/program-logic/service';

export const dynamic = 'force-dynamic';

type Params = { params: { logicId: string } | Promise<{ logicId: string }> };

/**
 * GET /api/program-logics/:id/snapshots/diff?from=<snapshotId>&to=<snapshotId>
 * Returns added/removed/changed nodes and edges between two snapshots of the
 * same logic.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { logicId } = await resolveParams(params);
  const { ctx, error } = await loadForRead(logicId);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const fromId = searchParams.get('from');
  const toId = searchParams.get('to');
  if (!fromId || !toId) return badRequest('from and to snapshot ids are required');

  try {
    const { data } = await ctx.admin
      .from('logic_snapshots')
      .select('id, version_label, created_at, payload, program_logic_id')
      .eq('program_logic_id', logicId)
      .in('id', [fromId, toId]);
    const rows = (data as any[]) ?? [];
    const from = rows.find((r) => r.id === fromId);
    const to = rows.find((r) => r.id === toId);
    if (!from || !to)
      return notFound('One or both snapshots');

    return NextResponse.json(diffSnapshots(from, to));
  } catch (e) {
    console.error('[snapshots/diff] GET error:', e);
    return serverError();
  }
}

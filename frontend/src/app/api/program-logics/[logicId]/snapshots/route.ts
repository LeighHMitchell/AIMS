import { NextRequest, NextResponse } from 'next/server';
import {
  loadForRead,
  loadForWrite,
  recordSnapshot,
  badRequest,
  serverError,
  resolveParams,
} from '@/lib/program-logic/route-helpers';

export const dynamic = 'force-dynamic';

type Params = { params: { logicId: string } | Promise<{ logicId: string }> };

/** GET snapshot history (metadata only unless ?include=payload). */
export async function GET(request: NextRequest, { params }: Params) {
  const { logicId } = await resolveParams(params);
  const { ctx, error } = await loadForRead(logicId);
  if (error) return error;

  const includePayload =
    new URL(request.url).searchParams.get('include') === 'payload';
  const cols = includePayload
    ? '*'
    : 'id, program_logic_id, version_label, snapshot_type, reason, created_by, created_at';

  const { data, error: e } = await ctx.admin
    .from('logic_snapshots')
    .select(cols)
    .eq('program_logic_id', logicId)
    .order('created_at', { ascending: true });
  if (e) return serverError();
  return NextResponse.json({ snapshots: data ?? [] });
}

/**
 * POST a snapshot.
 * Body: { snapshot_type: 'baseline' | 'revision', version_label?, reason? }
 *  - baseline: only from status 'draft'; flips status to 'baselined'.
 *  - revision: requires a non-empty reason.
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

  const type = body.snapshot_type;
  if (type !== 'baseline' && type !== 'revision')
    return badRequest("snapshot_type must be 'baseline' or 'revision'");

  try {
    if (type === 'baseline') {
      if (ctx.logic.status !== 'draft')
        return badRequest(
          `A baseline can only be set from a draft logic (current status: ${ctx.logic.status}). Use a revision instead.`
        );
      const snapshot = await recordSnapshot(ctx.admin, logicId, {
        type: 'baseline',
        version_label: body.version_label?.trim() || 'Baseline',
        reason: body.reason ?? null,
        userId: ctx.user.id,
      });
      const { data: logic, error: upErr } = await ctx.admin
        .from('program_logics')
        .update({ status: 'baselined', updated_at: new Date().toISOString() })
        .eq('id', logicId)
        .select('*')
        .single();
      if (upErr) throw upErr;
      return NextResponse.json({ snapshot, logic }, { status: 201 });
    }

    // revision
    const reason = body.reason?.trim();
    if (!reason) return badRequest('A non-empty reason is required for a revision');
    const snapshot = await recordSnapshot(ctx.admin, logicId, {
      type: 'revision',
      version_label: body.version_label?.trim() || 'Revision',
      reason,
      userId: ctx.user.id,
    });
    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (e) {
    console.error('[snapshots] POST error:', e);
    return serverError();
  }
}

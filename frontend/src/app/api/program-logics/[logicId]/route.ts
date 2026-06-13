import { NextRequest, NextResponse } from 'next/server';
import { fetchGraph } from '@/lib/program-logic/service';
import {
  loadForRead,
  loadForWrite,
  badRequest,
  serverError,
  resolveParams,
} from '@/lib/program-logic/route-helpers';
import { getPreset } from '@/lib/program-logic/presets';
import type {
  NodeScope,
  ProgramLogicStatus,
} from '@/lib/program-logic/types';

export const dynamic = 'force-dynamic';

type Params = { params: { logicId: string } | Promise<{ logicId: string }> };

const STATUSES: ProgramLogicStatus[] = ['draft', 'baselined', 'active', 'closed'];

/** GET full graph for a logic, filterable by scope and activity. */
export async function GET(request: NextRequest, { params }: Params) {
  const { logicId } = await resolveParams(params);
  const { ctx, error } = await loadForRead(logicId);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') as NodeScope | null;
    const activityFilter = searchParams.get('activity') ?? undefined;
    const graph = await fetchGraph(ctx.admin, ctx.logic, {
      scope: scope === 'investment' || scope === 'activity' ? scope : undefined,
      activityId: activityFilter,
    });
    return NextResponse.json(graph);
  } catch (e) {
    console.error('[program-logics/:id] GET error:', e);
    return serverError();
  }
}

/**
 * PATCH a logic's title/description/status/framework_preset.
 * Changing framework_preset never drops tiers or nodes — it only updates the
 * label and returns a warning that tiers may need re-tiering.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { logicId } = await resolveParams(params);
  const { ctx, error } = await loadForWrite(logicId);
  if (error) return error;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const update: Record<string, unknown> = {};
  let presetWarning: string | undefined;

  if (typeof body.title === 'string') {
    if (!body.title.trim()) return badRequest('title cannot be empty');
    update.title = body.title.trim();
  }
  if ('description' in body) update.description = body.description ?? null;
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status))
      return badRequest(`Invalid status: ${body.status}`);
    update.status = body.status;
  }
  if (body.framework_preset !== undefined) {
    if (!getPreset(body.framework_preset))
      return badRequest(`Unknown framework_preset: ${body.framework_preset}`);
    update.framework_preset = body.framework_preset;
    presetWarning =
      'Framework changed. Existing tiers and nodes were kept unchanged. Review the tier vocabulary and re-tier any nodes as needed.';
  }

  if (Object.keys(update).length === 0) return badRequest('No updatable fields provided');
  update.updated_at = new Date().toISOString();

  try {
    const { data, error: upErr } = await ctx.admin
      .from('program_logics')
      .update(update)
      .eq('id', logicId)
      .select('*')
      .single();
    if (upErr) throw upErr;
    return NextResponse.json({ logic: data, warning: presetWarning });
  } catch (e) {
    console.error('[program-logics/:id] PATCH error:', e);
    return serverError();
  }
}

/** DELETE a logic (cascades tiers, nodes, edges, indicator links, snapshots). */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { logicId } = await resolveParams(params);
  const { ctx, error } = await loadForWrite(logicId);
  if (error) return error;

  try {
    const { error: delErr } = await ctx.admin
      .from('program_logics')
      .delete()
      .eq('id', logicId);
    if (delErr) throw delErr;
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[program-logics/:id] DELETE error:', e);
    return serverError();
  }
}

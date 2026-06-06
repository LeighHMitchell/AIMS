import { NextRequest, NextResponse } from 'next/server';
import {
  loadForWrite,
  badRequest,
  notFound,
  serverError,
  resolveParams,
} from '@/lib/program-logic/route-helpers';
import type { IatiResultType } from '@/lib/program-logic/presets';

export const dynamic = 'force-dynamic';

type Params = {
  params:
    | { logicId: string; tierId: string }
    | Promise<{ logicId: string; tierId: string }>;
};

const IATI_TYPES: IatiResultType[] = ['output', 'outcome', 'impact', 'none'];

/** PATCH a tier (rename, re-code, reorder, change iati type / attribution boundary). */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { logicId, tierId } = await resolveParams(params);
  const { ctx, error } = await loadForWrite(logicId);
  if (error) return error;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const update: Record<string, unknown> = {};
  if (typeof body.name === 'string') {
    if (!body.name.trim()) return badRequest('name cannot be empty');
    update.name = body.name.trim();
  }
  if (typeof body.short_code === 'string') {
    if (!body.short_code.trim()) return badRequest('short_code cannot be empty');
    update.short_code = body.short_code.trim();
  }
  if (body.level_order !== undefined) {
    if (typeof body.level_order !== 'number')
      return badRequest('level_order must be a number');
    update.level_order = body.level_order;
  }
  if (body.iati_result_type !== undefined) {
    if (!IATI_TYPES.includes(body.iati_result_type))
      return badRequest(`Invalid iati_result_type: ${body.iati_result_type}`);
    update.iati_result_type = body.iati_result_type;
  }
  if (body.attribution_boundary !== undefined)
    update.attribution_boundary = !!body.attribution_boundary;

  if (Object.keys(update).length === 0) return badRequest('No updatable fields provided');

  try {
    const { data, error: upErr } = await ctx.admin
      .from('logic_tiers')
      .update(update)
      .eq('id', tierId)
      .eq('program_logic_id', logicId)
      .select('*')
      .maybeSingle();
    if (upErr) {
      if (upErr.code === '23505')
        return NextResponse.json(
          { error: 'A tier with that level_order or short_code already exists' },
          { status: 409 }
        );
      throw upErr;
    }
    if (!data) return notFound('Tier');
    return NextResponse.json({ tier: data });
  } catch (e) {
    console.error('[tiers/:id] PATCH error:', e);
    return serverError();
  }
}

/** DELETE a tier. Blocked (409) if any node still references it. */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { logicId, tierId } = await resolveParams(params);
  const { ctx, error } = await loadForWrite(logicId);
  if (error) return error;

  try {
    const { count } = await ctx.admin
      .from('logic_nodes')
      .select('id', { count: 'exact', head: true })
      .eq('tier_id', tierId);
    if ((count ?? 0) > 0)
      return NextResponse.json(
        { error: `Cannot delete a tier with ${count} node(s). Move or delete those nodes first.` },
        { status: 409 }
      );

    const { error: delErr } = await ctx.admin
      .from('logic_tiers')
      .delete()
      .eq('id', tierId)
      .eq('program_logic_id', logicId);
    if (delErr) throw delErr;
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[tiers/:id] DELETE error:', e);
    return serverError();
  }
}

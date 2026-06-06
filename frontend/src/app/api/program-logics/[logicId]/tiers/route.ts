import { NextRequest, NextResponse } from 'next/server';
import {
  loadForRead,
  loadForWrite,
  badRequest,
  serverError,
  resolveParams,
} from '@/lib/program-logic/route-helpers';
import type { IatiResultType } from '@/lib/program-logic/presets';

export const dynamic = 'force-dynamic';

type Params = { params: { logicId: string } | Promise<{ logicId: string }> };

const IATI_TYPES: IatiResultType[] = ['output', 'outcome', 'impact', 'none'];

/** GET all tiers for a logic, ordered bottom (0) to top. */
export async function GET(_request: NextRequest, { params }: Params) {
  const { logicId } = await resolveParams(params);
  const { ctx, error } = await loadForRead(logicId);
  if (error) return error;
  const { data, error: e } = await ctx.admin
    .from('logic_tiers')
    .select('*')
    .eq('program_logic_id', logicId)
    .order('level_order', { ascending: true });
  if (e) return serverError();
  return NextResponse.json({ tiers: data ?? [] });
}

/** POST a new tier. Body: { name, short_code, level_order, iati_result_type?, attribution_boundary? } */
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

  if (!body.name || !String(body.name).trim()) return badRequest('name is required');
  if (!body.short_code || !String(body.short_code).trim())
    return badRequest('short_code is required');
  if (typeof body.level_order !== 'number')
    return badRequest('level_order (number) is required');
  const iati: IatiResultType = body.iati_result_type ?? 'none';
  if (!IATI_TYPES.includes(iati))
    return badRequest(`Invalid iati_result_type: ${body.iati_result_type}`);

  try {
    const { data, error: insErr } = await ctx.admin
      .from('logic_tiers')
      .insert({
        program_logic_id: logicId,
        name: String(body.name).trim(),
        short_code: String(body.short_code).trim(),
        level_order: body.level_order,
        iati_result_type: iati,
        attribution_boundary: !!body.attribution_boundary,
      })
      .select('*')
      .single();
    if (insErr) {
      if (insErr.code === '23505')
        return NextResponse.json(
          { error: 'A tier with that level_order or short_code already exists' },
          { status: 409 }
        );
      throw insErr;
    }
    return NextResponse.json({ tier: data }, { status: 201 });
  } catch (e) {
    console.error('[tiers] POST error:', e);
    return serverError();
  }
}

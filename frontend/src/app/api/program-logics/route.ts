import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { canEditActivity } from '@/lib/activity-permissions-server';
import {
  adminOrThrow,
  getLogicForActivity,
  canAccessActivity,
} from '@/lib/program-logic/permissions';
import { fetchGraph } from '@/lib/program-logic/service';
import {
  FRAMEWORK_PRESETS,
  getPreset,
  type FrameworkPreset,
  type PresetTier,
} from '@/lib/program-logic/presets';
import {
  badRequest,
  forbidden,
  serverError,
  unauthorized,
} from '@/lib/program-logic/route-helpers';
import type { NodeScope } from '@/lib/program-logic/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/program-logics?activityId=<umbrella>&scope=&activity=
 * Returns the full graph for an investment's program logic, or { logic: null }
 * if none exists yet. Filterable by scope and by a specific activity.
 */
export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (response || !user) return response ?? unauthorized();

  const { searchParams } = new URL(request.url);
  const activityId = searchParams.get('activityId');
  if (!activityId) return badRequest('activityId is required');

  try {
    const admin = adminOrThrow();
    if (!(await canAccessActivity(admin, user.id, activityId)))
      return forbidden();

    const logic = await getLogicForActivity(admin, activityId);
    if (!logic) return NextResponse.json({ logic: null });

    const scope = (searchParams.get('scope') as NodeScope | null) ?? undefined;
    const activityFilter = searchParams.get('activity') ?? undefined;
    const graph = await fetchGraph(admin, logic, {
      scope: scope === 'investment' || scope === 'activity' ? scope : undefined,
      activityId: activityFilter,
    });
    return NextResponse.json(graph);
  } catch (e) {
    console.error('[program-logics] GET error:', e);
    return serverError();
  }
}

/**
 * POST /api/program-logics
 * Create a program logic from a preset (or custom) and seed its tiers in one call.
 * Body: { activityId, framework_preset, title, description?, tiers? }
 *   - framework_preset: one of the preset keys (default 'dac_default')
 *   - tiers: optional custom tier list (used when framework_preset = 'custom',
 *     or to override the preset seed). Shape: PresetTier[].
 */
export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (response || !user) return response ?? unauthorized();

  let body: any;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const activityId: string | undefined = body.activityId;
  const preset: FrameworkPreset = body.framework_preset ?? 'dac_default';
  const title: string | undefined = body.title;
  const description: string | null = body.description ?? null;
  const customTiers: PresetTier[] | undefined = body.tiers;

  if (!activityId) return badRequest('activityId is required');
  if (!title || !title.trim()) return badRequest('title is required');
  if (!getPreset(preset)) return badRequest(`Unknown framework_preset: ${preset}`);

  try {
    const admin = adminOrThrow();

    // Umbrella activity must exist and be editable by the user.
    const { data: activity } = await admin
      .from('activities')
      .select('id')
      .eq('id', activityId)
      .single();
    if (!activity) return badRequest('Umbrella activity not found');
    if (!(await canEditActivity(user.id, activityId))) return forbidden();

    // One logic per investment.
    const existing = await getLogicForActivity(admin, activityId);
    if (existing)
      return NextResponse.json(
        { error: 'A program logic already exists for this investment', logic: existing },
        { status: 409 }
      );

    const { data: logic, error: logicErr } = await admin
      .from('program_logics')
      .insert({
        investment_id: activityId,
        framework_preset: preset,
        title: title.trim(),
        description,
        status: 'draft',
        created_by: user.id,
      })
      .select('*')
      .single();
    if (logicErr || !logic) throw logicErr ?? new Error('Failed to create logic');

    // Seed tiers: explicit custom tiers win, else the preset's tiers.
    const seed: PresetTier[] =
      customTiers && customTiers.length > 0
        ? customTiers
        : FRAMEWORK_PRESETS[preset].tiers;

    let tiers: any[] = [];
    if (seed.length > 0) {
      const rows = seed.map((t, i) => ({
        program_logic_id: logic.id,
        name: t.name,
        short_code: t.short_code,
        level_order: t.level_order ?? i,
        iati_result_type: t.iati_result_type ?? 'none',
        attribution_boundary: !!t.attribution_boundary,
      }));
      const { data: inserted, error: tierErr } = await admin
        .from('logic_tiers')
        .insert(rows)
        .select('*');
      if (tierErr) {
        // roll back the logic so we don't leave a tier-less orphan on failure
        await admin.from('program_logics').delete().eq('id', logic.id);
        throw tierErr;
      }
      tiers = inserted ?? [];
    }

    return NextResponse.json({ logic, tiers }, { status: 201 });
  } catch (e) {
    console.error('[program-logics] POST error:', e);
    return serverError();
  }
}

/**
 * Route-level authorization + activity-membership helpers for Program Logic.
 *
 * A program logic belongs to an umbrella activity (program_logics.investment_id ->
 * activities.id). All read/write access is derived from that activity using the
 * app's existing server-side activity permission helpers. RLS on the program-logic
 * tables is a backstop; these route checks are the primary gate (matching how the
 * rest of the app treats activity-scoped writes).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase';
import { canEditActivity } from '@/lib/activity-permissions-server';
import type { ProgramLogicRow } from './types';

export interface LogicContext {
  logic: ProgramLogicRow;
  investmentId: string;
}

/** Admin client or throw — every program-logic route needs DB access. */
export function adminOrThrow(): SupabaseClient {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error('Database connection not initialized');
  return admin;
}

/** Fetch a program logic row by id (admin client; null if not found). */
export async function getLogicById(
  admin: SupabaseClient,
  logicId: string
): Promise<ProgramLogicRow | null> {
  const { data } = await admin
    .from('program_logics')
    .select('*')
    .eq('id', logicId)
    .single();
  return (data as ProgramLogicRow) ?? null;
}

/** Fetch the single program logic for an umbrella activity (null if none). */
export async function getLogicForActivity(
  admin: SupabaseClient,
  investmentId: string
): Promise<ProgramLogicRow | null> {
  const { data } = await admin
    .from('program_logics')
    .select('*')
    .eq('investment_id', investmentId)
    .maybeSingle();
  return (data as ProgramLogicRow) ?? null;
}

/**
 * Can the user READ this activity's program logic?
 * published umbrella activity OR the user can edit it.
 */
export async function canAccessActivity(
  admin: SupabaseClient,
  userId: string,
  activityId: string
): Promise<boolean> {
  const { data } = await admin
    .from('activities')
    .select('publication_status')
    .eq('id', activityId)
    .single();
  if (data?.publication_status === 'published') return true;
  return canEditActivity(userId, activityId);
}

/**
 * The set of activity ids that belong to an investment (umbrella) for the purpose
 * of scope integrity + indicator search: the umbrella itself plus its child
 * activities, derived from IATI activity_relationships
 * (type '2' = Child from the umbrella, type '1' = Parent declared on the child).
 */
export async function getInvestmentActivityIds(
  admin: SupabaseClient,
  umbrellaId: string
): Promise<string[]> {
  const ids = new Set<string>([umbrellaId]);

  const { data: asParent } = await admin
    .from('activity_relationships')
    .select('related_activity_id')
    .eq('activity_id', umbrellaId)
    .eq('relationship_type', '2');
  (asParent ?? []).forEach((r: any) => {
    if (r.related_activity_id) ids.add(r.related_activity_id);
  });

  const { data: asChild } = await admin
    .from('activity_relationships')
    .select('activity_id')
    .eq('related_activity_id', umbrellaId)
    .eq('relationship_type', '1');
  (asChild ?? []).forEach((r: any) => {
    if (r.activity_id) ids.add(r.activity_id);
  });

  return Array.from(ids);
}

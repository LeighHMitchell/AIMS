/**
 * Thin auth/loading helpers shared by all program-logic API routes.
 *
 * Reads require the user to be able to ACCESS the umbrella activity (published or
 * editable). Writes require the user to be able to EDIT it. Both resolve through
 * the existing server-side activity permission helpers (the primary gate); RLS is
 * a backstop. All DB work uses the admin client so the permission decision is the
 * sole authority and is not affected by RLS row visibility.
 */
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth';
import { canEditActivity } from '@/lib/activity-permissions-server';
import {
  adminOrThrow,
  getLogicById,
  canAccessActivity,
} from './permissions';
import { buildSnapshotPayload } from './service';
import type { ProgramLogicRow, SnapshotType } from './types';

export interface LogicCtx {
  admin: SupabaseClient;
  user: User;
  logic: ProgramLogicRow;
}

type Loaded = { ctx: LogicCtx; error: null } | { ctx: null; error: NextResponse };

async function base(): Promise<
  { admin: SupabaseClient; user: User } | { error: NextResponse }
> {
  const { user, response } = await requireAuth();
  if (response || !user) return { error: response ?? unauthorized() };
  let admin: SupabaseClient;
  try {
    admin = adminOrThrow();
  } catch {
    return { error: NextResponse.json({ error: 'Database connection not initialized' }, { status: 500 }) };
  }
  return { admin, user };
}

export async function loadForRead(logicId: string): Promise<Loaded> {
  const b = await base();
  if ('error' in b) return { ctx: null, error: b.error };
  const logic = await getLogicById(b.admin, logicId);
  if (!logic) return { ctx: null, error: notFound() };
  const ok = await canAccessActivity(b.admin, b.user.id, logic.investment_id);
  if (!ok) return { ctx: null, error: forbidden() };
  return { ctx: { admin: b.admin, user: b.user, logic }, error: null };
}

export async function loadForWrite(logicId: string): Promise<Loaded> {
  const b = await base();
  if ('error' in b) return { ctx: null, error: b.error };
  const logic = await getLogicById(b.admin, logicId);
  if (!logic) return { ctx: null, error: notFound() };
  const ok = await canEditActivity(b.user.id, logic.investment_id);
  if (!ok) return { ctx: null, error: forbidden() };
  return { ctx: { admin: b.admin, user: b.user, logic }, error: null };
}

/** Record a full-graph snapshot (baseline or revision). */
export async function recordSnapshot(
  admin: SupabaseClient,
  logicId: string,
  opts: { type: SnapshotType; version_label: string; reason?: string | null; userId: string }
) {
  const payload = await buildSnapshotPayload(admin, logicId);
  const { data, error } = await admin
    .from('logic_snapshots')
    .insert({
      program_logic_id: logicId,
      version_label: opts.version_label,
      snapshot_type: opts.type,
      reason: opts.reason ?? null,
      payload,
      created_by: opts.userId,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export const unauthorized = () =>
  NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
export const forbidden = () =>
  NextResponse.json({ error: 'Forbidden' }, { status: 403 });
export const notFound = (what = 'Program logic') =>
  NextResponse.json({ error: `${what} not found` }, { status: 404 });
export const badRequest = (message: string) =>
  NextResponse.json({ error: message }, { status: 400 });
export const serverError = (message = 'Internal server error') =>
  NextResponse.json({ error: message }, { status: 500 });

/** Resolve Next 14/15 sync-or-async route params. */
export async function resolveParams<T>(params: T | Promise<T>): Promise<T> {
  return Promise.resolve(params);
}

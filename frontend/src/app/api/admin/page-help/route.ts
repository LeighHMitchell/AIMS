import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const QUESTION_MAX = 200;
const ANSWER_MAX = 2000;

async function assertSuperUser(
  supabase: SupabaseClient,
  userId: string
): Promise<NextResponse | null> {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (data.role !== 'super_user') {
    return NextResponse.json(
      { error: 'Only super users can manage page help content.' },
      { status: 403 }
    );
  }
  return null;
}

function validateBody(body: any): { ok: true } | { ok: false; error: string } {
  const { page_slug, question, answer, display_order, published } = body ?? {};
  if (typeof page_slug !== 'string' || !page_slug.trim()) {
    return { ok: false, error: 'page_slug is required' };
  }
  if (typeof question !== 'string' || !question.trim()) {
    return { ok: false, error: 'question is required' };
  }
  if (question.length > QUESTION_MAX) {
    return { ok: false, error: `question exceeds ${QUESTION_MAX} characters` };
  }
  if (typeof answer !== 'string' || !answer.trim()) {
    return { ok: false, error: 'answer is required' };
  }
  if (answer.length > ANSWER_MAX) {
    return { ok: false, error: `answer exceeds ${ANSWER_MAX} characters` };
  }
  if (display_order !== undefined && typeof display_order !== 'number') {
    return { ok: false, error: 'display_order must be a number' };
  }
  if (published !== undefined && typeof published !== 'boolean') {
    return { ok: false, error: 'published must be a boolean' };
  }
  return { ok: true };
}

/**
 * GET /api/admin/page-help?slug=<slug>
 * Super-user read of ALL rows (including unpublished) for a slug.
 * If no slug is provided, returns all rows across all slugs (for the admin list).
 */
export async function GET(request: NextRequest) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase || !user) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const guard = await assertSuperUser(supabase, user.id);
  if (guard) return guard;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 });
  }

  const slug = request.nextUrl.searchParams.get('slug');
  let query = admin
    .from('page_help_content')
    .select('*')
    .order('page_slug', { ascending: true })
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (slug) query = query.eq('page_slug', slug);

  const { data, error } = await query;
  if (error) {
    console.error('[admin/page-help] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, data: data ?? [] });
}

/**
 * POST /api/admin/page-help
 * Create a new help row. Super-user only.
 */
export async function POST(request: NextRequest) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase || !user) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const guard = await assertSuperUser(supabase, user.id);
  if (guard) return guard;

  const body = await request.json();
  const v = validateBody(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 });
  }

  const { data, error } = await admin
    .from('page_help_content')
    .insert({
      page_slug: body.page_slug.trim(),
      question: body.question.trim(),
      answer: body.answer.trim(),
      display_order: body.display_order ?? 0,
      published: body.published ?? false,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('[admin/page-help] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, data }, { status: 201 });
}

/**
 * PATCH /api/admin/page-help
 * Update an existing row. Body must include `id`. Super-user only.
 */
export async function PATCH(request: NextRequest) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase || !user) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const guard = await assertSuperUser(supabase, user.id);
  if (guard) return guard;

  const body = await request.json();
  if (!body?.id || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  // For PATCH we allow partial updates but still enforce limits on provided fields.
  const updates: Record<string, any> = {};
  if (body.page_slug !== undefined) {
    if (typeof body.page_slug !== 'string' || !body.page_slug.trim()) {
      return NextResponse.json({ error: 'page_slug must be a non-empty string' }, { status: 400 });
    }
    updates.page_slug = body.page_slug.trim();
  }
  if (body.question !== undefined) {
    if (typeof body.question !== 'string' || !body.question.trim()) {
      return NextResponse.json({ error: 'question must be a non-empty string' }, { status: 400 });
    }
    if (body.question.length > QUESTION_MAX) {
      return NextResponse.json({ error: `question exceeds ${QUESTION_MAX} characters` }, { status: 400 });
    }
    updates.question = body.question.trim();
  }
  if (body.answer !== undefined) {
    if (typeof body.answer !== 'string' || !body.answer.trim()) {
      return NextResponse.json({ error: 'answer must be a non-empty string' }, { status: 400 });
    }
    if (body.answer.length > ANSWER_MAX) {
      return NextResponse.json({ error: `answer exceeds ${ANSWER_MAX} characters` }, { status: 400 });
    }
    updates.answer = body.answer.trim();
  }
  if (body.display_order !== undefined) {
    if (typeof body.display_order !== 'number') {
      return NextResponse.json({ error: 'display_order must be a number' }, { status: 400 });
    }
    updates.display_order = body.display_order;
  }
  if (body.published !== undefined) {
    if (typeof body.published !== 'boolean') {
      return NextResponse.json({ error: 'published must be a boolean' }, { status: 400 });
    }
    updates.published = body.published;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 });
  }

  const { data, error } = await admin
    .from('page_help_content')
    .update(updates)
    .eq('id', body.id)
    .select()
    .single();

  if (error) {
    console.error('[admin/page-help] PATCH error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, data });
}

/**
 * DELETE /api/admin/page-help?id=<uuid>
 * Remove a row. Super-user only.
 */
export async function DELETE(request: NextRequest) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase || !user) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const guard = await assertSuperUser(supabase, user.id);
  if (guard) return guard;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 });
  }

  const { error } = await admin.from('page_help_content').delete().eq('id', id);
  if (error) {
    console.error('[admin/page-help] DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

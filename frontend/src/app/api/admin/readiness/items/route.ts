import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import type { UpsertChecklistItemRequest } from '@/types/readiness';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Check if user is admin
 */
async function requireAdmin(supabase: any, userId: string | undefined) {
  if (!userId) {
    return { error: 'Authentication required', status: 401 };
  }

  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    return { error: 'Admin access required', status: 403 };
  }

  return null;
}

/**
 * GET /api/admin/readiness/items
 * List all items, optionally filtered by template_id
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const adminError = await requireAdmin(supabase, user?.id);
    if (adminError) {
      return NextResponse.json({ error: adminError.error }, { status: adminError.status });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('template_id');

    let query = supabase
      .from('readiness_checklist_items')
      .select(`
        *,
        template:readiness_checklist_templates(id, name, code)
      `)
      .order('display_order', { ascending: true });

    if (templateId) {
      query = query.eq('template_id', templateId);
    }

    const { data: items, error } = await query;

    if (error) {
      console.error('[Admin Readiness API] Error fetching items:', error);
      return NextResponse.json(
        { error: 'Failed to fetch items' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      items
    });

  } catch (error) {
    console.error('[Admin Readiness API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/readiness/items
 * Create a new checklist item
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const adminError = await requireAdmin(supabase, user?.id);
    if (adminError) {
      return NextResponse.json({ error: adminError.error }, { status: adminError.status });
    }

    const body: UpsertChecklistItemRequest = await request.json();

    // Validate required fields
    if (!body.template_id || !body.code || !body.title || body.display_order === undefined) {
      return NextResponse.json(
        { error: 'template_id, code, title, and display_order are required' },
        { status: 400 }
      );
    }

    // Verify template exists
    const { data: template, error: templateError } = await supabase
      .from('readiness_checklist_templates')
      .select('id')
      .eq('id', body.template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Check for duplicate code within template
    const { data: existing } = await supabase
      .from('readiness_checklist_items')
      .select('id')
      .eq('template_id', body.template_id)
      .eq('code', body.code)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'An item with this code already exists in this template' },
        { status: 400 }
      );
    }

    const { data: item, error } = await supabase
      .from('readiness_checklist_items')
      .insert({
        template_id: body.template_id,
        code: body.code,
        title: body.title,
        description: body.description || null,
        guidance_text: body.guidance_text || null,
        responsible_agency_type: body.responsible_agency_type || null,
        display_order: body.display_order,
        is_required: body.is_required ?? true,
        is_active: body.is_active ?? true,
        applicable_conditions: body.applicable_conditions || {},
      })
      .select()
      .single();

    if (error) {
      console.error('[Admin Readiness API] Error creating item:', error);
      return NextResponse.json(
        { error: 'Failed to create item', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      item
    });

  } catch (error) {
    console.error('[Admin Readiness API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

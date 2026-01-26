import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import type { UpsertTemplateRequest } from '@/types/readiness';

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
 * GET /api/admin/readiness/templates/[id]
 * Get a single template with all its items
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { supabase, user, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const adminError = await requireAdmin(supabase, user?.id);
    if (adminError) {
      return NextResponse.json({ error: adminError.error }, { status: adminError.status });
    }

    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    const { data: template, error } = await supabase
      .from('readiness_checklist_templates')
      .select(`
        *,
        items:readiness_checklist_items(*)
      `)
      .eq('id', id)
      .single();

    if (error || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Sort items by display_order
    template.items = template.items?.sort((a: any, b: any) => a.display_order - b.display_order) || [];

    return NextResponse.json({
      success: true,
      template
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
 * PATCH /api/admin/readiness/templates/[id]
 * Update a template
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { supabase, user, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const adminError = await requireAdmin(supabase, user?.id);
    if (adminError) {
      return NextResponse.json({ error: adminError.error }, { status: adminError.status });
    }

    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    const body: Partial<UpsertTemplateRequest> = await request.json();

    // Build update object with only provided fields
    const updateData: any = {};
    if (body.code !== undefined) updateData.code = body.code;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.stage_order !== undefined) updateData.stage_order = body.stage_order;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Check for duplicate code if code is being updated
    if (body.code) {
      const { data: existing } = await supabase
        .from('readiness_checklist_templates')
        .select('id')
        .eq('code', body.code)
        .neq('id', id)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: 'A template with this code already exists' },
          { status: 400 }
        );
      }
    }

    const { data: template, error } = await supabase
      .from('readiness_checklist_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Admin Readiness API] Error updating template:', error);
      return NextResponse.json(
        { error: 'Failed to update template', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      template
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
 * DELETE /api/admin/readiness/templates/[id]
 * Delete a template (will cascade delete all items)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { supabase, user, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const adminError = await requireAdmin(supabase, user?.id);
    if (adminError) {
      return NextResponse.json({ error: adminError.error }, { status: adminError.status });
    }

    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    // Check if there are any sign-offs using this template
    const { data: signoffs } = await supabase
      .from('readiness_stage_signoffs')
      .select('id')
      .eq('template_id', id)
      .limit(1);

    if (signoffs && signoffs.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete template that has been used for sign-offs. Deactivate it instead.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('readiness_checklist_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Admin Readiness API] Error deleting template:', error);
      return NextResponse.json(
        { error: 'Failed to delete template', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('[Admin Readiness API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

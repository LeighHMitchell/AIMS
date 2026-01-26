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
 * GET /api/admin/readiness/items/[id]
 * Get a single checklist item
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

    const { data: item, error } = await supabase
      .from('readiness_checklist_items')
      .select(`
        *,
        template:readiness_checklist_templates(id, name, code)
      `)
      .eq('id', id)
      .single();

    if (error || !item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
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

/**
 * PATCH /api/admin/readiness/items/[id]
 * Update a checklist item
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
    const body: Partial<UpsertChecklistItemRequest> = await request.json();

    // Get current item to check template_id
    const { data: currentItem } = await supabase
      .from('readiness_checklist_items')
      .select('template_id')
      .eq('id', id)
      .single();

    if (!currentItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (body.code !== undefined) updateData.code = body.code;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.guidance_text !== undefined) updateData.guidance_text = body.guidance_text;
    if (body.responsible_agency_type !== undefined) updateData.responsible_agency_type = body.responsible_agency_type;
    if (body.display_order !== undefined) updateData.display_order = body.display_order;
    if (body.is_required !== undefined) updateData.is_required = body.is_required;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.applicable_conditions !== undefined) updateData.applicable_conditions = body.applicable_conditions;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Check for duplicate code if code is being updated
    if (body.code) {
      const { data: existing } = await supabase
        .from('readiness_checklist_items')
        .select('id')
        .eq('template_id', currentItem.template_id)
        .eq('code', body.code)
        .neq('id', id)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: 'An item with this code already exists in this template' },
          { status: 400 }
        );
      }
    }

    const { data: item, error } = await supabase
      .from('readiness_checklist_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Admin Readiness API] Error updating item:', error);
      return NextResponse.json(
        { error: 'Failed to update item', details: error.message },
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

/**
 * DELETE /api/admin/readiness/items/[id]
 * Delete a checklist item
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

    // Check if there are any responses using this item
    const { data: responses } = await supabase
      .from('activity_readiness_responses')
      .select('id')
      .eq('checklist_item_id', id)
      .limit(1);

    if (responses && responses.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete item that has responses. Deactivate it instead.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('readiness_checklist_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Admin Readiness API] Error deleting item:', error);
      return NextResponse.json(
        { error: 'Failed to delete item', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Item deleted successfully'
    });

  } catch (error) {
    console.error('[Admin Readiness API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

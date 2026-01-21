import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import type { UpdateTemplateRequest, TaskPriority, TaskType, TargetScope } from '@/types/task';

export const dynamic = 'force-dynamic';

// GET /api/tasks/templates/[id] - Get single template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    const { data: template, error } = await supabase
      .from('task_templates')
      .select(`
        *,
        creator:users!created_by_user_id(id, first_name, last_name, email, avatar_url),
        organization:organizations!created_by_org_id(id, name, acronym)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[Templates API] Error fetching template:', error);
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check access if userId provided
    if (userId) {
      const { data: user } = await supabase
        .from('users')
        .select('role, organization_id')
        .eq('id', userId)
        .single();

      const { data: userOrgs } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', userId);

      const userOrgIds = new Set<string>();
      userOrgs?.forEach((uo: any) => userOrgIds.add(uo.organization_id));
      if (user?.organization_id) userOrgIds.add(user.organization_id);

      const isSuperUser = user?.role === 'super_user';
      const canAccess =
        isSuperUser ||
        template.is_system_template ||
        template.created_by_user_id === userId ||
        (template.created_by_org_id && userOrgIds.has(template.created_by_org_id));

      if (!canAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('[Templates API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/tasks/templates/[id] - Update template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { userId, ...updates }: { userId: string } & UpdateTemplateRequest = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get existing template
    const { data: template, error: fetchError } = await supabase
      .from('task_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    const isSuperUser = user?.role === 'super_user';

    // Check permissions
    if (template.is_system_template && !isSuperUser) {
      return NextResponse.json({
        error: 'Only super users can update system templates'
      }, { status: 403 });
    }

    if (!template.is_system_template && template.created_by_user_id !== userId && !isSuperUser) {
      return NextResponse.json({
        error: 'You can only update your own templates'
      }, { status: 403 });
    }

    // Build update object
    const updateData: any = { updated_at: new Date().toISOString() };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.default_title !== undefined) updateData.default_title = updates.default_title;
    if (updates.default_body !== undefined) updateData.default_body = updates.default_body;
    if (updates.default_send_in_app !== undefined) updateData.default_send_in_app = updates.default_send_in_app;
    if (updates.default_send_email !== undefined) updateData.default_send_email = updates.default_send_email;
    if (updates.default_priority !== undefined) updateData.default_priority = updates.default_priority as TaskPriority;
    if (updates.default_reminder_days !== undefined) updateData.default_reminder_days = updates.default_reminder_days;
    if (updates.default_task_type !== undefined) updateData.default_task_type = updates.default_task_type as TaskType;
    if (updates.default_target_scope !== undefined) updateData.default_target_scope = updates.default_target_scope as TargetScope;
    if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

    // Update template
    const { data: updatedTemplate, error: updateError } = await supabase
      .from('task_templates')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        creator:users!created_by_user_id(id, first_name, last_name, email, avatar_url),
        organization:organizations!created_by_org_id(id, name, acronym)
      `)
      .single();

    if (updateError) {
      console.error('[Templates API] Error updating template:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log('[Templates API] Template updated:', id);

    return NextResponse.json({
      success: true,
      data: updatedTemplate,
    });
  } catch (error) {
    console.error('[Templates API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tasks/templates/[id] - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get existing template
    const { data: template, error: fetchError } = await supabase
      .from('task_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    const isSuperUser = user?.role === 'super_user';

    // Check permissions
    if (template.is_system_template && !isSuperUser) {
      return NextResponse.json({
        error: 'Only super users can delete system templates'
      }, { status: 403 });
    }

    if (!template.is_system_template && template.created_by_user_id !== userId && !isSuperUser) {
      return NextResponse.json({
        error: 'You can only delete your own templates'
      }, { status: 403 });
    }

    // Soft delete by setting is_active = false (or hard delete if preferred)
    const { error: deleteError } = await supabase
      .from('task_templates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (deleteError) {
      console.error('[Templates API] Error deleting template:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    console.log('[Templates API] Template deleted (soft):', id);

    return NextResponse.json({
      success: true,
      message: 'Template deleted',
    });
  } catch (error) {
    console.error('[Templates API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

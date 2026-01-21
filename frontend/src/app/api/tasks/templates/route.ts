import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import type { CreateTemplateRequest, TaskPriority, TaskType, TargetScope } from '@/types/task';

export const dynamic = 'force-dynamic';

// GET /api/tasks/templates - List templates
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const search = searchParams.get('search');
    const isSystemTemplate = searchParams.get('is_system_template');
    const taskType = searchParams.get('task_type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query for templates user can see:
    // 1. System templates (is_system_template = true, is_active = true)
    // 2. Templates created by the user
    // 3. Templates created by user's organization

    let query = supabase
      .from('task_templates')
      .select(`
        *,
        creator:users!created_by_user_id(id, first_name, last_name, email, avatar_url),
        organization:organizations!created_by_org_id(id, name, acronym)
      `, { count: 'exact' })
      .eq('is_active', true)
      .order('is_system_template', { ascending: false })
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    // Filter by search term
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,default_title.ilike.%${search}%`);
    }

    // Filter by system template flag
    if (isSystemTemplate !== null) {
      query = query.eq('is_system_template', isSystemTemplate === 'true');
    }

    // Filter by task type
    if (taskType) {
      query = query.eq('default_task_type', taskType as TaskType);
    }

    const { data: templates, error, count } = await query;

    if (error) {
      console.error('[Templates API] Error fetching templates:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If userId is provided, filter to only templates the user can access
    let filteredTemplates = templates;
    if (userId) {
      // Get user's org memberships
      const { data: userOrgs } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', userId);

      const { data: user } = await supabase
        .from('users')
        .select('organization_id, role')
        .eq('id', userId)
        .single();

      const userOrgIds = new Set<string>();
      userOrgs?.forEach((uo: any) => userOrgIds.add(uo.organization_id));
      if (user?.organization_id) userOrgIds.add(user.organization_id);

      const isSuperUser = user?.role === 'super_user';

      filteredTemplates = templates?.filter((template: any) => {
        // Super users see all
        if (isSuperUser) return true;
        // System templates visible to all
        if (template.is_system_template) return true;
        // User's own templates
        if (template.created_by_user_id === userId) return true;
        // User's org templates
        if (template.created_by_org_id && userOrgIds.has(template.created_by_org_id)) return true;
        return false;
      });
    }

    return NextResponse.json({
      success: true,
      data: filteredTemplates || [],
      total: filteredTemplates?.length || 0,
    });
  } catch (error) {
    console.error('[Templates API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tasks/templates - Create template
export async function POST(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const {
      userId,
      name,
      description,
      default_title,
      default_body,
      default_send_in_app = true,
      default_send_email = false,
      default_priority = 'medium',
      default_reminder_days = 3,
      default_task_type = 'information',
      default_target_scope,
      is_system_template = false,
    }: { userId: string } & CreateTemplateRequest & { is_system_template?: boolean } = body;

    if (!userId || !name || !default_title) {
      return NextResponse.json({
        error: 'User ID, name, and default_title are required'
      }, { status: 400 });
    }

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role, organization_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isSuperUser = user.role === 'super_user';

    // Only super users can create system templates
    if (is_system_template && !isSuperUser) {
      return NextResponse.json({
        error: 'Only super users can create system templates'
      }, { status: 403 });
    }

    // Create template
    const { data: template, error: createError } = await supabase
      .from('task_templates')
      .insert({
        name,
        description: description || null,
        default_title,
        default_body: default_body || null,
        default_send_in_app,
        default_send_email,
        default_priority: default_priority as TaskPriority,
        default_reminder_days,
        default_task_type: default_task_type as TaskType,
        default_target_scope: default_target_scope as TargetScope || null,
        is_system_template,
        is_active: true,
        created_by_user_id: userId,
        created_by_org_id: user.organization_id,
      })
      .select(`
        *,
        creator:users!created_by_user_id(id, first_name, last_name, email, avatar_url),
        organization:organizations!created_by_org_id(id, name, acronym)
      `)
      .single();

    if (createError) {
      console.error('[Templates API] Error creating template:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    console.log('[Templates API] Template created:', template.id);

    return NextResponse.json({
      success: true,
      data: template,
    }, { status: 201 });
  } catch (error) {
    console.error('[Templates API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

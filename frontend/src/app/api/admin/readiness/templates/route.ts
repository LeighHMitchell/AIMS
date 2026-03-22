import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import type { UpsertTemplateRequest } from '@/types/readiness';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


/**
 * GET /api/admin/readiness/templates
 * List all templates (including inactive) for admin management
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, response: authResponse } = await requireAdmin();
    if (authResponse) return authResponse;


    const { data: templates, error } = await supabase
      .from('readiness_checklist_templates')
      .select(`
        *,
        items:readiness_checklist_items(count)
      `)
      .order('stage_order', { ascending: true });

    if (error) {
      console.error('[Admin Readiness API] Error fetching templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      templates
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
 * POST /api/admin/readiness/templates
 * Create a new template
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, response: authResponse } = await requireAdmin();
    if (authResponse) return authResponse;


    const body: UpsertTemplateRequest = await request.json();

    // Validate required fields
    if (!body.code || !body.name || body.stage_order === undefined) {
      return NextResponse.json(
        { error: 'Code, name, and stage_order are required' },
        { status: 400 }
      );
    }

    // Check for duplicate code
    const { data: existing } = await supabase
      .from('readiness_checklist_templates')
      .select('id')
      .eq('code', body.code)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'A template with this code already exists' },
        { status: 400 }
      );
    }

    const { data: template, error } = await supabase
      .from('readiness_checklist_templates')
      .insert({
        code: body.code,
        name: body.name,
        description: body.description || null,
        stage_order: body.stage_order,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('[Admin Readiness API] Error creating template:', error);
      return NextResponse.json(
        { error: 'Failed to create template', details: error.message },
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

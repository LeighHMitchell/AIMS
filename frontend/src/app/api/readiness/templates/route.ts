import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import type { ReadinessTemplateWithItems } from '@/types/readiness';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/readiness/templates
 * Fetch all active readiness templates with their items
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    // Fetch all active templates ordered by stage_order
    const { data: templates, error: templatesError } = await supabase
      .from('readiness_checklist_templates')
      .select('*')
      .eq('is_active', true)
      .order('stage_order', { ascending: true });

    if (templatesError) {
      console.error('[Readiness API] Error fetching templates:', templatesError);
      return NextResponse.json(
        { error: 'Failed to fetch templates', details: templatesError.message },
        { status: 500 }
      );
    }

    // Fetch all active items for these templates
    const templateIds = templates?.map(t => t.id) || [];
    
    const { data: items, error: itemsError } = await supabase
      .from('readiness_checklist_items')
      .select('*')
      .in('template_id', templateIds)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (itemsError) {
      console.error('[Readiness API] Error fetching items:', itemsError);
      return NextResponse.json(
        { error: 'Failed to fetch checklist items', details: itemsError.message },
        { status: 500 }
      );
    }

    // Group items by template
    const templatesWithItems: ReadinessTemplateWithItems[] = (templates || []).map(template => ({
      ...template,
      items: (items || []).filter(item => item.template_id === template.id)
    }));

    return NextResponse.json({
      success: true,
      templates: templatesWithItems
    });

  } catch (error) {
    console.error('[Readiness API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

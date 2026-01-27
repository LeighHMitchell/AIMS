import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: List all saved pivot reports (own, public, and templates)
export async function GET(request: NextRequest) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const templatesOnly = searchParams.get('templatesOnly') === 'true';
    const publicOnly = searchParams.get('publicOnly') === 'true';
    const ownOnly = searchParams.get('ownOnly') === 'true';

    let query = supabase
      .from('saved_pivot_reports')
      .select(`
        id,
        name,
        description,
        config,
        is_template,
        is_public,
        created_by,
        organization_id,
        created_at,
        updated_at
      `)
      .order('updated_at', { ascending: false });

    // Apply filters
    if (templatesOnly) {
      query = query.eq('is_template', true);
    } else if (publicOnly) {
      query = query.eq('is_public', true);
    } else if (ownOnly) {
      query = query.eq('created_by', user?.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Saved Pivots API] Error fetching reports:', error);
      return NextResponse.json(
        { error: 'Failed to fetch saved reports', details: error.message },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ data: data || [], error: null });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;

  } catch (error) {
    console.error('[Saved Pivots API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST: Create a new saved pivot report
export async function POST(request: NextRequest) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase || !user) {
    return NextResponse.json({ error: 'Database not configured or user not found' }, { status: 500 });
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Report name is required' }, { status: 400 });
    }

    if (!body.config || typeof body.config !== 'object') {
      return NextResponse.json({ error: 'Report configuration is required' }, { status: 400 });
    }

    // Get user's organization_id from users table
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    // Only admins can create templates
    const isAdmin = userData?.role && ['admin', 'super_admin', 'super_user'].includes(userData.role);
    const isTemplate = body.is_template === true && isAdmin;

    const insertData = {
      name: body.name.trim(),
      description: body.description?.trim() || null,
      config: body.config,
      is_template: isTemplate,
      is_public: body.is_public === true,
      created_by: user.id,
      organization_id: userData?.organization_id || null,
    };

    const { data, error } = await supabase
      .from('saved_pivot_reports')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[Saved Pivots API] Error creating report:', error);
      return NextResponse.json(
        { error: 'Failed to create saved report', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, error: null }, { status: 201 });

  } catch (error) {
    console.error('[Saved Pivots API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

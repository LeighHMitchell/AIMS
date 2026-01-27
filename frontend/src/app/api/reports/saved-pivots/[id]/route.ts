import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Fetch a single saved pivot report by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { id } = await params;

  try {
    const { data, error } = await supabase
      .from('saved_pivot_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }
      console.error('[Saved Pivots API] Error fetching report:', error);
      return NextResponse.json(
        { error: 'Failed to fetch report', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, error: null });

  } catch (error) {
    console.error('[Saved Pivots API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH: Update a saved pivot report
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase || !user) {
    return NextResponse.json({ error: 'Database not configured or user not found' }, { status: 500 });
  }

  const { id } = await params;

  try {
    const body = await request.json();

    // First, check if the report exists and if user has permission
    const { data: existing, error: fetchError } = await supabase
      .from('saved_pivot_reports')
      .select('id, created_by, is_template')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Get user's role for permission check
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userData?.role && ['admin', 'super_admin', 'super_user'].includes(userData.role);
    const isOwner = existing.created_by === user.id;

    // Check permissions
    if (!isOwner && !(existing.is_template && isAdmin)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (body.name !== undefined) {
      if (!body.name?.trim()) {
        return NextResponse.json({ error: 'Report name cannot be empty' }, { status: 400 });
      }
      updateData.name = body.name.trim();
    }
    
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null;
    }
    
    if (body.config !== undefined) {
      if (typeof body.config !== 'object') {
        return NextResponse.json({ error: 'Invalid configuration format' }, { status: 400 });
      }
      updateData.config = body.config;
    }
    
    if (body.is_public !== undefined) {
      updateData.is_public = body.is_public === true;
    }

    // Only admins can change template status
    if (body.is_template !== undefined && isAdmin) {
      updateData.is_template = body.is_template === true;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('saved_pivot_reports')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Saved Pivots API] Error updating report:', error);
      return NextResponse.json(
        { error: 'Failed to update report', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, error: null });

  } catch (error) {
    console.error('[Saved Pivots API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a saved pivot report
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase || !user) {
    return NextResponse.json({ error: 'Database not configured or user not found' }, { status: 500 });
  }

  const { id } = await params;

  try {
    // First, check if the report exists and if user has permission
    const { data: existing, error: fetchError } = await supabase
      .from('saved_pivot_reports')
      .select('id, created_by, is_template')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Get user's role for permission check
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userData?.role && ['admin', 'super_admin', 'super_user'].includes(userData.role);
    const isOwner = existing.created_by === user.id;

    // Check permissions
    if (!isOwner && !(existing.is_template && isAdmin)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { error } = await supabase
      .from('saved_pivot_reports')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Saved Pivots API] Error deleting report:', error);
      return NextResponse.json(
        { error: 'Failed to delete report', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, error: null });

  } catch (error) {
    console.error('[Saved Pivots API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

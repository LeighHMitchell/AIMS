import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET — fetch bookmarks for a given scope
export async function GET(request: NextRequest) {
  const { user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  const scope = request.nextUrl.searchParams.get('scope') || 'personal';

  if (scope === 'personal') {
    const { data, error } = await supabaseAdmin
      .from('document_bookmarks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching personal bookmarks:', error);
      return NextResponse.json({ error: 'Failed to fetch bookmarks' }, { status: 500 });
    }

    return NextResponse.json({ bookmarks: data || [] });
  }

  if (scope === 'reading_room') {
    // Accept organization_id from query param (sent by frontend)
    const orgId = request.nextUrl.searchParams.get('organization_id');

    if (!orgId) {
      return NextResponse.json({ bookmarks: [] });
    }

    const { data, error } = await supabaseAdmin
      .from('reading_room_bookmarks')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reading room bookmarks:', error);
      return NextResponse.json({ error: 'Failed to fetch bookmarks' }, { status: 500 });
    }

    return NextResponse.json({ bookmarks: data || [] });
  }

  return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
}

// POST — add a bookmark
export async function POST(request: NextRequest) {
  const { user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  const body = await request.json();
  const { scope, document_url, document_title, document_format } = body;

  if (!scope || !document_url) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (scope === 'personal') {
    const { error } = await supabaseAdmin
      .from('document_bookmarks')
      .upsert(
        {
          user_id: user.id,
          document_url,
          document_title: document_title || null,
          document_format: document_format || null,
        },
        { onConflict: 'user_id,document_url' }
      );

    if (error) {
      console.error('Error adding personal bookmark:', error);
      return NextResponse.json({ error: 'Failed to add bookmark' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  if (scope === 'reading_room') {
    const orgId = body.organization_id;
    const addedByName = body.added_by_name || user.email || 'Unknown';

    if (!orgId) {
      return NextResponse.json({ error: 'Missing organization_id' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('reading_room_bookmarks')
      .upsert(
        {
          organization_id: orgId,
          user_id: user.id,
          document_url,
          document_title: document_title || null,
          document_format: document_format || null,
          added_by_name: addedByName,
        },
        { onConflict: 'organization_id,document_url' }
      );

    if (error) {
      console.error('Error adding reading room bookmark:', error);
      return NextResponse.json({ error: 'Failed to add bookmark' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
}

// DELETE — remove a bookmark
export async function DELETE(request: NextRequest) {
  const { user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  const body = await request.json();
  const { scope, document_url } = body;

  if (!scope || !document_url) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (scope === 'personal') {
    const { error } = await supabaseAdmin
      .from('document_bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('document_url', document_url);

    if (error) {
      console.error('Error removing personal bookmark:', error);
      return NextResponse.json({ error: 'Failed to remove bookmark' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  if (scope === 'reading_room') {
    const orgId = body.organization_id;

    if (!orgId) {
      return NextResponse.json({ error: 'Missing organization_id' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('reading_room_bookmarks')
      .delete()
      .eq('organization_id', orgId)
      .eq('document_url', document_url);

    if (error) {
      console.error('Error removing reading room bookmark:', error);
      return NextResponse.json({ error: 'Failed to remove bookmark' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
}

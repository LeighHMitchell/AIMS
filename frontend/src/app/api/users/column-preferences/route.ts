import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { supabase, user: authUser, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase || !authUser) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    // Use admin client to bypass RLS (users table has recursive policy)
    const client = getSupabaseAdmin() || supabase;
    const { data, error } = await client
      .from('users')
      .select('default_activity_columns')
      .eq('id', authUser.id)
      .single();

    if (error) {
      console.error('[AIMS] Error fetching column preferences:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ columns: data?.default_activity_columns || null });
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to fetch column preferences' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { supabase, user: authUser, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase || !authUser) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { columns } = body;

    // Allow null to reset to system defaults
    if (columns !== null) {
      if (!Array.isArray(columns) || !columns.every((c: unknown) => typeof c === 'string')) {
        return NextResponse.json({ error: 'columns must be an array of strings or null' }, { status: 400 });
      }
    }

    const client = getSupabaseAdmin() || supabase;
    const { error } = await client
      .from('users')
      .update({
        default_activity_columns: columns,
        updated_at: new Date().toISOString()
      })
      .eq('id', authUser.id);

    if (error) {
      console.error('[AIMS] Error saving column preferences:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, columns });
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to save column preferences' }, { status: 500 });
  }
}

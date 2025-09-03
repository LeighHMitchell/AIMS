import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/debug-current-user - Debug current user data
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId parameter required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('[Debug] Error fetching user:', userError);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    console.log('[Debug] Raw user data from DB:', userData);

    return NextResponse.json({
      rawUserData: userData,
      computedName: userData?.name || `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() || 'Unknown User',
      availableFields: Object.keys(userData || {})
    });

  } catch (error) {
    console.error('[Debug] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
  }
}
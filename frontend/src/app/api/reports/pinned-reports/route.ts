import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const MAX_PINNED_REPORTS = 8; // 4 templates + 4 user reports

// GET: Fetch user's pinned report IDs
export async function GET() {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase || !user) {
    return NextResponse.json({ error: 'Database not configured or user not found' }, { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from('user_pinned_reports')
      .select('report_id')
      .eq('user_id', user.id)
      .order('pinned_at', { ascending: true });

    if (error) {
      console.error('[Pinned Reports API] Error fetching pins:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pinned reports', details: error.message },
        { status: 500 }
      );
    }

    const pinnedIds = data?.map(row => row.report_id) || [];
    
    return NextResponse.json({ pinnedIds, error: null });

  } catch (error) {
    console.error('[Pinned Reports API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST: Toggle pin status for a report
export async function POST(request: NextRequest) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase || !user) {
    return NextResponse.json({ error: 'Database not configured or user not found' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { reportId } = body;

    if (!reportId) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 });
    }

    // Check if the report is already pinned
    const { data: existingPin, error: checkError } = await supabase
      .from('user_pinned_reports')
      .select('id')
      .eq('user_id', user.id)
      .eq('report_id', reportId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is expected if not pinned
      console.error('[Pinned Reports API] Error checking pin:', checkError);
      return NextResponse.json(
        { error: 'Failed to check pin status', details: checkError.message },
        { status: 500 }
      );
    }

    if (existingPin) {
      // Report is already pinned - unpin it
      const { error: deleteError } = await supabase
        .from('user_pinned_reports')
        .delete()
        .eq('user_id', user.id)
        .eq('report_id', reportId);

      if (deleteError) {
        console.error('[Pinned Reports API] Error unpinning:', deleteError);
        return NextResponse.json(
          { error: 'Failed to unpin report', details: deleteError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        action: 'unpinned', 
        reportId,
        error: null 
      });

    } else {
      // Report is not pinned - check if user has reached max pins
      const { count, error: countError } = await supabase
        .from('user_pinned_reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        console.error('[Pinned Reports API] Error counting pins:', countError);
        return NextResponse.json(
          { error: 'Failed to count pinned reports', details: countError.message },
          { status: 500 }
        );
      }

      if (count !== null && count >= MAX_PINNED_REPORTS) {
        return NextResponse.json(
          { error: `You can only pin up to ${MAX_PINNED_REPORTS} reports` },
          { status: 400 }
        );
      }

      // Pin the report
      const { error: insertError } = await supabase
        .from('user_pinned_reports')
        .insert({
          user_id: user.id,
          report_id: reportId,
        });

      if (insertError) {
        console.error('[Pinned Reports API] Error pinning:', insertError);
        return NextResponse.json(
          { error: 'Failed to pin report', details: insertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        action: 'pinned', 
        reportId,
        error: null 
      });
    }

  } catch (error) {
    console.error('[Pinned Reports API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

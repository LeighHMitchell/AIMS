import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { invalidateActivityCache } from '@/lib/activity-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  console.log('[General Basic API] ============ PATCH /api/activities/[id]/general-basic ============');
  console.log('[General Basic API] Timestamp:', new Date().toISOString());
  try {
    const { id } = await params;
    console.log('[General Basic API] Activity ID:', id);
    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, acronym } = body || {};
    console.log('[General Basic API] Request body:', { title, acronym });

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[General Basic API] Supabase admin client not available');
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 503 }
      );
    }

    // Read current state
    const { data: current, error: fetchErr } = await supabase
      .from('activities')
      .select('id, title_narrative, acronym, updated_at')
      .eq('id', id)
      .single();
    if (fetchErr || !current) {
      console.error('[General Basic API] Activity not found:', fetchErr);
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }
    console.log('[General Basic API] Current:', current);

    // Check acronym column exists
    try {
      const { data: columnCheck } = await supabase
        .from('activities')
        .select('acronym')
        .eq('id', id)
        .single();
      console.log('[General Basic API] Acronym column exists. Current value:', columnCheck?.acronym);
    } catch (colErr: any) {
      console.error('[General Basic API] Acronym column check failed:', colErr?.message);
      if (colErr?.message?.includes('column') && colErr?.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Database migration required: activities.acronym column does not exist' },
          { status: 500 }
        );
      }
    }

    // Build atomic update payload
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (typeof title !== 'undefined') updateData.title_narrative = title;
    if (typeof acronym !== 'undefined') updateData.acronym = acronym;
    console.log('[General Basic API] Update payload:', updateData);

    const { data, error } = await supabase
      .from('activities')
      .update(updateData)
      .eq('id', id)
      .select('id, title_narrative, acronym, updated_at')
      .single();

    if (error) {
      console.error('[General Basic API] Update error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update activity' },
        { status: 500 }
      );
    }

    console.log('[General Basic API] Update result:', data);

    // Verify update committed
    const { data: verify, error: verifyErr } = await supabase
      .from('activities')
      .select('id, title_narrative, acronym, updated_at')
      .eq('id', id)
      .single();
    if (verifyErr) {
      console.error('[General Basic API] Verification read failed:', verifyErr);
    } else {
      console.log('[General Basic API] Verification result:', verify);
    }

    invalidateActivityCache(id);
    const duration = Date.now() - startTime;
    console.log('[General Basic API] Completed in', duration, 'ms');

    return NextResponse.json({ success: true, data: verify || data });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error('[General Basic API] Unexpected error:', err?.message, 'in', duration, 'ms');
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}



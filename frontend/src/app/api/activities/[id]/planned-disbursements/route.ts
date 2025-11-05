import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { resolveCurrency, resolveValueDate } from '@/lib/currency-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const activityId = params.id;

    console.log('[PlannedDisbursementsAPI] GET request for activityId:', activityId);
    console.log('[PlannedDisbursementsAPI] Admin client exists:', !!supabase);

    if (!supabase) {
      console.error('[PlannedDisbursementsAPI] Admin client is null!');
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    // Fetch planned disbursements for the activity
    console.log('[PlannedDisbursementsAPI] Querying planned_disbursements table...');
    const { data: disbursements, error } = await supabase
      .from('planned_disbursements')
      .select('*')
      .eq('activity_id', activityId)
      .order('period_start', { ascending: true });

    console.log('[PlannedDisbursementsAPI] Query result:', { 
      count: disbursements?.length || 0, 
      hasData: !!disbursements,
      error: error 
    });

    if (error) {
      console.error('[PlannedDisbursementsAPI] Error fetching planned disbursements:', error);
      return NextResponse.json({ error: 'Failed to fetch planned disbursements' }, { status: 500 });
    }

    console.log('[PlannedDisbursementsAPI] Returning', disbursements?.length || 0, 'disbursements');
    return NextResponse.json(disbursements || []);
  } catch (error) {
    console.error('[PlannedDisbursementsAPI] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const activityId = params.id;
    const body = await request.json();

    console.log('[PlannedDisbursementsAPI] Creating disbursement for activity:', activityId, body);

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    // Validate required fields - currency is NOT required (has defaults)
    if (!body.period_start || !body.period_end || body.amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields: period_start, period_end, amount' }, { status: 400 });
    }

    // Validate period dates
    if (new Date(body.period_start) >= new Date(body.period_end)) {
      return NextResponse.json({ error: 'Period start must be before period end' }, { status: 400 });
    }

    // Resolve currency using helper (checks activity → USD)
    const resolvedCurrency = await resolveCurrency(
      body.currency,
      activityId
    );

    // Resolve value_date (use provided or fallback to period_start)
    const resolvedValueDate = resolveValueDate(
      body.value_date,
      body.period_start
    );

    const disbursementData = {
      activity_id: activityId,
      amount: Number(body.amount),
      currency: resolvedCurrency,
      period_start: body.period_start,
      period_end: body.period_end,
      provider_org_id: body.provider_org_id || null,
      provider_org_name: body.provider_org_name || null,
      receiver_org_id: body.receiver_org_id || null,
      receiver_org_name: body.receiver_org_name || null,
      status: body.status || 'original',
      value_date: resolvedValueDate,
      notes: body.notes || null
    };

    console.log(`[PlannedDisbursementsAPI] Resolved currency: ${resolvedCurrency} (from ${body.currency || 'missing'}), value_date: ${resolvedValueDate}`);

    const { data: disbursement, error } = await supabase
      .from('planned_disbursements')
      .insert(disbursementData)
      .select()
      .single();

    if (error) {
      console.error('[PlannedDisbursementsAPI] Error creating disbursement:', error);
      return NextResponse.json({ error: 'Failed to create planned disbursement', details: error.message }, { status: 500 });
    }

    console.log('[PlannedDisbursementsAPI] Successfully created disbursement:', disbursement);
    return NextResponse.json(disbursement);
  } catch (error) {
    console.error('[PlannedDisbursementsAPI] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const activityId = params.id;

    console.log('[PlannedDisbursementsAPI] Deleting disbursements for activity:', activityId);

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    const { data: deletedData, error } = await supabase
      .from('planned_disbursements')
      .delete()
      .eq('activity_id', activityId)
      .select();

    if (error) {
      console.error('[PlannedDisbursementsAPI] Error deleting disbursements:', error);
      return NextResponse.json({ error: 'Failed to delete planned disbursements', details: error.message }, { status: 500 });
    }

    console.log('[PlannedDisbursementsAPI] Successfully deleted', deletedData?.length || 0, 'disbursements');
    return NextResponse.json({ success: true, deleted: deletedData?.length || 0 });
  } catch (error) {
    console.error('[PlannedDisbursementsAPI] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
} 
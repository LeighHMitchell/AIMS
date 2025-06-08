import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/activities/[id]/transactions - Get all transactions for an activity
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id;

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    console.log(`[ACTIVITY TRANSACTIONS] Querying for activity ID: ${activityId}`);

    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('activity_id', activityId)
      .order('transaction_date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions for activity:', error);
      throw error;
    }

    console.log(`[ACTIVITY TRANSACTIONS] Raw database results:`, data);

    // Transform database format to frontend format
    const transactions = (data || []).map((t: any) => ({
      id: t.id,
      type: t.transaction_type,
      value: t.value,
      currency: t.currency,
      transactionDate: t.transaction_date,
      providerOrg: t.provider_org || '-',
      receiverOrg: t.receiver_org || '-',
      status: 'actual', // Default status
      narrative: t.description,
      activityId: t.activity_id,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    console.log(`[ACTIVITY TRANSACTIONS] Transformed transactions:`, transactions);
    console.log(`[ACTIVITY TRANSACTIONS] Found ${transactions.length} transactions for activity ${activityId}`);
    return NextResponse.json(transactions);

  } catch (error) {
    console.error('Error in GET /api/activities/[id]/transactions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to fetch transactions: ${errorMessage}` },
      { status: 500 }
    );
  }
} 
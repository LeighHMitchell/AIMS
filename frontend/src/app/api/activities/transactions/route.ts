import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('activityId');
    
    let query = getSupabaseAdmin()
      .from('transactions')
      .select('*');
    
    if (activityId) {
      query = query.eq('activity_id', activityId);
    }
    
    const { data: transactions, error } = await query.order('transaction_date', { ascending: false });
    
    if (error) {
      console.error('[AIMS] Error fetching transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transactions', details: error.message },
        { status: 500 }
      );
    }
    
    // Map uuid to id for frontend compatibility
    const transformedTransactions = (transactions || []).map((t: any) => ({
      ...t,
      id: t.uuid || t.id,
      organization_id: t.provider_org_id || t.receiver_org_id
    }));
    
    return NextResponse.json(transformedTransactions);
  } catch (error) {
    console.error('[AIMS] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('activityId');

    console.log('[Debug USD] Checking transactions USD values for activity:', activityId);

    // Get transactions for the specific activity
    const query = supabase
      .from('transactions')
      .select(`
        uuid,
        transaction_type,
        value,
        currency,
        value_usd,
        exchange_rate_used,
        usd_conversion_date,
        usd_convertible,
        transaction_date,
        value_date,
        status,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (activityId) {
      query.eq('activity_id', activityId);
    } else {
      query.limit(20);
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('[Debug USD] Error fetching transactions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Debug USD] Found transactions:', transactions?.length);

    // Calculate totals by transaction type
    const totals = {
      commitments: {
        count: 0,
        totalOriginal: 0,
        totalUSD: 0,
        withUSD: 0,
        withoutUSD: 0
      },
      disbursements: {
        count: 0,
        totalOriginal: 0,
        totalUSD: 0,
        withUSD: 0,
        withoutUSD: 0
      }
    };

    const transactionDetails = transactions?.map(t => {
      const isCommitment = t.transaction_type === '2';
      const isDisbursement = t.transaction_type === '3' || t.transaction_type === '4';
      
      if (isCommitment) {
        totals.commitments.count++;
        totals.commitments.totalOriginal += Number(t.value) || 0;
        if (t.value_usd) {
          totals.commitments.totalUSD += Number(t.value_usd);
          totals.commitments.withUSD++;
        } else {
          totals.commitments.withoutUSD++;
        }
      }
      
      if (isDisbursement) {
        totals.disbursements.count++;
        totals.disbursements.totalOriginal += Number(t.value) || 0;
        if (t.value_usd) {
          totals.disbursements.totalUSD += Number(t.value_usd);
          totals.disbursements.withUSD++;
        } else {
          totals.disbursements.withoutUSD++;
        }
      }

      return {
        uuid: t.uuid,
        type: t.transaction_type,
        value: t.value,
        currency: t.currency,
        value_usd: t.value_usd,
        exchange_rate: t.exchange_rate_used,
        usd_convertible: t.usd_convertible,
        conversion_date: t.usd_conversion_date,
        transaction_date: t.transaction_date,
        value_date: t.value_date,
        status: t.status,
        created_at: t.created_at,
        has_usd: !!t.value_usd,
        needs_conversion: t.currency !== 'USD' && !t.value_usd
      };
    }) || [];

    return NextResponse.json({
      success: true,
      activityId,
      totals,
      transactionCount: transactions?.length || 0,
      transactions: transactionDetails,
      summary: {
        totalCommitmentsUSD: totals.commitments.totalUSD,
        totalDisbursementsUSD: totals.disbursements.totalUSD,
        transactionsWithoutUSD: totals.commitments.withoutUSD + totals.disbursements.withoutUSD,
        transactionsWithUSD: totals.commitments.withUSD + totals.disbursements.withUSD
      }
    });

  } catch (error) {
    console.error('[Debug USD] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch transaction data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
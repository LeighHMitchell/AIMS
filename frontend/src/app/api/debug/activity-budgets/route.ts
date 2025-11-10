import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Debug endpoint to check activity budgets and their USD values
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const iatiIdentifier = searchParams.get('iati_identifier');

    if (!iatiIdentifier) {
      return NextResponse.json({ error: 'iati_identifier query param required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get activity
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id, iati_identifier, title, default_currency')
      .eq('iati_identifier', iatiIdentifier)
      .single();

    if (activityError || !activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Get budgets
    const { data: budgets, error: budgetsError } = await supabase
      .from('activity_budgets')
      .select('*')
      .eq('activity_id', activity.id)
      .order('period_start');

    if (budgetsError) {
      return NextResponse.json({ error: 'Failed to fetch budgets', details: budgetsError.message }, { status: 500 });
    }

    // Get transactions for comparison
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('transaction_type, value, currency, value_usd')
      .eq('activity_id', activity.id)
      .in('transaction_type', ['3', '4']); // Disbursements and Expenditures

    if (transactionsError) {
      return NextResponse.json({ error: 'Failed to fetch transactions', details: transactionsError.message }, { status: 500 });
    }

    // Calculate totals
    const totalBudgeted = budgets?.reduce((sum, b) => {
      if (b.usd_value != null && b.usd_value > 0) {
        return sum + parseFloat(b.usd_value);
      }
      if (b.currency === 'USD' && b.value && b.value > 0) {
        return sum + parseFloat(b.value);
      }
      return sum;
    }, 0) || 0;

    const disbursements = transactions?.filter(t => t.transaction_type === '3') || [];
    const expenditures = transactions?.filter(t => t.transaction_type === '4') || [];

    const totalDisbursed = disbursements.reduce((sum, t) => {
      const usdValue = parseFloat(t.value_usd) || (t.currency === 'USD' ? parseFloat(t.value) : 0);
      return sum + (usdValue > 0 ? usdValue : 0);
    }, 0);

    const totalExpended = expenditures.reduce((sum, t) => {
      const usdValue = parseFloat(t.value_usd) || (t.currency === 'USD' ? parseFloat(t.value) : 0);
      return sum + (usdValue > 0 ? usdValue : 0);
    }, 0);

    const implementationVsPlan = totalBudgeted > 0
      ? Math.round(((totalDisbursed + totalExpended) / totalBudgeted) * 100)
      : 0;

    return NextResponse.json({
      activity: {
        id: activity.id,
        iati_identifier: activity.iati_identifier,
        title: activity.title,
        default_currency: activity.default_currency
      },
      budgets: budgets?.map(b => ({
        id: b.id,
        period: `${b.period_start} to ${b.period_end}`,
        value: b.value,
        currency: b.currency,
        usd_value: b.usd_value,
        value_date: b.value_date
      })),
      transactions: {
        disbursements: disbursements.length,
        expenditures: expenditures.length,
        total: transactions?.length || 0
      },
      calculations: {
        totalBudgeted,
        totalDisbursed,
        totalExpended,
        totalImplemented: totalDisbursed + totalExpended,
        implementationVsPlan: `${implementationVsPlan}%`
      }
    });

  } catch (error) {
    console.error('[Debug Activity Budgets] Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

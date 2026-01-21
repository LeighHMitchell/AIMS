import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('finance_type')
      .not('finance_type', 'is', null);

    if (error) {
      console.error('Error fetching finance types:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Count occurrences of each finance type
    const financeTypeCounts: Record<string, number> = {};
    transactions?.forEach((t: any) => {
      const ft = t.finance_type;
      if (ft) {
        financeTypeCounts[ft] = (financeTypeCounts[ft] || 0) + 1;
      }
    });

    // Sort by count descending
    const sorted = Object.entries(financeTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({ code, count }));

    return NextResponse.json({
      total_transactions: transactions?.length || 0,
      unique_finance_types: sorted.length,
      finance_types: sorted
    });

  } catch (error) {
    console.error('Error in finance-types-debug API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

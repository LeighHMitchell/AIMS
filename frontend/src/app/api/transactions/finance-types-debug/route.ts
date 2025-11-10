import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: transactions, error } = await getSupabaseAdmin()
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

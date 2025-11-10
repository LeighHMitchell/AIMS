import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { TRANSACTION_TYPE_LABELS } from '@/types/transaction';

export const dynamic = 'force-dynamic';

interface TransactionTypeData {
  transactionType: string;
  typeName: string;
  count: number;
  totalValue: number;
  percentage: number;
  averageValue: number;
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    // Get all transactions with their types and values
    const { data: transactions, error } = await supabaseAdmin
      .from('transactions')
      .select('transaction_type, value_usd');

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transactions data' },
        { status: 500 }
      );
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        data: [],
        currency: 'USD'
      });
    }

    // Process transaction types
    const typeMap = new Map<string, {
      count: number;
      totalValue: number;
      values: number[];
    }>();

    const defaultCurrency = 'USD';

    transactions.forEach((transaction: any) => {
      const transactionType = transaction.transaction_type || 'Unknown';
      const value = transaction.value_usd || 0;
      
      if (!typeMap.has(transactionType)) {
        typeMap.set(transactionType, {
          count: 0,
          totalValue: 0,
          values: []
        });
      }

      const typeData = typeMap.get(transactionType)!;
      typeData.count += 1;
      typeData.totalValue += value;
      typeData.values.push(value);
    });

    const totalTransactions = transactions.length;
    const totalValue = transactions.reduce((sum: number, t: any) => sum + (t.value || 0), 0);

    // Convert to result format
    const result: TransactionTypeData[] = Array.from(typeMap.entries())
      .map(([transactionType, data]) => ({
        transactionType,
        typeName: TRANSACTION_TYPE_LABELS[transactionType as keyof typeof TRANSACTION_TYPE_LABELS] || transactionType,
        count: data.count,
        totalValue: data.totalValue,
        percentage: (data.count / totalTransactions) * 100,
        averageValue: data.totalValue / data.count
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending

    return NextResponse.json({
      data: result,
      currency: defaultCurrency,
      summary: {
        totalTransactions,
        totalValue,
        transactionTypes: result.length,
        averageTransactionValue: totalValue / totalTransactions
      }
    });

  } catch (error) {
    console.error('Error in transaction-types API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
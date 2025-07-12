import { NextRequest, NextResponse } from 'next/server';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const amount = parseFloat(searchParams.get('amount') || '100');
    const from = searchParams.get('from') || 'EUR';
    const date = searchParams.get('date') || '2025-07-11';

    console.log(`[Fixed Currency Test] Testing conversion: ${amount} ${from} → USD on ${date}`);

    // Test the fixed conversion
    const result = await fixedCurrencyConverter.convertToUSD(
      amount,
      from,
      new Date(date)
    );

    return NextResponse.json({
      success: true,
      test: {
        input: { amount, from, date },
        result
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Fixed Currency Test] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId } = body;

    if (!transactionId) {
      return NextResponse.json({
        success: false,
        error: 'Transaction ID is required'
      }, { status: 400 });
    }

    console.log(`[Fixed Currency Test] Testing transaction conversion: ${transactionId}`);

    // Test transaction conversion
    const result = await fixedCurrencyConverter.convertTransaction(transactionId);

    return NextResponse.json({
      success: true,
      transactionId,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Fixed Currency Test] Transaction conversion error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 
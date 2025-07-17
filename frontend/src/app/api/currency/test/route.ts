import { NextRequest, NextResponse } from 'next/server';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const amount = parseFloat(searchParams.get('amount') || '100');
    const from = searchParams.get('from') || 'EUR';
    const to = searchParams.get('to') || 'USD';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    console.log(`[Currency Test] Testing conversion: ${amount} ${from} → ${to} on ${date}`);

    // Test the conversion
    const result = await fixedCurrencyConverter.convertToUSD(
      amount,
      from,
      new Date(date)
    );

    // Get supported currencies (method doesn't exist, using hardcoded)
    const supportedCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];

    // Get conversion stats (method doesn't exist, using dummy data)
    const stats = { conversions: 0, cacheHits: 0 };

    return NextResponse.json({
      success: true,
      test: {
        input: { amount, from, to, date },
        result
      },
      supportedCurrencies: supportedCurrencies.slice(0, 10), // First 10 for brevity
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Currency Test] Error:', error);
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

    console.log(`[Currency Test] Testing transaction conversion: ${transactionId}`);

    // Test transaction conversion
    const result = await fixedCurrencyConverter.convertTransaction(transactionId);

    return NextResponse.json({
      success: true,
      transactionId,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Currency Test] Transaction conversion error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/currency/convert
 * 
 * Server-side currency conversion endpoint
 * This runs on the server, so it's not subject to CSP restrictions
 * 
 * Request body:
 * {
 *   amount: number;
 *   currency: string;
 *   date: string; // ISO date string
 * }
 * 
 * Response:
 * {
 *   success: boolean;
 *   usd_amount: number | null;
 *   exchange_rate: number | null;
 *   source?: string;
 *   conversion_date?: string;
 *   error?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency, date } = body;

    // Validate inputs
    if (typeof amount !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Amount must be a number' },
        { status: 400 }
      );
    }

    if (typeof currency !== 'string' || !currency) {
      return NextResponse.json(
        { success: false, error: 'Currency must be a non-empty string' },
        { status: 400 }
      );
    }

    if (typeof date !== 'string' || !date) {
      return NextResponse.json(
        { success: false, error: 'Date must be a non-empty string' },
        { status: 400 }
      );
    }

    // Parse and validate date
    const conversionDate = new Date(date);
    if (isNaN(conversionDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Perform conversion
    console.log(`[Currency Convert API] Converting ${amount} ${currency} on ${date}`);
    const result = await fixedCurrencyConverter.convertToUSD(
      amount,
      currency,
      conversionDate
    );

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800', // Cache for 1 day, stale for 7 days
      },
    });

  } catch (error) {
    console.error('[Currency Convert API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        usd_amount: null,
        exchange_rate: null,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/currency/convert
 * 
 * Query parameters version for caching benefits
 * ?amount=100&currency=EUR&date=2025-01-01
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const amount = parseFloat(searchParams.get('amount') || '');
    const currency = searchParams.get('currency') || '';
    const date = searchParams.get('date') || '';

    // Validate inputs
    if (isNaN(amount)) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a valid number' },
        { status: 400 }
      );
    }

    if (!currency) {
      return NextResponse.json(
        { success: false, error: 'Currency is required' },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date is required' },
        { status: 400 }
      );
    }

    // Parse and validate date
    const conversionDate = new Date(date);
    if (isNaN(conversionDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Perform conversion
    console.log(`[Currency Convert API GET] Converting ${amount} ${currency} on ${date}`);
    const result = await fixedCurrencyConverter.convertToUSD(
      amount,
      currency,
      conversionDate
    );

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800', // Cache for 1 day, stale for 7 days
      },
    });

  } catch (error) {
    console.error('[Currency Convert API GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        usd_amount: null,
        exchange_rate: null,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}



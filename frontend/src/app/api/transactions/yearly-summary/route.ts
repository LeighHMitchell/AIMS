import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Filters (same as main transactions API)
    const transactionType = searchParams.get('transactionType');
    const flowType = searchParams.get('flowType');
    const financeType = searchParams.get('financeType');
    const status = searchParams.get('status');
    const organization = searchParams.get('organization');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search') || '';
    
    // Build the query - select all fields needed for filtering and aggregation
    let query = getSupabaseAdmin()
      .from('transactions')
      .select('uuid, transaction_date, transaction_type, value_usd, value, currency, value_date, flow_type, finance_type, status, provider_org_id, receiver_org_id, provider_org_name, receiver_org_name, description');
    
    // Apply filters
    if (transactionType && transactionType !== 'all') {
      query = query.eq('transaction_type', transactionType);
    }

    if (flowType && flowType !== 'all') {
      query = query.eq('flow_type', flowType);
    }

    if (financeType && financeType !== 'all') {
      query = query.eq('finance_type', financeType);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    // Apply organization filter (check both provider and receiver)
    if (organization && organization !== 'all') {
      query = query.or(`provider_org_id.eq.${organization},receiver_org_id.eq.${organization}`);
    }
    
    if (dateFrom) {
      query = query.gte('transaction_date', dateFrom);
    }
    
    if (dateTo) {
      query = query.lte('transaction_date', dateTo);
    }
    
    // Apply search
    if (search) {
      query = query.or(`
        uuid.ilike.%${search}%,
        provider_org_name.ilike.%${search}%,
        receiver_org_name.ilike.%${search}%,
        description.ilike.%${search}%
      `);
    }
    
    // Execute query
    const { data: transactions, error } = await query;
    
    if (error) {
      console.error('[Transactions Yearly Summary] Error fetching transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transactions', details: error.message },
        { status: 500 }
      );
    }
    
    console.log(`[Transactions Yearly Summary] Fetched ${transactions?.length || 0} transactions`);
    
    // Aggregate by year and transaction type
    const yearlyData: Record<number, Record<string, number>> = {};
    
    // Helper function to get USD value for a transaction
    const getUSDValue = async (t: any): Promise<number> => {
      // Prefer value_usd if available
      if (t.value_usd != null && !isNaN(parseFloat(String(t.value_usd)))) {
        return parseFloat(String(t.value_usd));
      }
      
      // If USD currency, use value directly
      if (t.currency === 'USD' && t.value != null) {
        return parseFloat(String(t.value)) || 0;
      }
      
      // Try to convert to USD if we have value, currency, and date
      if (t.value != null && t.currency && t.transaction_date) {
        try {
          const valueDate = t.value_date ? new Date(t.value_date) : new Date(t.transaction_date);
          if (!isNaN(valueDate.getTime())) {
            const result = await fixedCurrencyConverter.convertToUSD(
              parseFloat(String(t.value)),
              t.currency,
              valueDate
            );
            if (result.success && result.usd_amount != null) {
              return result.usd_amount;
            }
          }
        } catch (error) {
          console.warn(`[Transactions Yearly Summary] Failed to convert ${t.value} ${t.currency} to USD:`, error);
        }
      }
      
      return 0;
    };
    
    // Process transactions - batch currency conversions to avoid overwhelming the API
    const BATCH_SIZE = 10;
    const transactionList = transactions || [];
    
    for (let i = 0; i < transactionList.length; i += BATCH_SIZE) {
      const batch = transactionList.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (t: any) => {
        if (!t.transaction_date) return;
        
        const date = new Date(t.transaction_date);
        if (isNaN(date.getTime())) return; // Skip invalid dates
        
        const year = date.getFullYear();
        const type = String(t.transaction_type || 'unknown');
        
        const amount = await getUSDValue(t);
        
        // Skip if amount is 0 (no point in showing empty bars)
        if (amount === 0) return;
        
        if (!yearlyData[year]) {
          yearlyData[year] = {};
        }
        
        if (!yearlyData[year][type]) {
          yearlyData[year][type] = 0;
        }
        
        yearlyData[year][type] += amount;
      }));
    }
    
    // Convert to array format sorted by year
    const years = Object.keys(yearlyData)
      .map(Number)
      .sort((a, b) => a - b)
      .map(year => ({
        year,
        totals: yearlyData[year],
      }));
    
    return NextResponse.json({ years });
    
  } catch (error) {
    console.error('[Transactions Yearly Summary] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}


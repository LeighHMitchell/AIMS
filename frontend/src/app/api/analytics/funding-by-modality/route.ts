import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// Modality labels mapping
const MODALITY_LABELS: Record<string, string> = {
  '1': 'Grant',
  '2': 'Loan',
  '3': 'Technical Assistance',
  '4': 'Reimbursable Grant',
  '5': 'Investment/Guarantee'
};

// All modality keys for consistent data structure
const ALL_MODALITIES = ['Grant', 'Loan', 'Technical Assistance', 'Reimbursable Grant', 'Investment/Guarantee'];

/**
 * GET /api/analytics/funding-by-modality
 * Returns funding aggregated by modality type (Grant, Loan, TA, etc.) by year
 * 
 * Query params:
 * - type: 'commitments' | 'disbursements' (default: 'disbursements')
 * - dateFrom: optional date filter
 * - dateTo: optional date filter
 */
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    
    const transactionTypeParam = searchParams.get('type') || 'disbursements';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    
    // Map param to transaction_type codes
    // '2' = Commitment, '3' = Disbursement
    const transactionType = transactionTypeParam === 'commitments' ? '2' : '3';

    // Fetch transactions with activity data to get default_modality
    // We need to join transactions with activities
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        transaction_date,
        value_usd,
        value,
        currency,
        activity_id,
        activity:activities!activity_id (
          default_modality
        )
      `)
      .eq('transaction_type', transactionType)
      .eq('status', 'actual')
      .order('transaction_date');

    if (transactionsError) {
      console.error('[Funding By Modality API] Transactions error:', transactionsError);
      return NextResponse.json(
        { success: false, error: transactionsError.message },
        { status: 500 }
      );
    }

    // Aggregate by year and modality
    const dataByYearAndModality = new Map<number, Record<string, number>>();
    
    transactions?.forEach((t: any) => {
      if (!t.transaction_date) return;
      
      const date = new Date(t.transaction_date);
      if (isNaN(date.getTime())) return;
      
      const year = date.getFullYear();
      
      // Apply date filters
      if (dateFrom && date < new Date(dateFrom)) return;
      if (dateTo && date > new Date(dateTo)) return;
      
      // Get modality from activity, default to 'Unknown' if not set
      const modalityCode = t.activity?.default_modality;
      const modality = modalityCode ? (MODALITY_LABELS[modalityCode] || 'Other') : 'Unspecified';
      
      // Prefer value_usd, fallback to value if currency is USD
      let value = parseFloat(t.value_usd) || 0;
      if (!value && t.currency === 'USD' && t.value) {
        value = parseFloat(t.value) || 0;
      }
      
      if (value > 0) {
        if (!dataByYearAndModality.has(year)) {
          // Initialize with all modalities at 0
          const yearData: Record<string, number> = { year };
          ALL_MODALITIES.forEach(m => yearData[m] = 0);
          yearData['Unspecified'] = 0;
          dataByYearAndModality.set(year, yearData);
        }
        
        const yearData = dataByYearAndModality.get(year)!;
        yearData[modality] = (yearData[modality] || 0) + value;
      }
    });

    // Convert to array and sort by year
    const allYears = Array.from(dataByYearAndModality.keys()).sort((a, b) => a - b);
    
    if (allYears.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        modalities: ALL_MODALITIES,
        summary: {
          Grant: 0,
          Loan: 0,
          'Technical Assistance': 0,
          'Reimbursable Grant': 0,
          'Investment/Guarantee': 0,
          Unspecified: 0,
          total: 0,
        },
        transactionType: transactionTypeParam,
      });
    }
    
    // Fill in missing years with zeros
    const minYear = allYears[0];
    const maxYear = allYears[allYears.length - 1];
    
    const data: Record<string, number>[] = [];
    for (let year = minYear; year <= maxYear; year++) {
      if (dataByYearAndModality.has(year)) {
        data.push(dataByYearAndModality.get(year)!);
      } else {
        // Create empty year with all zeros
        const emptyYear: Record<string, number> = { year };
        ALL_MODALITIES.forEach(m => emptyYear[m] = 0);
        emptyYear['Unspecified'] = 0;
        data.push(emptyYear);
      }
    }

    // Calculate summary totals by modality
    const summary: Record<string, number> = {
      Grant: 0,
      Loan: 0,
      'Technical Assistance': 0,
      'Reimbursable Grant': 0,
      'Investment/Guarantee': 0,
      Unspecified: 0,
      total: 0,
    };
    
    data.forEach(yearData => {
      ALL_MODALITIES.forEach(m => {
        summary[m] += yearData[m] || 0;
      });
      summary['Unspecified'] += yearData['Unspecified'] || 0;
    });
    
    summary.total = Object.values(summary).reduce((sum, val) => sum + val, 0) - summary.total; // Subtract total itself

    return NextResponse.json({
      success: true,
      data,
      modalities: ALL_MODALITIES,
      summary,
      transactionType: transactionTypeParam,
    });

  } catch (error: any) {
    console.error('[Funding By Modality API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}


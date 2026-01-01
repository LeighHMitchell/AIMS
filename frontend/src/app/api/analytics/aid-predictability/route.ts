import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { AidPredictabilityPoint } from '@/types/national-priorities';
import { splitPlannedDisbursementAcrossYears } from '@/utils/year-allocation';

/**
 * GET /api/analytics/aid-predictability
 * Returns Planned vs Actual Disbursements by year
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const searchParams = request.nextUrl.searchParams;
    
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Get planned disbursements by year
    const { data: plannedData, error: plannedError } = await supabase
      .from('planned_disbursements')
      .select('period_start, period_end, usd_amount, amount, currency')
      .order('period_start');

    if (plannedError) {
      console.error('[Aid Predictability API] Planned disbursements error:', plannedError);
    }

    // Get actual disbursements by year
    const { data: actualData, error: actualError } = await supabase
      .from('transactions')
      .select('transaction_date, value_usd, value, currency')
      .eq('transaction_type', '3') // Disbursement
      .eq('status', 'actual')
      .order('transaction_date');

    if (actualError) {
      console.error('[Aid Predictability API] Actual disbursements error:', actualError);
    }

    // Aggregate planned disbursements by year using proportional allocation
    const plannedByYear = new Map<number, number>();
    
    plannedData?.forEach((pd: any) => {
      if (!pd.period_start) return;
      
      // Use proportional allocation across years
      const allocations = splitPlannedDisbursementAcrossYears({
        period_start: pd.period_start,
        period_end: pd.period_end || null,
        usd_amount: pd.usd_amount,
        amount: pd.amount,
        currency: pd.currency
      });
      
      allocations.forEach(({ year, amount }) => {
        // Apply date filters - check if the year falls within the date range
        if (dateFrom) {
          const yearStart = new Date(year, 0, 1);
          if (yearStart < new Date(dateFrom)) return;
        }
        if (dateTo) {
          const yearEnd = new Date(year, 11, 31);
          if (yearEnd > new Date(dateTo)) return;
        }
        
        plannedByYear.set(year, (plannedByYear.get(year) || 0) + amount);
      });
    });

    // Aggregate actual disbursements by year
    const actualByYear = new Map<number, number>();
    
    actualData?.forEach((t: any) => {
      if (!t.transaction_date) return;
      
      const date = new Date(t.transaction_date);
      if (isNaN(date.getTime())) return;
      
      const year = date.getFullYear();
      
      // Apply date filters
      if (dateFrom && date < new Date(dateFrom)) return;
      if (dateTo && date > new Date(dateTo)) return;
      
      // Prefer value_usd, fallback to value if currency is USD
      let value = parseFloat(t.value_usd) || 0;
      if (!value && t.currency === 'USD' && t.value) {
        value = parseFloat(t.value) || 0;
      }
      if (value > 0) {
        actualByYear.set(year, (actualByYear.get(year) || 0) + value);
      }
    });

    // Combine into data points - include all intervening years
    const allYearsWithData = [...plannedByYear.keys(), ...actualByYear.keys()];
    
    if (allYearsWithData.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        summary: {
          totalPlanned: 0,
          totalActual: 0,
          predictabilityRatio: 0,
          yearCount: 0,
        },
        dateRange: {
          from: dateFrom || 'all',
          to: dateTo || 'all',
        },
      });
    }
    
    const minYear = Math.min(...allYearsWithData);
    const maxYear = Math.max(...allYearsWithData);
    
    // Generate all years from min to max (inclusive)
    const data: AidPredictabilityPoint[] = [];
    for (let year = minYear; year <= maxYear; year++) {
      data.push({
        year,
        plannedDisbursements: plannedByYear.get(year) || 0,
        actualDisbursements: actualByYear.get(year) || 0,
      });
    }

    // Calculate summary statistics
    const totalPlanned = data.reduce((sum, d) => sum + d.plannedDisbursements, 0);
    const totalActual = data.reduce((sum, d) => sum + d.actualDisbursements, 0);
    const predictabilityRatio = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;

    return NextResponse.json({
      success: true,
      data,
      summary: {
        totalPlanned,
        totalActual,
        predictabilityRatio: Math.round(predictabilityRatio * 10) / 10,
        yearCount: data.length,
      },
      dateRange: {
        from: dateFrom || 'all',
        to: dateTo || 'all',
      },
    });

  } catch (error: any) {
    console.error('[Aid Predictability API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { AidPredictabilityPoint } from '@/types/national-priorities';
import { 
  splitPlannedDisbursementAcrossYears,
  splitPlannedDisbursementAcrossFiscalYears,
  getFiscalYearForDate,
} from '@/utils/year-allocation';
import { CustomYear, CustomYearRow, toCustomYear, getCustomYearLabel } from '@/types/custom-years';

/**
 * GET /api/analytics/aid-predictability
 * Returns Planned vs Actual Disbursements by year
 * Supports optional customYearId for fiscal year aggregation
 */
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const searchParams = request.nextUrl.searchParams;

    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const customYearId = searchParams.get('customYearId');
    const organizationId = searchParams.get('organizationId');

    // If organizationId provided, get activity IDs where org is reporting org
    let orgActivityIds: string[] | null = null;
    if (organizationId) {
      const { data: orgActivities, error: orgError } = await supabase
        .from('activities')
        .select('id')
        .eq('reporting_org_id', organizationId)
        .eq('publication_status', 'published');

      if (orgError) {
        console.error('[Aid Predictability API] Error fetching org activities:', orgError);
        return NextResponse.json({ success: false, error: 'Failed to fetch organization activities' }, { status: 500 });
      }

      orgActivityIds = (orgActivities || []).map(a => a.id);

      if (orgActivityIds.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }
    }

    // Fetch custom year definition - use provided ID or fetch system default
    let customYear: CustomYear | null = null;
    if (customYearId) {
      const { data: cyData, error: cyError } = await supabase
        .from('custom_years')
        .select('*')
        .eq('id', customYearId)
        .single();

      if (cyError) {
        console.error('[Aid Predictability API] Custom year fetch error:', cyError);
      } else if (cyData) {
        customYear = toCustomYear(cyData as CustomYearRow);
      }
    } else {
      // No customYearId provided - fetch system default
      const { data: defaultData, error: defaultError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'default_custom_year_id')
        .single();

      if (!defaultError && defaultData?.value) {
        const { data: cyData, error: cyError } = await supabase
          .from('custom_years')
          .select('*')
          .eq('id', defaultData.value)
          .single();

        if (!cyError && cyData) {
          customYear = toCustomYear(cyData as CustomYearRow);
        }
      }

      // If still no custom year, try to get the first available one (usually Calendar Year)
      if (!customYear) {
        const { data: firstCy, error: firstCyError } = await supabase
          .from('custom_years')
          .select('*')
          .order('name')
          .limit(1)
          .single();

        if (!firstCyError && firstCy) {
          customYear = toCustomYear(firstCy as CustomYearRow);
        }
      }
    }

    // Get planned disbursements by year
    let plannedQuery = supabase
      .from('planned_disbursements')
      .select('period_start, period_end, usd_amount, amount, currency, activity_id')
      .order('period_start');

    if (orgActivityIds) {
      plannedQuery = plannedQuery.in('activity_id', orgActivityIds);
    }

    const { data: plannedData, error: plannedError } = await plannedQuery;

    if (plannedError) {
      console.error('[Aid Predictability API] Planned disbursements error:', plannedError);
    }

    // Get actual disbursements by year
    let actualQuery = supabase
      .from('transactions')
      .select('transaction_date, value_usd, value, currency, activity_id')
      .eq('transaction_type', '3') // Disbursement
      .eq('status', 'actual')
      .order('transaction_date');

    if (orgActivityIds) {
      actualQuery = actualQuery.in('activity_id', orgActivityIds);
    }

    const { data: actualData, error: actualError } = await actualQuery;

    if (actualError) {
      console.error('[Aid Predictability API] Actual disbursements error:', actualError);
    }

    // Maps to store aggregated data - key is fiscal/calendar year
    const plannedByYear = new Map<number, number>();
    const actualByYear = new Map<number, number>();
    // Store labels for fiscal years
    const yearLabels = new Map<number, string>();
    
    // Aggregate planned disbursements
    plannedData?.forEach((pd: any) => {
      if (!pd.period_start) return;
      
      if (customYear) {
        // Use fiscal year allocation
        const allocations = splitPlannedDisbursementAcrossFiscalYears({
          period_start: pd.period_start,
          period_end: pd.period_end || null,
          usd_amount: pd.usd_amount,
          amount: pd.amount,
          currency: pd.currency
        }, customYear);
        
        allocations.forEach(({ fiscalYear, label, amount }) => {
          // Apply date filters using fiscal year boundaries
          if (dateFrom || dateTo) {
            // For fiscal year filtering, we use the fiscal year's start date
            const fyStartYear = fiscalYear;
            if (dateFrom && fyStartYear < new Date(dateFrom).getFullYear()) return;
            if (dateTo && fyStartYear > new Date(dateTo).getFullYear()) return;
          }
          
          plannedByYear.set(fiscalYear, (plannedByYear.get(fiscalYear) || 0) + amount);
          yearLabels.set(fiscalYear, label);
        });
      } else {
        // Use calendar year allocation (existing behavior)
        const allocations = splitPlannedDisbursementAcrossYears({
          period_start: pd.period_start,
          period_end: pd.period_end || null,
          usd_amount: pd.usd_amount,
          amount: pd.amount,
          currency: pd.currency
        });
        
        allocations.forEach(({ year, amount }) => {
          if (dateFrom) {
            const yearStart = new Date(year, 0, 1);
            if (yearStart < new Date(dateFrom)) return;
          }
          if (dateTo) {
            const yearEnd = new Date(year, 11, 31);
            if (yearEnd > new Date(dateTo)) return;
          }
          
          plannedByYear.set(year, (plannedByYear.get(year) || 0) + amount);
          yearLabels.set(year, String(year));
        });
      }
    });

    // Aggregate actual disbursements
    actualData?.forEach((t: any) => {
      if (!t.transaction_date) return;
      
      const date = new Date(t.transaction_date);
      if (isNaN(date.getTime())) return;
      
      // Apply date filters
      if (dateFrom && date < new Date(dateFrom)) return;
      if (dateTo && date > new Date(dateTo)) return;
      
      // Prefer value_usd, fallback to value if currency is USD
      let value = parseFloat(t.value_usd) || 0;
      if (!value && t.currency === 'USD' && t.value) {
        value = parseFloat(t.value) || 0;
      }
      
      if (value > 0) {
        if (customYear) {
          // Use fiscal year
          const fiscalYear = getFiscalYearForDate(date, customYear);
          actualByYear.set(fiscalYear, (actualByYear.get(fiscalYear) || 0) + value);
          yearLabels.set(fiscalYear, getCustomYearLabel(customYear, fiscalYear));
        } else {
          // Use calendar year
          const year = date.getFullYear();
          actualByYear.set(year, (actualByYear.get(year) || 0) + value);
          yearLabels.set(year, String(year));
        }
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
        customYearId: customYearId || null,
      });
    }
    
    const minYear = Math.min(...allYearsWithData);
    const maxYear = Math.max(...allYearsWithData);
    
    // Generate all years from min to max (inclusive)
    const data: AidPredictabilityPoint[] = [];
    for (let year = minYear; year <= maxYear; year++) {
      // Generate label for this year
      const label = customYear 
        ? getCustomYearLabel(customYear, year)
        : String(year);
      
      data.push({
        year,
        yearLabel: yearLabels.get(year) || label,
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
      customYearId: customYearId || null,
    });

  } catch (error: any) {
    console.error('[Aid Predictability API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}


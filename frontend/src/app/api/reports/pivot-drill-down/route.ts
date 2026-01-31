import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { YearType, yearTypeToFieldKey } from '@/lib/fiscal-year-utils';

export const dynamic = 'force-dynamic';

// Calculate the date range for a fiscal year based on year type definition
// Returns [startDate, endDate] as ISO date strings
function getFiscalYearDateRange(
  year: number,
  startMonth: number,
  startDay: number = 1
): [string, string] {
  // For calendar year (Jan 1 start), it's straightforward
  if (startMonth === 1 && startDay === 1) {
    return [`${year}-01-01`, `${year}-12-31`];
  }

  // For other fiscal years:
  // The fiscal year labeled "year" ENDS in that calendar year
  // So it STARTS in the previous calendar year (or same year if startMonth is Jan)
  // Example: US Fiscal Year 2024 (Oct 1 start) runs from Oct 1, 2023 to Sep 30, 2024
  const startYear = year - 1;
  const endYear = year;

  const startDate = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;

  // Calculate end date: one day before the start of next fiscal year
  let endMonth = startMonth - 1;
  let endDay = startDay - 1;

  if (endMonth < 1) {
    endMonth = 12;
  }

  if (endDay < 1) {
    // Last day of the previous month
    const lastDayDate = new Date(endYear, endMonth, 0);
    endDay = lastDayDate.getDate();
  }

  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

  return [startDate, endDate];
}

// Reverse mapping from friendly labels to database column names
// Labels match FIELD_LABELS in CustomReportBuilder.tsx (without type suffixes)
const LABEL_TO_FIELD: Record<string, string> = {
  // Identity fields
  'Activity ID': 'activity_id',
  'IATI Identifier': 'iati_identifier',
  'Activity Title': 'title',
  'Record Type': 'record_type',
  'Record ID': 'record_id',

  // Status
  'Activity Status': 'activity_status',
  'Status Code': 'activity_status_code',

  // Dates
  'Start Date': 'start_date',
  'End Date': 'end_date',
  'Planned Start Date': 'planned_start_date',
  'Planned End Date': 'planned_end_date',
  'Actual Start Date': 'actual_start_date',
  'Actual End Date': 'actual_end_date',
  'Transaction Date': 'transaction_date',
  'Effective Date': 'effective_date',

  // Organization fields
  'Organization Name': 'reporting_org_name',
  'Organization Acronym': 'reporting_org_acronym',
  'Organization Name + Acronym': 'reporting_org_full',
  'Organization Type': 'reporting_org_type',
  'Development Partner': 'reporting_org_name', // Legacy alias

  // Transaction fields
  'Transaction Type': 'transaction_type',
  'Transaction Type Code': 'transaction_type_code',
  'Transaction Amount (USD)': 'transaction_value_usd',
  'Amount (USD)': 'amount_usd',
  'Original Amount': 'transaction_value_original',
  'Currency': 'transaction_currency',
  'Planned Disbursement (USD)': 'planned_disbursement_value_usd',
  'Budget Amount (USD)': 'budget_value_usd',

  // Time dimensions
  'Year': 'fiscal_year',
  'Quarter': 'fiscal_quarter',
  'Month': 'fiscal_month',

  // Sector fields
  'Sector Code': 'sector_code',
  'Sector': 'sector_name',
  'Sector Category Code': 'sector_category_code',
  'Sector Category': 'sector_category',
  'Sector %': 'sector_percentage',

  // Classification fields
  'Aid Type': 'aid_type',
  'Aid Type Code': 'aid_type_code',
  'Finance Type': 'finance_type',
  'Finance Type Code': 'finance_type_code',
  'Flow Type': 'flow_type',
  'Flow Type Code': 'flow_type_code',
  'Tied Status': 'tied_status',
  'Tied Status Code': 'tied_status_code',
  'Activity Scope': 'activity_scope',
  'Collaboration Type': 'collaboration_type',

  // Geographic fields
  'State/Region': 'subnational_region',
  'Regional %': 'subnational_percentage',
  'Is Nationwide': 'is_nationwide',

  // Partner fields
  'Implementing Partners': 'implementing_partners',
  'Funding Organizations': 'funding_organizations',

  // Other fields
  'Policy Markers': 'policy_markers_list',
  'Is Humanitarian': 'is_humanitarian',
  'Humanitarian Type': 'humanitarian_scope_type',
  'Humanitarian Code': 'humanitarian_scope_code',

  // Data quality fields
  'Is Original Currency': 'is_original_currency',
  'Weighted Amount (USD)': 'weighted_amount_usd',
};

// Convert label to field name
// Strip type suffixes like [Abc], [123], [◷], [%], [Y/N] from labels
function labelToField(label: string): string {
  // Remove type suffix pattern: [Abc], [123], [◷], [%], [Y/N]
  const cleanLabel = label
    .replace(/\s*\[(Abc|123|◷|%|Y\/N)\]$/, '')
    .trim();

  // Check if it's in the static mapping first
  if (LABEL_TO_FIELD[cleanLabel]) {
    return LABEL_TO_FIELD[cleanLabel];
  }

  // For dynamic fields (like fiscal year names), convert to snake_case
  // e.g., "Calendar Year" -> "calendar_year", "US Fiscal Year" -> "us_fiscal_year"
  const snakeCaseField = cleanLabel.toLowerCase().replace(/\s+/g, '_');
  return snakeCaseField;
}

export async function POST(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();

    const {
      rowFields = [],
      colFields = [],
      rowValues = [],
      colValues = [],
      filters = {},
    } = body;


    // Fetch year types to handle dynamic fiscal year fields
    const { data: yearTypesData } = await supabase
      .from('custom_years')
      .select('id, name, short_name, start_month, start_day')
      .eq('is_active', true);

    const yearTypes: YearType[] = yearTypesData || [];

    // Create a map of dynamic fiscal year field keys to their year type definitions
    const dynamicYearFields = new Map<string, YearType>();
    for (const yearType of yearTypes) {
      const fieldKey = yearTypeToFieldKey(yearType.name);
      dynamicYearFields.set(fieldKey, yearType);
    }

    // Build query
    let query = supabase
      .from('pivot_report_data')
      .select(`
        activity_id,
        iati_identifier,
        title,
        transaction_value_usd,
        effective_date,
        transaction_type,
        reporting_org_name,
        sector_name
      `);

    // Helper function to apply field filter
    const applyFieldFilter = (field: string, value: string | number | null | undefined) => {
      if (value === undefined || value === null || value === '') return;

      const dbField = labelToField(field);

      // Check if this is a dynamic fiscal year field
      if (dynamicYearFields.has(dbField)) {
        const yearType = dynamicYearFields.get(dbField)!;
        const year = parseInt(String(value), 10);
        if (!isNaN(year)) {
          const [startDate, endDate] = getFiscalYearDateRange(
            year,
            yearType.start_month,
            yearType.start_day
          );
          query = query.gte('effective_date', startDate);
          query = query.lte('effective_date', endDate);
        }
      } else if (dbField === 'fiscal_year') {
        // Legacy calendar year field - filter by effective_date year
        query = query.eq(dbField, String(value));
      } else if (dbField === 'is_humanitarian' || dbField === 'is_nationwide' || dbField === 'is_original_currency') {
        // Boolean fields - convert Yes/No back to boolean
        const boolValue = String(value).toLowerCase() === 'yes';
        query = query.eq(dbField, boolValue);
      } else {
        // Regular database column
        query = query.eq(dbField, value);
      }
    };

    // Apply row dimension filters
    rowFields.forEach((field: string, index: number) => {
      applyFieldFilter(field, rowValues[index]);
    });

    // Apply column dimension filters
    colFields.forEach((field: string, index: number) => {
      applyFieldFilter(field, colValues[index]);
    });

    // Apply additional filters from the filter panel
    if (filters.startDate) {
      query = query.gte('effective_date', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('effective_date', filters.endDate);
    }
    
    if (filters.organizationIds?.length > 0) {
      query = query.in('reporting_org_id', filters.organizationIds);
    }
    
    if (filters.statuses?.length > 0) {
      query = query.in('activity_status_code', filters.statuses);
    }
    
    if (filters.sectorCodes?.length > 0) {
      query = query.in('sector_code', filters.sectorCodes);
    }
    
    if (filters.transactionTypes?.length > 0) {
      query = query.in('transaction_type_code', filters.transactionTypes);
    }
    
    if (filters.fiscalYears?.length > 0) {
      query = query.in('fiscal_year', filters.fiscalYears);
    }

    if (filters.recordTypes?.length > 0) {
      query = query.in('record_type', filters.recordTypes);
    }

    // Limit results for performance
    query = query.limit(100);

    const { data, error } = await query;

    if (error) {
      console.error('[Pivot Drill-Down API] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch drill-down data', details: error.message },
        { status: 500 }
      );
    }

    // Calculate summary statistics
    const transactions = data || [];
    const totalAmount = transactions.reduce(
      (sum, t) => sum + (t.transaction_value_usd || 0), 
      0
    );
    const avgAmount = transactions.length > 0 ? totalAmount / transactions.length : 0;
    
    // Get unique activities
    const uniqueActivityIds = new Set(transactions.map(t => t.activity_id));

    const response = NextResponse.json({
      data: transactions,
      summary: {
        transactionCount: transactions.length,
        activityCount: uniqueActivityIds.size,
        totalAmount,
        avgAmount,
        truncated: transactions.length === 100,
      },
      error: null,
    });
    
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;

  } catch (error) {
    console.error('[Pivot Drill-Down API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

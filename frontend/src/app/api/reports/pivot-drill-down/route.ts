import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Reverse mapping from friendly labels to database column names
const LABEL_TO_FIELD: Record<string, string> = {
  'Activity ID': 'activity_id',
  'IATI Identifier': 'iati_identifier',
  'Activity Title': 'title',
  'Activity Status': 'activity_status',
  'Status Code': 'activity_status_code',
  'Start Date': 'start_date',
  'End Date': 'end_date',
  'Planned Start Date': 'planned_start_date',
  'Planned End Date': 'planned_end_date',
  'Actual Start Date': 'actual_start_date',
  'Actual End Date': 'actual_end_date',
  'Development Partner': 'reporting_org_name',
  'Organization Type': 'reporting_org_type',
  'Transaction Type': 'transaction_type',
  'Transaction Type Code': 'transaction_type_code',
  'Amount (USD)': 'transaction_value_usd',
  'Original Amount': 'transaction_value_original',
  'Currency': 'transaction_currency',
  'Transaction Date': 'transaction_date',
  'Year': 'fiscal_year',
  'Quarter': 'fiscal_quarter',
  'Month': 'fiscal_month',
  'Sector Code': 'sector_code',
  'Sector': 'sector_name',
  'Sector Category Code': 'sector_category_code',
  'Sector Category': 'sector_category',
  'Sector %': 'sector_percentage',
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
  'State/Region': 'subnational_region',
  'Regional %': 'subnational_percentage',
  'Is Nationwide': 'is_nationwide',
  'Implementing Partners': 'implementing_partners',
  'Funding Organizations': 'funding_organizations',
  'Policy Markers': 'policy_markers_list',
  'Is Humanitarian': 'is_humanitarian',
  'Humanitarian Type': 'humanitarian_scope_type',
  'Humanitarian Code': 'humanitarian_scope_code',
};

// Convert label to field name
function labelToField(label: string): string {
  return LABEL_TO_FIELD[label] || label;
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

    // Build query
    let query = supabase
      .from('pivot_report_data')
      .select(`
        activity_id,
        iati_identifier,
        title,
        transaction_value_usd,
        transaction_date,
        transaction_type,
        reporting_org_name,
        sector_name
      `);

    // Apply row dimension filters
    rowFields.forEach((field: string, index: number) => {
      const dbField = labelToField(field);
      const value = rowValues[index];
      if (value !== undefined && value !== null && value !== '') {
        // Handle special cases
        if (dbField === 'fiscal_year') {
          query = query.eq(dbField, String(value));
        } else {
          query = query.eq(dbField, value);
        }
      }
    });

    // Apply column dimension filters
    colFields.forEach((field: string, index: number) => {
      const dbField = labelToField(field);
      const value = colValues[index];
      if (value !== undefined && value !== null && value !== '') {
        if (dbField === 'fiscal_year') {
          query = query.eq(dbField, String(value));
        } else {
          query = query.eq(dbField, value);
        }
      }
    });

    // Apply additional filters from the filter panel
    if (filters.startDate) {
      query = query.gte('transaction_date', filters.startDate);
    }
    
    if (filters.endDate) {
      query = query.lte('transaction_date', filters.endDate);
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

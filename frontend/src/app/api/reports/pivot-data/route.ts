import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Field mapping for human-readable labels
const FIELD_LABELS: Record<string, string> = {
  'activity_id': 'Activity ID',
  'iati_identifier': 'IATI Identifier',
  'title': 'Activity Title',
  'activity_status': 'Activity Status',
  'activity_status_code': 'Status Code',
  'start_date': 'Start Date',
  'end_date': 'End Date',
  'planned_start_date': 'Planned Start Date',
  'planned_end_date': 'Planned End Date',
  'actual_start_date': 'Actual Start Date',
  'actual_end_date': 'Actual End Date',
  'reporting_org_name': 'Development Partner',
  'reporting_org_type': 'Organization Type',
  'transaction_type': 'Transaction Type',
  'transaction_type_code': 'Transaction Type Code',
  'transaction_value_usd': 'Amount (USD)',
  'transaction_value_original': 'Original Amount',
  'transaction_currency': 'Currency',
  'transaction_date': 'Transaction Date',
  'fiscal_year': 'Year',
  'fiscal_quarter': 'Quarter',
  'fiscal_month': 'Month',
  'sector_code': 'Sector Code',
  'sector_name': 'Sector',
  'sector_category_code': 'Sector Category Code',
  'sector_category': 'Sector Category',
  'sector_percentage': 'Sector %',
  'aid_type': 'Aid Type',
  'aid_type_code': 'Aid Type Code',
  'finance_type': 'Finance Type',
  'finance_type_code': 'Finance Type Code',
  'flow_type': 'Flow Type',
  'flow_type_code': 'Flow Type Code',
  'tied_status': 'Tied Status',
  'tied_status_code': 'Tied Status Code',
  'activity_scope': 'Activity Scope',
  'collaboration_type': 'Collaboration Type',
  // New fields
  'subnational_region': 'State/Region',
  'subnational_percentage': 'Regional %',
  'is_nationwide': 'Is Nationwide',
  'implementing_partners': 'Implementing Partners',
  'funding_organizations': 'Funding Organizations',
  'policy_markers_list': 'Policy Markers',
  'is_humanitarian': 'Is Humanitarian',
  'humanitarian_scope_type': 'Humanitarian Type',
  'humanitarian_scope_code': 'Humanitarian Code',
};

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse filter parameters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const organizationIds = searchParams.getAll('organizationIds');
    const statuses = searchParams.getAll('statuses');
    const sectorCodes = searchParams.getAll('sectorCodes');
    const transactionTypes = searchParams.getAll('transactionTypes');
    const fiscalYears = searchParams.getAll('fiscalYears');
    const limit = parseInt(searchParams.get('limit') || '50000', 10);

    // Build query against the pivot_report_data view
    let query = supabase
      .from('pivot_report_data')
      .select('*');

    // Apply filters conditionally
    if (startDate) {
      query = query.gte('transaction_date', startDate);
    }
    
    if (endDate) {
      query = query.lte('transaction_date', endDate);
    }
    
    if (organizationIds.length > 0) {
      query = query.in('reporting_org_id', organizationIds);
    }
    
    if (statuses.length > 0) {
      query = query.in('activity_status_code', statuses);
    }
    
    if (sectorCodes.length > 0) {
      query = query.in('sector_code', sectorCodes);
    }
    
    if (transactionTypes.length > 0) {
      query = query.in('transaction_type_code', transactionTypes);
    }
    
    if (fiscalYears.length > 0) {
      // fiscal_year is now TEXT in the view, so we keep them as strings
      query = query.in('fiscal_year', fiscalYears);
    }

    // Apply row limit for performance
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('[Pivot Data API] Error fetching pivot data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pivot data', details: error.message },
        { status: 500 }
      );
    }

    // Return data with field labels metadata
    const response = NextResponse.json({
      data: data || [],
      fieldLabels: FIELD_LABELS,
      totalRows: data?.length || 0,
      truncated: data?.length === limit,
      error: null
    });
    
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;

  } catch (error) {
    console.error('[Pivot Data API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

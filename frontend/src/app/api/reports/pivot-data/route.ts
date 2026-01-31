import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { 
  YearType, 
  calculateAllFiscalYears, 
  generateYearTypeLabels 
} from '@/lib/fiscal-year-utils';

export const dynamic = 'force-dynamic';

// Field mapping for human-readable labels (static fields only)
// Dynamic fiscal year labels are generated from custom_years table
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
  'reporting_org_name': 'Organization Name',
  'reporting_org_acronym': 'Organization Acronym',
  'reporting_org_full': 'Organization Name + Acronym',
  'reporting_org_type': 'Organization Type',
  'transaction_type': 'Transaction Type',
  'transaction_type_code': 'Transaction Type Code',
  'transaction_value_usd': 'Transaction Amount (USD)',
  'transaction_value_original': 'Original Amount',
  'transaction_currency': 'Currency',
  'transaction_date': 'Transaction Date',
  'effective_date': 'Effective Date',
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
  // Sub-national fields
  'subnational_region': 'State/Region',
  'subnational_percentage': 'Regional %',
  'is_nationwide': 'Is Nationwide',
  'implementing_partners': 'Implementing Partners',
  'funding_organizations': 'Funding Organizations',
  'policy_markers_list': 'Policy Markers',
  'is_humanitarian': 'Is Humanitarian',
  'humanitarian_scope_type': 'Humanitarian Type',
  'humanitarian_scope_code': 'Humanitarian Code',
  // Record type for filtering
  'record_type': 'Record Type',
  'record_id': 'Record ID',
  // New amount columns
  'planned_disbursement_value_usd': 'Planned Disbursement (USD)',
  'budget_value_usd': 'Budget Amount (USD)',
  'amount_usd': 'Amount (USD)',
  // Note: Fiscal year columns are now generated dynamically from custom_years table
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
    const recordTypes = searchParams.getAll('recordTypes');
    const limit = parseInt(searchParams.get('limit') || '50000', 10);

    // Fetch active year types from custom_years table
    const { data: yearTypesData, error: yearTypesError } = await supabase
      .from('custom_years')
      .select('id, name, short_name, start_month, start_day')
      .eq('is_active', true)
      .order('display_order');

    if (yearTypesError) {
      console.error('[Pivot Data API] Error fetching year types:', yearTypesError);
      // Continue without year types - not fatal
    }

    const yearTypes: YearType[] = (yearTypesData || []).map(yt => ({
      id: yt.id,
      name: yt.name,
      short_name: yt.short_name || yt.name,
      start_month: yt.start_month,
      start_day: yt.start_day,
    }));

    // Build query against the pivot_report_data view
    let query = supabase
      .from('pivot_report_data')
      .select('*');

    // Apply filters conditionally
    // Note: Use 'effective_date' which is the standardized date field in the view
    // (transaction_date for transactions, period_start for planned disbursements/budgets)
    if (startDate) {
      query = query.gte('effective_date', startDate);
    }

    if (endDate) {
      query = query.lte('effective_date', endDate);
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

    if (recordTypes.length > 0) {
      // Filter by record type (Transaction, Planned Disbursement, Budget)
      query = query.in('record_type', recordTypes);
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

    // Transform data - add dynamic fiscal year columns and convert booleans
    const transformedData = (data || []).map(row => {
      const effectiveDate = row.effective_date;
      const fiscalYearValues = calculateAllFiscalYears(effectiveDate, yearTypes);
      return {
        ...row,
        ...fiscalYearValues,
        // Convert boolean fields to Yes/No for better pivot display
        is_humanitarian: row.is_humanitarian === true ? 'Yes' : row.is_humanitarian === false ? 'No' : null,
        is_nationwide: row.is_nationwide === true ? 'Yes' : row.is_nationwide === false ? 'No' : null,
        is_original_currency: row.is_original_currency === true ? 'Yes' : row.is_original_currency === false ? 'No' : null,
      };
    });

    // Build dynamic field labels (merge static labels with dynamic year type labels)
    const dynamicYearLabels = generateYearTypeLabels(yearTypes);
    const allFieldLabels = {
      ...FIELD_LABELS,
      ...dynamicYearLabels,
    };

    // Return data with field labels metadata
    const response = NextResponse.json({
      data: transformedData,
      fieldLabels: allFieldLabels,
      yearTypes: yearTypes,
      totalRows: transformedData.length,
      truncated: transformedData.length === limit,
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

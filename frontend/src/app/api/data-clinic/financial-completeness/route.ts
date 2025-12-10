import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

interface FinancialCompletenessActivity {
  id: string;
  title: string;
  iati_identifier: string | null;
  reporting_org_id: string | null;
  reporting_org_name: string | null;
  total_budgeted_usd: number;
  total_disbursed_usd: number;
  overspend_usd: number;
  budget_period_count: number;
  duration_years: number;
  percentage_spent: number;
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  
  // Optional filters
  const reportingOrgId = searchParams.get('reporting_org_id');
  const activityIdsParam = searchParams.get('activity_ids');
  const activityIds = activityIdsParam ? activityIdsParam.split(',').filter(Boolean) : null;

  try {
    console.log('[Financial Completeness API] Fetching data...');

    // Fetch activities with dates
    let activitiesQuery = supabase
      .from('activities')
      .select(`
        id,
        title_narrative,
        iati_identifier,
        planned_start_date,
        planned_end_date,
        reporting_org_id,
        created_by_org_name
      `)
      .not('planned_start_date', 'is', null)
      .not('planned_end_date', 'is', null);

    if (reportingOrgId && reportingOrgId !== 'all') {
      activitiesQuery = activitiesQuery.eq('reporting_org_id', reportingOrgId);
    }
    if (activityIds && activityIds.length > 0) {
      activitiesQuery = activitiesQuery.in('id', activityIds);
    }

    const { data: activities, error: activitiesError } = await activitiesQuery;

    if (activitiesError) {
      console.error('[Financial Completeness API] Activities error:', activitiesError);
      throw activitiesError;
    }

    console.log('[Financial Completeness API] Found activities:', activities?.length || 0);

    if (!activities || activities.length === 0) {
      return NextResponse.json({
        activities: [],
        count: 0
      });
    }

    // Fetch organization names for reporting orgs
    const reportingOrgIds = [...new Set(activities.map((a: any) => a.reporting_org_id).filter(Boolean))];
    const orgNameMap = new Map<string, string>();
    
    if (reportingOrgIds.length > 0) {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', reportingOrgIds);
      
      orgs?.forEach((org: any) => {
        orgNameMap.set(org.id, org.name);
      });
    }

    // Fetch all budgets
    const { data: budgets, error: budgetsError } = await supabase
      .from('activity_budgets')
      .select('activity_id, usd_value, value, currency');

    if (budgetsError) {
      console.error('[Financial Completeness API] Budgets error:', budgetsError);
      throw budgetsError;
    }

    // Fetch disbursement transactions (type '3' for Disbursement)
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('activity_id, value_usd, value, currency, transaction_type')
      .eq('transaction_type', '3')
      .eq('status', 'actual');

    if (transactionsError) {
      console.error('[Financial Completeness API] Transactions error:', transactionsError);
      throw transactionsError;
    }

    console.log('[Financial Completeness API] Budgets:', budgets?.length || 0, 'Transactions:', transactions?.length || 0);

    // Aggregate budgets by activity
    const budgetsByActivity = new Map<string, { total: number; count: number }>();
    budgets?.forEach((b: any) => {
      if (!b.activity_id) return;
      const existing = budgetsByActivity.get(b.activity_id) || { total: 0, count: 0 };
      // Prefer usd_value, fall back to value if currency is USD
      let amount = parseFloat(b.usd_value || '0') || 0;
      if (!amount && b.currency === 'USD' && b.value) {
        amount = parseFloat(b.value || '0') || 0;
      }
      existing.total += amount;
      existing.count += 1;
      budgetsByActivity.set(b.activity_id, existing);
    });

    // Aggregate disbursements by activity
    const disbursementsByActivity = new Map<string, number>();
    transactions?.forEach((t: any) => {
      if (!t.activity_id) return;
      const existing = disbursementsByActivity.get(t.activity_id) || 0;
      // Prefer value_usd, fall back to value if currency is USD
      let amount = parseFloat(t.value_usd || '0') || 0;
      if (!amount && t.currency === 'USD' && t.value) {
        amount = parseFloat(t.value || '0') || 0;
      }
      disbursementsByActivity.set(t.activity_id, existing + amount);
    });

    // Filter and compute results based on the three conditions
    const results: FinancialCompletenessActivity[] = [];

    activities.forEach((activity: any) => {
      const startDate = new Date(activity.planned_start_date);
      const endDate = new Date(activity.planned_end_date);
      
      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return;
      
      const durationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const durationYears = durationDays / 365;

      // Condition 3: Multi-year activity (>= 365 days)
      if (durationDays < 365) return;

      const budgetInfo = budgetsByActivity.get(activity.id) || { total: 0, count: 0 };
      const totalDisbursed = disbursementsByActivity.get(activity.id) || 0;

      // Condition 2: Budget period count < 2
      if (budgetInfo.count >= 2) return;

      // Condition 1: Total disbursed > total budgeted
      if (totalDisbursed <= budgetInfo.total) return;

      // All conditions met - include in results
      const overspend = totalDisbursed - budgetInfo.total;
      const percentageSpent = budgetInfo.total > 0 
        ? (totalDisbursed / budgetInfo.total) * 100 
        : totalDisbursed > 0 ? 999 : 0; // Cap at 999% for display when budget is 0

      // Get org name from map or fallback to created_by_org_name
      const orgName = activity.reporting_org_id 
        ? orgNameMap.get(activity.reporting_org_id) || activity.created_by_org_name 
        : activity.created_by_org_name;

      results.push({
        id: activity.id,
        title: activity.title_narrative || 'Untitled Activity',
        iati_identifier: activity.iati_identifier,
        reporting_org_id: activity.reporting_org_id,
        reporting_org_name: orgName || null,
        total_budgeted_usd: Math.round(budgetInfo.total * 100) / 100,
        total_disbursed_usd: Math.round(totalDisbursed * 100) / 100,
        overspend_usd: Math.round(overspend * 100) / 100,
        budget_period_count: budgetInfo.count,
        duration_years: Math.round(durationYears * 10) / 10,
        percentage_spent: Math.round(percentageSpent * 10) / 10
      });
    });

    // Sort by overspend descending by default
    results.sort((a, b) => b.overspend_usd - a.overspend_usd);

    console.log('[Financial Completeness API] Found', results.length, 'activities with completeness issues');

    return NextResponse.json({
      activities: results,
      count: results.length
    });

  } catch (error) {
    console.error('[Financial Completeness API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial completeness data' },
      { status: 500 }
    );
  }
}

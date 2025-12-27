import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export interface BudgetTrendPoint {
  year: number;
  amount: number;
}

export interface TransactionTrendPoint {
  month: string;
  count: number;
  amount: number;
  types?: Record<string, number>; // transaction_type -> count
}

export interface SectorBreakdown {
  code: string;
  name: string;
  percentage: number;
  activityCount: number;
}

export interface HeroStatsData {
  totalActivities: number;
  unpublishedCount: number;
  pendingValidationCount: number;
  validatedCount: number;
  budgetTrend: BudgetTrendPoint[];
  plannedBudgetTrend: BudgetTrendPoint[];
  transactionTrend: TransactionTrendPoint[];
  sectorBreakdown: SectorBreakdown[];
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    if (!isValidUUID(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organizationId format' },
        { status: 400 }
      );
    }

    // Step 1: Get all activity IDs for this organization
    const { data: activitiesData, error: activitiesError } = await supabase
      .from('activities')
      .select('id, publication_status, submission_status')
      .eq('reporting_org_id', organizationId);

    if (activitiesError) {
      console.error('[Hero Stats] Activities error:', activitiesError);
    }

    const activities = activitiesData || [];
    const activityIds = activities.map(a => a.id);

    // If no activities, return empty data
    if (activityIds.length === 0) {
      const emptyResponse: HeroStatsData = {
        totalActivities: 0,
        unpublishedCount: 0,
        pendingValidationCount: 0,
        validatedCount: 0,
        budgetTrend: [],
        plannedBudgetTrend: [],
        transactionTrend: [],
        sectorBreakdown: [],
      };
      return NextResponse.json(emptyResponse);
    }

    // Step 2: Fetch all related data using activity IDs
    const [
      budgetsResult,
      plannedDisbursementsResult,
      transactionsOnActivitiesResult,
      transactionsAsPartyResult,
      sectorsResult,
    ] = await Promise.all([
      // Get budgets for these activities
      supabase
        .from('activity_budgets')
        .select('value, currency, usd_value, period_start, activity_id')
        .in('activity_id', activityIds),

      // Get planned disbursements for these activities
      supabase
        .from('planned_disbursements')
        .select('amount, currency, usd_amount, period_start, activity_id')
        .in('activity_id', activityIds),

      // Get transactions for these activities (owned by org)
      supabase
        .from('transactions')
        .select('uuid, value, value_usd, transaction_date, activity_id, transaction_type')
        .in('activity_id', activityIds),

      // Get transactions where org is provider or receiver (on any activity)
      supabase
        .from('transactions')
        .select('uuid, value, value_usd, transaction_date, activity_id, transaction_type')
        .or(`provider_org_id.eq.${organizationId},receiver_org_id.eq.${organizationId}`),

      // Get sector allocations for these activities
      supabase
        .from('activity_sectors')
        .select('sector_code, sector_name, percentage, activity_id')
        .in('activity_id', activityIds),
    ]);

    // Log any errors for debugging
    if (budgetsResult.error) console.error('[Hero Stats] Budgets error:', budgetsResult.error);
    if (plannedDisbursementsResult.error) console.error('[Hero Stats] Planned disbursements error:', plannedDisbursementsResult.error);
    if (transactionsOnActivitiesResult.error) console.error('[Hero Stats] Transactions on activities error:', transactionsOnActivitiesResult.error);
    if (transactionsAsPartyResult.error) console.error('[Hero Stats] Transactions as party error:', transactionsAsPartyResult.error);
    if (sectorsResult.error) console.error('[Hero Stats] Sectors error:', sectorsResult.error);

    // Combine transactions from both sources, deduplicating by uuid
    const transactionMap = new Map<string, any>();
    (transactionsOnActivitiesResult.data || []).forEach((tx: any) => {
      transactionMap.set(tx.uuid, tx);
    });
    (transactionsAsPartyResult.data || []).forEach((tx: any) => {
      transactionMap.set(tx.uuid, tx);
    });
    const allTransactions = Array.from(transactionMap.values());

    console.log('[Hero Stats] Data counts:', {
      activities: activities.length,
      budgets: budgetsResult.data?.length || 0,
      plannedDisbursements: plannedDisbursementsResult.data?.length || 0,
      transactionsOnActivities: transactionsOnActivitiesResult.data?.length || 0,
      transactionsAsParty: transactionsAsPartyResult.data?.length || 0,
      totalTransactions: allTransactions.length,
      sectors: sectorsResult.data?.length || 0,
    });

    // Process activity counts (using already fetched activities)
    const totalActivities = activities.length;
    const unpublishedCount = activities.filter(
      (a) => a.publication_status === 'draft' || a.publication_status === 'unpublished'
    ).length;
    const pendingValidationCount = activities.filter(
      (a) => a.submission_status === 'submitted'
    ).length;
    const validatedCount = activities.filter(
      (a) => a.submission_status === 'validated'
    ).length;

    // Process budget trend by year
    const budgetsByYear = new Map<number, number>();
    (budgetsResult.data || []).forEach((budget: any) => {
      const year = budget.period_start
        ? new Date(budget.period_start).getFullYear()
        : new Date().getFullYear();
      // Use usd_value, fallback to value if currency is USD
      const amount = budget.usd_value || (budget.currency === 'USD' ? budget.value : 0) || 0;
      budgetsByYear.set(year, (budgetsByYear.get(year) || 0) + amount);
    });

    const budgetTrend: BudgetTrendPoint[] = Array.from(budgetsByYear.entries())
      .map(([year, amount]) => ({ year, amount }))
      .sort((a, b) => a.year - b.year)
      .slice(-5); // Last 5 years

    // Process planned disbursements trend by year
    const plannedByYear = new Map<number, number>();
    (plannedDisbursementsResult.data || []).forEach((pd: any) => {
      const year = pd.period_start
        ? new Date(pd.period_start).getFullYear()
        : new Date().getFullYear();
      // Use usd_amount, fallback to amount if currency is USD
      const amount = pd.usd_amount || (pd.currency === 'USD' ? pd.amount : 0) || 0;
      plannedByYear.set(year, (plannedByYear.get(year) || 0) + amount);
    });

    const plannedBudgetTrend: BudgetTrendPoint[] = Array.from(plannedByYear.entries())
      .map(([year, amount]) => ({ year, amount }))
      .sort((a, b) => a.year - b.year)
      .slice(-5); // Last 5 years

    // Process transaction trend by year with type breakdown
    const transactionsByYear = new Map<number, { 
      count: number; 
      amount: number; 
      types: Map<string, number>;
    }>();
    
    allTransactions.forEach((tx: any) => {
      if (tx.transaction_date) {
        const d = new Date(tx.transaction_date);
        const year = d.getFullYear();
        if (!transactionsByYear.has(year)) {
          transactionsByYear.set(year, { count: 0, amount: 0, types: new Map() });
        }
        const existing = transactionsByYear.get(year)!;
        existing.count += 1;
        existing.amount += tx.value_usd || tx.value || 0;
        
        // Count by transaction type
        const txType = tx.transaction_type || 'unknown';
        existing.types.set(txType, (existing.types.get(txType) || 0) + 1);
      }
    });

    // Convert to array format, using year as the "month" field for compatibility
    const transactionTrend: TransactionTrendPoint[] = Array.from(transactionsByYear.entries())
      .map(([year, data]) => ({ 
        month: year.toString(), // Use year as string for chart display
        count: data.count, 
        amount: data.amount,
        types: Object.fromEntries(data.types) // Convert Map to object
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-5); // Last 5 years

    // Process sector breakdown
    const sectorMap = new Map<string, { name: string; totalPercentage: number; activityIds: Set<string> }>();
    (sectorsResult.data || []).forEach((sector: any) => {
      const code = sector.sector_code?.substring(0, 3) || 'Unknown'; // DAC3 level
      const name = sector.sector_name || 'Unknown Sector';
      
      if (!sectorMap.has(code)) {
        sectorMap.set(code, { name, totalPercentage: 0, activityIds: new Set() });
      }
      const existing = sectorMap.get(code)!;
      existing.totalPercentage += sector.percentage || 0;
      existing.activityIds.add(sector.activity_id);
    });

    const sectorBreakdown: SectorBreakdown[] = Array.from(sectorMap.entries())
      .map(([code, data]) => ({
        code,
        name: data.name.split(' - ')[0] || data.name, // Get short name
        percentage: Math.round(data.totalPercentage / Math.max(data.activityIds.size, 1)),
        activityCount: data.activityIds.size,
      }))
      .sort((a, b) => b.activityCount - a.activityCount)
      .slice(0, 6); // Top 6 sectors

    const response: HeroStatsData = {
      totalActivities,
      unpublishedCount,
      pendingValidationCount,
      validatedCount,
      budgetTrend,
      plannedBudgetTrend,
      transactionTrend,
      sectorBreakdown,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Dashboard Hero Stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hero stats data' },
      { status: 500 }
    );
  }
}




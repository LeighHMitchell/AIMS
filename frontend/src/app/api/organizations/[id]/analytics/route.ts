import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params;
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    // Get all activities for this organization as reporting org
    const { data: reportedActivities, error: reportedError } = await supabase
      .from('activities')
      .select('id, title_narrative, iati_identifier, activity_status, default_currency')
      .eq('reporting_org_id', orgId);

    if (reportedError) {
      console.error('[Analytics] Error fetching activities:', reportedError);
      return NextResponse.json({
        error: 'Failed to fetch activities',
        details: reportedError.message,
        code: reportedError.code
      }, { status: 500 });
    }

    // Build activities map
    const activitiesMap = new Map<string, any>();
    (reportedActivities || []).forEach(act => {
      activitiesMap.set(act.id, {
        id: act.id,
        title: act.title_narrative,
        iati_identifier: act.iati_identifier,
        activity_status: act.activity_status,
        default_currency: act.default_currency,
        orgRole: 'reporting'
      });
    });

    const activityIds = Array.from(activitiesMap.keys());

    if (activityIds.length === 0) {
      return NextResponse.json({
        summaryMetrics: {
          currentYear: { activeProjects: 0, commitments: 0, disbursements: 0, expenditures: 0 },
          previousYear: { activeProjects: 0, commitments: 0, disbursements: 0, expenditures: 0 }
        },
        topProjects: [],
        sectorData: [],
        projectStatusDistribution: [],
        timeSeriesData: [],
        allProjects: []
      });
    }

    // Fetch all transactions for these activities
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, activity_id, transaction_type, transaction_date, value, currency')
      .in('activity_id', activityIds);

    // Fetch activity sectors
    const { data: activitySectors } = await supabase
      .from('activity_sectors')
      .select('activity_id, sector_code, sector_name, percentage')
      .in('activity_id', activityIds);

    // Process transactions
    const transactionsByYear = new Map<number, { commitments: number; disbursements: number; expenditures: number }>();
    const transactionsByActivity = new Map<string, { commitments: number; disbursements: number; expenditures: number }>();

    (transactions || []).forEach(tx => {
      const year = tx.transaction_date ? new Date(tx.transaction_date).getFullYear() : null;
      const value = tx.value || 0;

      // By year
      if (year) {
        if (!transactionsByYear.has(year)) {
          transactionsByYear.set(year, { commitments: 0, disbursements: 0, expenditures: 0 });
        }
        const yearData = transactionsByYear.get(year)!;
        if (tx.transaction_type === '2' || tx.transaction_type === '11') {
          yearData.commitments += value;
        } else if (tx.transaction_type === '3') {
          yearData.disbursements += value;
        } else if (tx.transaction_type === '4') {
          yearData.expenditures += value;
        }
      }

      // By activity
      if (!transactionsByActivity.has(tx.activity_id)) {
        transactionsByActivity.set(tx.activity_id, { commitments: 0, disbursements: 0, expenditures: 0 });
      }
      const actData = transactionsByActivity.get(tx.activity_id)!;
      if (tx.transaction_type === '2' || tx.transaction_type === '11') {
        actData.commitments += value;
      } else if (tx.transaction_type === '3') {
        actData.disbursements += value;
      } else if (tx.transaction_type === '4') {
        actData.expenditures += value;
      }
    });

    // Summary metrics
    const currentYearData = transactionsByYear.get(currentYear) || { commitments: 0, disbursements: 0, expenditures: 0 };
    const previousYearData = transactionsByYear.get(previousYear) || { commitments: 0, disbursements: 0, expenditures: 0 };
    const activeProjects = Array.from(activitiesMap.values()).filter(
      act => act.activity_status === '2' || act.activity_status === 'active'
    ).length;

    const summaryMetrics = {
      currentYear: {
        activeProjects,
        commitments: currentYearData.commitments,
        disbursements: currentYearData.disbursements,
        expenditures: currentYearData.expenditures
      },
      previousYear: {
        activeProjects: 0,
        commitments: previousYearData.commitments,
        disbursements: previousYearData.disbursements,
        expenditures: previousYearData.expenditures
      }
    };

    // Top projects - use commitments as budget proxy
    const topProjects = Array.from(activitiesMap.values())
      .map(act => {
        const txData = transactionsByActivity.get(act.id) || { commitments: 0, disbursements: 0, expenditures: 0 };
        return {
          id: act.id,
          title: act.title,
          iati_identifier: act.iati_identifier,
          totalBudget: txData.commitments || 0,
          commitments: txData.commitments,
          disbursements: txData.disbursements,
          expenditures: txData.expenditures,
          currency: act.default_currency || 'USD'
        };
      })
      .sort((a, b) => b.totalBudget - a.totalBudget)
      .slice(0, 10);

    // Sector data
    const sectorMap = new Map<string, { code: string; name: string; projectCount: number; commitments: number; disbursements: number }>();
    (activitySectors || []).forEach(sector => {
      const txData = transactionsByActivity.get(sector.activity_id) || { commitments: 0, disbursements: 0, expenditures: 0 };
      const weight = (sector.percentage || 100) / 100;

      if (!sectorMap.has(sector.sector_code)) {
        sectorMap.set(sector.sector_code, {
          code: sector.sector_code,
          name: sector.sector_name,
          projectCount: 0,
          commitments: 0,
          disbursements: 0
        });
      }
      const s = sectorMap.get(sector.sector_code)!;
      s.projectCount += 1;
      s.commitments += txData.commitments * weight;
      s.disbursements += txData.disbursements * weight;
    });
    const sectorData = Array.from(sectorMap.values());

    // Status distribution
    const statusMap = new Map<string, number>();
    Array.from(activitiesMap.values()).forEach(act => {
      const status = act.activity_status || 'unknown';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    const projectStatusDistribution = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: (count / activitiesMap.size) * 100
    }));

    // Time series
    const timeSeriesData = Array.from(transactionsByYear.entries())
      .map(([year, data]) => ({
        year,
        commitments: data.commitments,
        disbursements: data.disbursements,
        expenditures: data.expenditures,
        budget: 0
      }))
      .sort((a, b) => a.year - b.year);

    // All projects
    const allProjects = Array.from(activitiesMap.values()).map(act => {
      const txData = transactionsByActivity.get(act.id) || { commitments: 0, disbursements: 0, expenditures: 0 };
      const sectors = (activitySectors || [])
        .filter(s => s.activity_id === act.id)
        .map(s => s.sector_name)
        .join(', ');

      return {
        id: act.id,
        title: act.title,
        iati_identifier: act.iati_identifier,
        status: act.activity_status,
        sectors,
        developmentPartners: '',
        executingAgencies: '',
        commitments: txData.commitments,
        disbursements: txData.disbursements,
        orgRole: act.orgRole
      };
    });

    return NextResponse.json({
      summaryMetrics,
      topProjects,
      sectorData,
      projectStatusDistribution,
      timeSeriesData,
      allProjects
    });

  } catch (error) {
    console.error('[Analytics] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
  }
}

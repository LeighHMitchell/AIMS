import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    const orgId = params.id;
    const currentYear = 2025;
    const previousYear = 2024;

    // Get all activities for this organization (reporting org + contributions)
    const { data: reportedActivities } = await supabase
      .from('activities')
      .select('id, title, iati_identifier, activity_status, total_budget, default_currency')
      .eq('reporting_org_id', orgId);

    const { data: contributedActivities } = await supabase
      .from('activity_contributors')
      .select(`
        activity_id,
        contribution_type,
        activities:activity_id (
          id, title, iati_identifier, activity_status, total_budget, default_currency
        )
      `)
      .eq('organization_id', orgId)
      .in('contribution_type', ['funding', 'implementing', 'funder', 'implementer']);

    // Combine and deduplicate activities
    const allActivityIds = new Set<string>();
    const activitiesMap = new Map<string, any>();

    (reportedActivities || []).forEach(act => {
      allActivityIds.add(act.id);
      activitiesMap.set(act.id, { ...act, orgRole: 'reporting' });
    });

    (contributedActivities || []).forEach((contrib: any) => {
      if (contrib.activities) {
        allActivityIds.add(contrib.activities.id);
        if (!activitiesMap.has(contrib.activities.id)) {
          activitiesMap.set(contrib.activities.id, {
            ...contrib.activities,
            orgRole: contrib.contribution_type
          });
        }
      }
    });

    const activityIds = Array.from(allActivityIds);

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

    // Fetch transactions for these activities where org is provider or receiver
    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        id,
        activity_id,
        transaction_type,
        transaction_date,
        value,
        currency,
        provider_org_ref,
        receiver_org_ref
      `)
      .in('activity_id', activityIds)
      .or(`provider_org_ref.eq.${orgId},receiver_org_ref.eq.${orgId}`);

    // Fetch activity sectors
    const { data: activitySectors } = await supabase
      .from('activity_sectors')
      .select(`
        activity_id,
        sector_code,
        sector_name,
        percentage
      `)
      .in('activity_id', activityIds);

    // Fetch development partners and executing agencies
    const { data: allContributors } = await supabase
      .from('activity_contributors')
      .select(`
        activity_id,
        organization_id,
        contribution_type,
        organizations:organization_id (
          id, name, acronym
        )
      `)
      .in('activity_id', activityIds);

    // Process transactions by year and type
    const transactionsByYear = new Map<number, {
      commitments: number;
      disbursements: number;
      expenditures: number;
    }>();

    const transactionsByActivity = new Map<string, {
      commitments: number;
      disbursements: number;
      expenditures: number;
    }>();

    (transactions || []).forEach(tx => {
      const year = tx.transaction_date ? new Date(tx.transaction_date).getFullYear() : null;
      const value = tx.value || 0;

      // Aggregate by year
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

      // Aggregate by activity
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

    // Calculate summary metrics
    const currentYearData = transactionsByYear.get(currentYear) || { commitments: 0, disbursements: 0, expenditures: 0 };
    const previousYearData = transactionsByYear.get(previousYear) || { commitments: 0, disbursements: 0, expenditures: 0 };

    const currentYearActiveProjects = Array.from(activitiesMap.values()).filter(
      act => act.activity_status === '2' || act.activity_status === 'active'
    ).length;

    const summaryMetrics = {
      currentYear: {
        activeProjects: currentYearActiveProjects,
        commitments: currentYearData.commitments,
        disbursements: currentYearData.disbursements,
        expenditures: currentYearData.expenditures
      },
      previousYear: {
        activeProjects: 0, // Would need historical data
        commitments: previousYearData.commitments,
        disbursements: previousYearData.disbursements,
        expenditures: previousYearData.expenditures
      }
    };

    // Top 10 projects by budget
    const topProjects = Array.from(activitiesMap.values())
      .map(act => {
        const txData = transactionsByActivity.get(act.id) || { commitments: 0, disbursements: 0, expenditures: 0 };
        return {
          id: act.id,
          title: act.title,
          iati_identifier: act.iati_identifier,
          totalBudget: act.total_budget || 0,
          commitments: txData.commitments,
          disbursements: txData.disbursements,
          expenditures: txData.expenditures,
          currency: act.default_currency || 'USD'
        };
      })
      .sort((a, b) => b.totalBudget - a.totalBudget)
      .slice(0, 10);

    // Sector aggregation
    const sectorMap = new Map<string, {
      code: string;
      name: string;
      projectCount: number;
      commitments: number;
      disbursements: number;
      percentage: number;
    }>();

    (activitySectors || []).forEach(sector => {
      const txData = transactionsByActivity.get(sector.activity_id) || { commitments: 0, disbursements: 0, expenditures: 0 };

      if (!sectorMap.has(sector.sector_code)) {
        sectorMap.set(sector.sector_code, {
          code: sector.sector_code,
          name: sector.sector_name,
          projectCount: 0,
          commitments: 0,
          disbursements: 0,
          percentage: 0
        });
      }

      const sectorData = sectorMap.get(sector.sector_code)!;
      sectorData.projectCount += 1;
      const weight = (sector.percentage || 100) / 100;
      sectorData.commitments += txData.commitments * weight;
      sectorData.disbursements += txData.disbursements * weight;
      sectorData.percentage += sector.percentage || 0;
    });

    const sectorData = Array.from(sectorMap.values());

    // Project status distribution
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

    // Time series data
    const timeSeriesData = Array.from(transactionsByYear.entries())
      .map(([year, data]) => ({
        year,
        commitments: data.commitments,
        disbursements: data.disbursements,
        expenditures: data.expenditures,
        budget: 0 // Would need budget by year data
      }))
      .sort((a, b) => a.year - b.year);

    // All projects data for table
    const allProjects = Array.from(activitiesMap.values()).map(act => {
      const txData = transactionsByActivity.get(act.id) || { commitments: 0, disbursements: 0, expenditures: 0 };
      const sectors = (activitySectors || [])
        .filter(s => s.activity_id === act.id)
        .map(s => s.sector_name)
        .join(', ');

      const contributors = (allContributors || []).filter(c => c.activity_id === act.id);
      const devPartners = contributors
        .filter(c => c.contribution_type === 'funding' || c.contribution_type === 'funder')
        .map(c => c.organizations?.name || c.organizations?.acronym)
        .filter(Boolean)
        .join(', ');

      const executingAgencies = contributors
        .filter(c => c.contribution_type === 'implementing' || c.contribution_type === 'implementer')
        .map(c => c.organizations?.name || c.organizations?.acronym)
        .filter(Boolean)
        .join(', ');

      return {
        id: act.id,
        title: act.title,
        iati_identifier: act.iati_identifier,
        status: act.activity_status,
        sectors,
        developmentPartners: devPartners,
        executingAgencies,
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
    console.error('[AIMS] Error fetching organization analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

interface SectorSummary {
  sectorCode: string;
  sectorName: string;
  newCommitments: number;
  plannedDisbursements: number;
  actualDisbursements: number;
  numberOfProjects: number;
  numberOfOrganisations: number;
}

interface FiscalYearData {
  fiscalYear: string;
  sectors: SectorSummary[];
}

// Helper to convert fiscal year string to date range
// FY2024 = July 1, 2023 to June 30, 2024
function getFiscalYearDateRange(fiscalYear: string): { start: Date; end: Date } {
  const year = parseInt(fiscalYear.replace('FY', ''));
  return {
    start: new Date(year - 1, 6, 1), // July 1 of previous year
    end: new Date(year, 5, 30, 23, 59, 59) // June 30 of the fiscal year
  };
}

// Helper to get fiscal year from date
function getFiscalYearFromDate(date: Date): string {
  const month = date.getMonth();
  const year = date.getFullYear();
  // If July or later, it's the next fiscal year
  const fiscalYear = month >= 6 ? year + 1 : year;
  return `FY${fiscalYear}`;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const searchParams = request.nextUrl.searchParams;

    // Get filter parameters
    const fiscalYearsParam = searchParams.get('fiscalYears'); // comma-separated, e.g., "FY2024,FY2023"
    const fiscalYears = fiscalYearsParam ? fiscalYearsParam.split(',') : [];

    // Fetch all activities with their sectors
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        activity_sectors (
          sector_code,
          sector_name,
          percentage
        )
      `);

    if (activitiesError) {
      console.error('[SectorDisbursementSummary] Error fetching activities:', activitiesError);
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }

    const activityIds = activities?.map(a => a.id) || [];

    if (activityIds.length === 0) {
      return NextResponse.json({ 
        fiscalYears: [],
        availableFiscalYears: []
      });
    }

    // Fetch all commitments (transaction_type = '2')
    const { data: commitments, error: commitmentsError } = await supabase
      .from('transactions')
      .select('activity_id, transaction_date, value_usd, provider_org_id')
      .in('activity_id', activityIds)
      .eq('transaction_type', '2')
      .eq('status', 'actual');

    if (commitmentsError) {
      console.error('[SectorDisbursementSummary] Error fetching commitments:', commitmentsError);
    }

    // Fetch all planned disbursements
    const { data: plannedDisbursements, error: plannedError } = await supabase
      .from('planned_disbursements')
      .select('activity_id, usd_amount, period_start');

    if (plannedError) {
      console.error('[SectorDisbursementSummary] Error fetching planned disbursements:', plannedError);
    }

    // Fetch all actual disbursements (transaction_type = '3')
    const { data: disbursements, error: disbursementsError } = await supabase
      .from('transactions')
      .select('activity_id, transaction_date, value_usd, provider_org_id')
      .in('activity_id', activityIds)
      .eq('transaction_type', '3')
      .eq('status', 'actual');

    if (disbursementsError) {
      console.error('[SectorDisbursementSummary] Error fetching disbursements:', disbursementsError);
    }

    // Build activity sectors map
    const activitySectorsMap = new Map<string, any[]>();
    const allSectors = new Map<string, string>(); // code -> name
    
    activities?.forEach(activity => {
      if (activity.activity_sectors && activity.activity_sectors.length > 0) {
        activitySectorsMap.set(activity.id, activity.activity_sectors);
        activity.activity_sectors.forEach((sector: any) => {
          if (!allSectors.has(sector.sector_code)) {
            allSectors.set(sector.sector_code, sector.sector_name);
          }
        });
      }
    });

    // Determine all available fiscal years from the data
    const allFiscalYears = new Set<string>();
    
    commitments?.forEach(c => {
      if (c.transaction_date) {
        allFiscalYears.add(getFiscalYearFromDate(new Date(c.transaction_date)));
      }
    });
    
    plannedDisbursements?.forEach(pd => {
      if (pd.period_start) {
        allFiscalYears.add(getFiscalYearFromDate(new Date(pd.period_start)));
      }
    });
    
    disbursements?.forEach(d => {
      if (d.transaction_date) {
        allFiscalYears.add(getFiscalYearFromDate(new Date(d.transaction_date)));
      }
    });

    const sortedAvailableFiscalYears = Array.from(allFiscalYears).sort().reverse();

    // If no fiscal years specified, use all available
    const targetFiscalYears = fiscalYears.length > 0 ? fiscalYears : sortedAvailableFiscalYears;

    // Process data by fiscal year and sector
    const fiscalYearDataMap = new Map<string, Map<string, {
      newCommitments: number;
      plannedDisbursements: number;
      actualDisbursements: number;
      projectIds: Set<string>;
      organisationIds: Set<string>;
    }>>();

    // Initialize fiscal year maps
    targetFiscalYears.forEach(fy => {
      const sectorMap = new Map<string, {
        newCommitments: number;
        plannedDisbursements: number;
        actualDisbursements: number;
        projectIds: Set<string>;
        organisationIds: Set<string>;
      }>();
      
      allSectors.forEach((name, code) => {
        sectorMap.set(code, {
          newCommitments: 0,
          plannedDisbursements: 0,
          actualDisbursements: 0,
          projectIds: new Set(),
          organisationIds: new Set()
        });
      });
      
      fiscalYearDataMap.set(fy, sectorMap);
    });

    // Process commitments
    commitments?.forEach(commitment => {
      if (!commitment.transaction_date) return;
      
      const fy = getFiscalYearFromDate(new Date(commitment.transaction_date));
      if (!targetFiscalYears.includes(fy)) return;
      
      const fyData = fiscalYearDataMap.get(fy);
      if (!fyData) return;
      
      const activitySectors = activitySectorsMap.get(commitment.activity_id) || [];
      const amount = commitment.value_usd || 0;
      
      activitySectors.forEach((sector: any) => {
        const sectorData = fyData.get(sector.sector_code);
        if (sectorData) {
          sectorData.newCommitments += amount * (sector.percentage / 100);
          sectorData.projectIds.add(commitment.activity_id);
          if (commitment.provider_org_id) {
            sectorData.organisationIds.add(commitment.provider_org_id);
          }
        }
      });
    });

    // Process planned disbursements
    plannedDisbursements?.forEach(pd => {
      if (!pd.period_start) return;
      
      const fy = getFiscalYearFromDate(new Date(pd.period_start));
      if (!targetFiscalYears.includes(fy)) return;
      
      const fyData = fiscalYearDataMap.get(fy);
      if (!fyData) return;
      
      const activitySectors = activitySectorsMap.get(pd.activity_id) || [];
      const amount = parseFloat(pd.usd_amount?.toString() || '0') || 0;
      
      activitySectors.forEach((sector: any) => {
        const sectorData = fyData.get(sector.sector_code);
        if (sectorData) {
          sectorData.plannedDisbursements += amount * (sector.percentage / 100);
          sectorData.projectIds.add(pd.activity_id);
        }
      });
    });

    // Process actual disbursements
    disbursements?.forEach(disbursement => {
      if (!disbursement.transaction_date) return;
      
      const fy = getFiscalYearFromDate(new Date(disbursement.transaction_date));
      if (!targetFiscalYears.includes(fy)) return;
      
      const fyData = fiscalYearDataMap.get(fy);
      if (!fyData) return;
      
      const activitySectors = activitySectorsMap.get(disbursement.activity_id) || [];
      const amount = disbursement.value_usd || 0;
      
      activitySectors.forEach((sector: any) => {
        const sectorData = fyData.get(sector.sector_code);
        if (sectorData) {
          sectorData.actualDisbursements += amount * (sector.percentage / 100);
          sectorData.projectIds.add(disbursement.activity_id);
          if (disbursement.provider_org_id) {
            sectorData.organisationIds.add(disbursement.provider_org_id);
          }
        }
      });
    });

    // Convert to response format
    const result: FiscalYearData[] = targetFiscalYears.map(fy => {
      const fyData = fiscalYearDataMap.get(fy);
      const sectors: SectorSummary[] = [];
      
      if (fyData) {
        fyData.forEach((data, code) => {
          // Only include sectors that have some data
          if (data.newCommitments > 0 || data.plannedDisbursements > 0 || 
              data.actualDisbursements > 0 || data.projectIds.size > 0) {
            sectors.push({
              sectorCode: code,
              sectorName: allSectors.get(code) || 'Unknown',
              newCommitments: data.newCommitments,
              plannedDisbursements: data.plannedDisbursements,
              actualDisbursements: data.actualDisbursements,
              numberOfProjects: data.projectIds.size,
              numberOfOrganisations: data.organisationIds.size
            });
          }
        });
      }
      
      // Sort sectors by total value (descending)
      sectors.sort((a, b) => {
        const totalA = a.newCommitments + a.plannedDisbursements + a.actualDisbursements;
        const totalB = b.newCommitments + b.plannedDisbursements + b.actualDisbursements;
        return totalB - totalA;
      });
      
      return {
        fiscalYear: fy,
        sectors
      };
    });

    return NextResponse.json({
      fiscalYears: result,
      availableFiscalYears: sortedAvailableFiscalYears
    });
  } catch (error) {
    console.error('[SectorDisbursementSummary] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



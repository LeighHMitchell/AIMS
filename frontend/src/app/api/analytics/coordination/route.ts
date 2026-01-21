import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import type {
  CoordinationView,
  CoordinationHierarchy,
  CoordinationParentNode,
  CoordinationBubble,
  CoordinationSummary,
  CoordinationResponse
} from '@/types/coordination';

export const dynamic = 'force-dynamic';

// DAC 3-digit sector category names
const DAC_CATEGORY_NAMES: Record<string, string> = {
  '111': 'Education',
  '112': 'Basic Education',
  '113': 'Secondary Education',
  '114': 'Post-Secondary Education',
  '121': 'Health, General',
  '122': 'Basic Health',
  '123': 'Non-communicable diseases',
  '130': 'Population & Reproductive Health',
  '140': 'Water & Sanitation',
  '151': 'Government & Civil Society',
  '152': 'Conflict, Peace & Security',
  '160': 'Social Infrastructure',
  '210': 'Transport & Storage',
  '220': 'Communications',
  '230': 'Energy',
  '240': 'Banking & Financial Services',
  '250': 'Business & Other Services',
  '311': 'Agriculture',
  '312': 'Forestry',
  '313': 'Fishing',
  '321': 'Industry',
  '322': 'Mineral Resources & Mining',
  '323': 'Construction',
  '331': 'Trade Policy',
  '332': 'Tourism',
  '410': 'Environment',
  '430': 'Other Multisector',
  '510': 'General Budget Support',
  '520': 'Developmental Food Aid',
  '530': 'Other Commodity Assistance',
  '600': 'Action Relating to Debt',
  '720': 'Emergency Response',
  '730': 'Reconstruction & Rehabilitation',
  '740': 'Disaster Prevention',
  '910': 'Administrative Costs',
  '920': 'Support to NGOs',
  '930': 'Refugees in Donor Countries',
  '998': 'Unallocated / Unspecified',
};

function getCategoryName(code: string): string {
  return DAC_CATEGORY_NAMES[code] || `Sector ${code}`;
}

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const view = (searchParams.get('view') || 'sectors') as CoordinationView;

    const supabaseAdmin = supabase;

    // Get activities (include all for now - can filter by publication_status if needed)
    const { data: publishedActivities, error: activitiesError } = await supabaseAdmin
      .from('activities')
      .select('id');
      // .eq('publication_status', 'published'); // Uncomment to filter to published only

    if (activitiesError) {
      console.error('Error fetching published activities:', activitiesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch activities data' },
        { status: 500 }
      );
    }

    const publishedActivityIds = publishedActivities?.map(a => a.id) || [];

    if (publishedActivityIds.length === 0) {
      const emptyResponse: CoordinationResponse = {
        success: true,
        view,
        data: { name: 'Coordination', children: [] },
        summary: { totalBudget: 0, sectorCount: 0, organizationCount: 0, activityCount: 0 }
      };
      return NextResponse.json(emptyResponse);
    }

    // Get activity sectors (we'll aggregate to 3-digit)
    const { data: activitySectors, error: sectorsError } = await supabaseAdmin
      .from('activity_sectors')
      .select('sector_code, sector_name, category_code, category_name, percentage, activity_id')
      .in('activity_id', publishedActivityIds);

    if (sectorsError) {
      console.error('Error fetching activity sectors:', sectorsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch activity sectors' },
        { status: 500 }
      );
    }

    // Get participating organizations
    const { data: participatingOrgs, error: orgsError } = await supabaseAdmin
      .from('activity_participating_organizations')
      .select('activity_id, organization_id, role_type')
      .in('activity_id', publishedActivityIds);

    if (orgsError) {
      console.error('Error fetching participating orgs:', orgsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch participating organizations' },
        { status: 500 }
      );
    }

    // Get organization names
    const orgIds = Array.from(new Set(participatingOrgs?.map(o => o.organization_id).filter(Boolean) || []));

    let organizationsMap = new Map<string, string>();
    if (orgIds.length > 0) {
      const { data: organizations } = await supabaseAdmin
        .from('organizations')
        .select('id, name')
        .in('id', orgIds);

      organizations?.forEach(org => {
        organizationsMap.set(org.id, org.name || 'Unknown Organization');
      });
    }

    // Get transactions for budget values
    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from('transactions')
      .select('activity_id, transaction_type, value_usd')
      .in('transaction_type', ['2', '3']) // Commitments and Disbursements
      .in('activity_id', publishedActivityIds)
      .not('value_usd', 'is', null);

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    // Build activity → total budget map
    const activityBudgetMap = new Map<string, number>();
    transactions?.forEach(t => {
      const value = parseFloat(t.value_usd?.toString() || '0') || 0;
      if (value > 0) {
        activityBudgetMap.set(t.activity_id, (activityBudgetMap.get(t.activity_id) || 0) + value);
      }
    });

    // Build activity → sectors map (3-digit category)
    const activitySectorMap = new Map<string, Array<{ code: string; name: string; percentage: number }>>();
    activitySectors?.forEach(sector => {
      const activityId = sector.activity_id;
      // Get 3-digit category code
      const categoryCode = sector.category_code || (sector.sector_code?.substring(0, 3) || '998');
      // Always prefer our lookup table for consistent naming
      const categoryName = getCategoryName(categoryCode);

      if (!activitySectorMap.has(activityId)) {
        activitySectorMap.set(activityId, []);
      }

      // Check if this category is already in the list
      const existingSector = activitySectorMap.get(activityId)!.find(s => s.code === categoryCode);
      if (existingSector) {
        existingSector.percentage += sector.percentage || 0;
      } else {
        activitySectorMap.get(activityId)!.push({
          code: categoryCode,
          name: categoryName,
          percentage: sector.percentage || 0
        });
      }
    });

    // Build activity → organizations map
    const activityOrgMap = new Map<string, Array<{ id: string; name: string }>>();
    participatingOrgs?.forEach(po => {
      if (!po.organization_id) return;
      const activityId = po.activity_id;

      if (!activityOrgMap.has(activityId)) {
        activityOrgMap.set(activityId, []);
      }

      const orgName = organizationsMap.get(po.organization_id) || 'Unknown Organization';

      // Check if org already exists for this activity
      const existingOrg = activityOrgMap.get(activityId)!.find(o => o.id === po.organization_id);
      if (!existingOrg) {
        activityOrgMap.get(activityId)!.push({
          id: po.organization_id,
          name: orgName
        });
      }
    });

    // Aggregate data based on view
    let hierarchyData: CoordinationHierarchy;
    let summary: CoordinationSummary;

    if (view === 'sectors') {
      // View A: Sectors → Organizations
      const sectorOrgMap = new Map<string, {
        name: string;
        orgs: Map<string, { name: string; value: number; activityCount: number }>;
      }>();

      publishedActivityIds.forEach(activityId => {
        const sectors = activitySectorMap.get(activityId) || [];
        const orgs = activityOrgMap.get(activityId) || [];
        const activityBudget = activityBudgetMap.get(activityId) || 0;

        sectors.forEach(sector => {
          if (!sectorOrgMap.has(sector.code)) {
            sectorOrgMap.set(sector.code, {
              name: sector.name,
              orgs: new Map()
            });
          }

          const sectorData = sectorOrgMap.get(sector.code)!;
          const allocatedBudget = activityBudget * (sector.percentage / 100);

          orgs.forEach(org => {
            if (!sectorData.orgs.has(org.id)) {
              sectorData.orgs.set(org.id, {
                name: org.name,
                value: 0,
                activityCount: 0
              });
            }

            const orgData = sectorData.orgs.get(org.id)!;
            // Divide budget equally among orgs in the activity
            orgData.value += allocatedBudget / orgs.length;
            orgData.activityCount += 1;
          });
        });
      });

      // Convert to hierarchy structure
      const children: CoordinationParentNode[] = Array.from(sectorOrgMap.entries())
        .map(([code, data]) => {
          const orgChildren: CoordinationBubble[] = Array.from(data.orgs.entries())
            .map(([orgId, orgData]) => ({
              id: orgId,
              name: orgData.name,
              value: orgData.value,
              activityCount: orgData.activityCount
            }))
            .filter(o => o.value > 0)
            .sort((a, b) => b.value - a.value);

          return {
            id: code,
            name: data.name,
            code,
            totalValue: orgChildren.reduce((sum, o) => sum + o.value, 0),
            children: orgChildren
          };
        })
        .filter(s => s.children.length > 0 && s.totalValue > 0)
        .sort((a, b) => b.totalValue - a.totalValue);

      hierarchyData = { name: 'Coordination', children };

      const allOrgIds = new Set<string>();
      children.forEach(s => s.children.forEach(o => allOrgIds.add(o.id)));

      summary = {
        totalBudget: children.reduce((sum, s) => sum + s.totalValue, 0),
        sectorCount: children.length,
        organizationCount: allOrgIds.size,
        activityCount: publishedActivityIds.length
      };

    } else {
      // View B: Organizations → Sectors
      const orgSectorMap = new Map<string, {
        name: string;
        sectors: Map<string, { code: string; name: string; value: number; activityCount: number }>;
      }>();

      publishedActivityIds.forEach(activityId => {
        const sectors = activitySectorMap.get(activityId) || [];
        const orgs = activityOrgMap.get(activityId) || [];
        const activityBudget = activityBudgetMap.get(activityId) || 0;

        orgs.forEach(org => {
          if (!orgSectorMap.has(org.id)) {
            orgSectorMap.set(org.id, {
              name: org.name,
              sectors: new Map()
            });
          }

          const orgData = orgSectorMap.get(org.id)!;

          sectors.forEach(sector => {
            const allocatedBudget = (activityBudget * (sector.percentage / 100)) / orgs.length;

            if (!orgData.sectors.has(sector.code)) {
              orgData.sectors.set(sector.code, {
                code: sector.code,
                name: sector.name,
                value: 0,
                activityCount: 0
              });
            }

            const sectorData = orgData.sectors.get(sector.code)!;
            sectorData.value += allocatedBudget;
            sectorData.activityCount += 1;
          });
        });
      });

      // Convert to hierarchy structure
      const children: CoordinationParentNode[] = Array.from(orgSectorMap.entries())
        .map(([orgId, data]) => {
          const sectorChildren: CoordinationBubble[] = Array.from(data.sectors.entries())
            .map(([code, sectorData]) => ({
              id: code,
              name: sectorData.name,
              code: sectorData.code,
              value: sectorData.value,
              activityCount: sectorData.activityCount
            }))
            .filter(s => s.value > 0)
            .sort((a, b) => b.value - a.value);

          return {
            id: orgId,
            name: data.name,
            totalValue: sectorChildren.reduce((sum, s) => sum + s.value, 0),
            children: sectorChildren
          };
        })
        .filter(o => o.children.length > 0 && o.totalValue > 0)
        .sort((a, b) => b.totalValue - a.totalValue);

      hierarchyData = { name: 'Coordination', children };

      const allSectorCodes = new Set<string>();
      children.forEach(o => o.children.forEach(s => allSectorCodes.add(s.id)));

      summary = {
        totalBudget: children.reduce((sum, o) => sum + o.totalValue, 0),
        sectorCount: allSectorCodes.size,
        organizationCount: children.length,
        activityCount: publishedActivityIds.length
      };
    }

    const response: CoordinationResponse = {
      success: true,
      view,
      data: hierarchyData,
      summary
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in coordination API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

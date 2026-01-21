import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const searchParams = request.nextUrl.searchParams;

    // Get filter parameters
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const country = searchParams.get('country');
    const sector = searchParams.get('sector');
    const includeNonODA = searchParams.get('includeNonODA') === 'true';

    // Define flow type ranges
    // ODA codes: 10-19
    const odaFlowCodes = ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19'];
    const oofFlowCodes = ['20', '21', '22', '23', '24']; // Other Official Flows
    const otherFlowCodes = ['30', '40', '50']; // Private Grants, Non-flow, Other

    // Build flow type filter
    let flowTypeCodes = odaFlowCodes;
    if (includeNonODA) {
      flowTypeCodes = [...odaFlowCodes, ...oofFlowCodes, ...otherFlowCodes];
    }

    // First, get activity IDs that match country and sector filters
    let activitiesQuery = supabase
      .from('activities')
      .select('id');

    if (country && country !== 'all') {
      activitiesQuery = activitiesQuery.contains('locations', [{ country_code: country }]);
    }

    const { data: activities, error: activitiesError } = await activitiesQuery;

    if (activitiesError) {
      console.error('[ODAByFlowType] Activities error:', activitiesError);
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }

    const activityIds = activities?.map(a => a.id) || [];

    // If sector filter is applied, filter by sector
    let filteredActivityIds = activityIds;
    if (sector && sector !== 'all' && activityIds.length > 0) {
      const { data: sectorData } = await supabase
        .from('activity_sectors')
        .select('activity_id')
        .eq('sector_code', sector)
        .in('activity_id', activityIds);

      filteredActivityIds = sectorData?.map(s => s.activity_id) || [];
    }

    // Query transactions for these activities
    let transactionsQuery = supabase
      .from('transactions')
      .select(`
        flow_type,
        value,
        value_usd,
        transaction_type
      `)
      .in('transaction_type', ['2', '3']) // Commitments or Disbursements
      .eq('status', 'actual')
      .not('flow_type', 'is', null);

    if (filteredActivityIds.length > 0) {
      transactionsQuery = transactionsQuery.in('activity_id', filteredActivityIds);
    } else {
      return NextResponse.json({ flows: [] });
    }

    if (dateFrom) {
      transactionsQuery = transactionsQuery.gte('transaction_date', dateFrom);
    }
    if (dateTo) {
      transactionsQuery = transactionsQuery.lte('transaction_date', dateTo);
    }

    const { data: transactions, error } = await transactionsQuery;

    if (error) {
      console.error('[ODAByFlowType] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    // Aggregate by flow type
    const flowTypeTotals = new Map<string, number>();

    transactions?.forEach((t: any) => {
      if (!t.flow_type) return;
      
      // Filter by flow type if not including non-ODA
      if (!includeNonODA && !odaFlowCodes.includes(t.flow_type)) {
        return;
      }
      
      const value = parseFloat(t.value_usd?.toString() || '0') || 0;
      const current = flowTypeTotals.get(t.flow_type) || 0;
      flowTypeTotals.set(t.flow_type, current + value);
    });

    // Load flow types data for labels
    // Import flow types data
    const flowTypesData = [
      {"code": "10", "name": "ODA", "description": "Official Development Assistance provided by governments or multilateral institutions.", "group": "Official Flows – ODA"},
      {"code": "20", "name": "OOF", "description": "Other Official Flows. (Withdrawn; do not use in new records)", "group": "Official Flows – OOF"},
      {"code": "21", "name": "Non-export credit OOF", "description": "Other Official Flows excluding export credits, such as non-concessional loans.", "group": "Official Flows – OOF"},
      {"code": "22", "name": "Officially supported export credits", "description": "Export credits extended or guaranteed by public institutions.", "group": "Official Flows – OOF"},
      {"code": "30", "name": "Private Development Finance", "description": "Financing by philanthropic foundations, NGOs, and other civil society organisations.", "group": "Private Flows – Development"},
      {"code": "35", "name": "Private Market", "description": "Private capital flows with over one-year maturity. (Withdrawn; do not use in new records)", "group": "Private Flows – Investment"},
      {"code": "36", "name": "Private Foreign Direct Investment", "description": "Private sector investment in enterprises to acquire lasting interest or control.", "group": "Private Flows – Investment"},
      {"code": "37", "name": "Other Private Flows at Market Terms", "description": "Long-term capital flows at market terms by residents of DAC countries.", "group": "Private Flows – Investment"},
      {"code": "40", "name": "Non flow", "description": "Non-financial indicators such as GNI, population, or %ODA/GNI.", "group": "Reference Data"},
      {"code": "50", "name": "Other flows", "description": "Flows not elsewhere classified, e.g. non-ODA components of peacekeeping or security ops.", "group": "Miscellaneous"}
    ];
    
    const flowTypesMap = new Map();
    flowTypesData.forEach((ft: any) => {
      flowTypesMap.set(ft.code.toString(), ft);
    });

    // Convert to array with labels
    const result = Array.from(flowTypeTotals.entries())
      .map(([code, totalValue]) => {
        const flowType = flowTypesMap.get(code);
        return {
          code,
          label: flowType?.name || `Flow Type ${code}`,
          category: getFlowCategory(code),
          totalValue
        };
      })
      .filter(flow => flow.totalValue > 0) // Only include flows with data
      .sort((a, b) => b.totalValue - a.totalValue); // Sort by value descending

    return NextResponse.json({ flows: result });
  } catch (error) {
    console.error('[ODAByFlowType] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to categorize flow types
function getFlowCategory(code: string): string {
  const odaCodes = ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19'];
  const oofCodes = ['20', '21', '22', '23', '24'];
  const otherCodes = ['30', '40', '50'];

  if (odaCodes.includes(code)) {
    return 'ODA';
  } else if (oofCodes.includes(code)) {
    return 'OOF';
  } else if (otherCodes.includes(code)) {
    return 'Other';
  }
  return 'Unknown';
}


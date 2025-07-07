import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-simple';

export const dynamic = 'force-dynamic';

// Cache headers for IATI reference values (these rarely change)
const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400', // 1 hour cache, 24 hour stale
  'CDN-Cache-Control': 'public, s-maxage=3600',
  'Vercel-CDN-Cache-Control': 'public, s-maxage=3600',
};

// Fallback data for when database function is not available
const FALLBACK_IATI_DATA = {
  transaction_type: [
    { code: '1', name: 'Incoming Funds' },
    { code: '2', name: 'Outgoing Commitment' },
    { code: '3', name: 'Disbursement' },
    { code: '4', name: 'Expenditure' },
    { code: '11', name: 'Incoming Pledge' },
    { code: '12', name: 'Outgoing Pledge' },
    { code: '13', name: 'Loan repayment/receipt' }
  ],
  aid_type: [
    { code: 'A01', name: 'General budget support' },
    { code: 'A02', name: 'Sector budget support' },
    { code: 'B01', name: 'Core support to NGOs, other private bodies, PPPs and research institutes' },
    { code: 'B02', name: 'Core contributions to multilateral institutions' },
    { code: 'B03', name: 'Contributions to specific-purpose programmes and funds managed by implementing partners' },
    { code: 'B04', name: 'Basket funds/pooled funding' },
    { code: 'C01', name: 'Project-type interventions' },
    { code: 'D01', name: 'Donor country personnel' },
    { code: 'D02', name: 'Other technical assistance' },
    { code: 'E01', name: 'Scholarships/training in donor country' },
    { code: 'E02', name: 'Imputed student costs' },
    { code: 'F01', name: 'Debt relief' },
    { code: 'G01', name: 'Administrative costs not included elsewhere' },
    { code: 'H01', name: 'Development awareness' },
    { code: 'H02', name: 'Refugees/asylum seekers in donor countries' }
  ],
  flow_type: [
    { code: '10', name: 'ODA' },
    { code: '20', name: 'OOF' },
    { code: '21', name: 'Non-export credit OOF' },
    { code: '22', name: 'Officially supported export credits' },
    { code: '30', name: 'Private grants' },
    { code: '35', name: 'Private market' },
    { code: '40', name: 'Non flow' },
    { code: '50', name: 'Other flows' }
  ],
  finance_type: [
    { code: '110', name: 'Aid grant excluding debt reorganisation' },
    { code: '111', name: 'Grant' },
    { code: '210', name: 'Standard loan' },
    { code: '211', name: 'Concessional loan' },
    { code: '212', name: 'Reimbursable grant' },
    { code: '310', name: 'Debt forgiveness/conversion' },
    { code: '311', name: 'Debt forgiveness: ODA claims (P)' },
    { code: '312', name: 'Debt forgiveness: OOF claims (P)' },
    { code: '313', name: 'Debt forgiveness: Private claims (P)' },
    { code: '314', name: 'Debt conversion (P)' },
    { code: '421', name: 'Standard grant' },
    { code: '422', name: 'Developmental food aid/Food security assistance' },
    { code: '510', name: 'Common equity' },
    { code: '511', name: 'Acquisition of equity as part of a privatisation' },
    { code: '512', name: 'Other acquisition of equity' },
    { code: '520', name: 'Bonds' },
    { code: '530', name: 'Other securities/claims' },
    { code: '610', name: 'Private Development Finance Institution' },
    { code: '620', name: 'Non-bank guaranteed export credits' },
    { code: '910', name: 'Other bank export credits' }
  ],
  tied_status: [
    { code: '3', name: 'Partially tied' },
    { code: '4', name: 'Tied' },
    { code: '5', name: 'Untied' }
  ],
  disbursement_channel: [
    { code: '1', name: 'Money is disbursed through central government' },
    { code: '2', name: 'Money is disbursed directly to the institution/mechanism' },
    { code: '3', name: 'Money is disbursed through a third party' },
    { code: '4', name: 'Aid in kind: suppliers contract' }
  ],
  organization_type: [
    { code: '10', name: 'Government' },
    { code: '15', name: 'Other Public Sector' },
    { code: '21', name: 'International NGO' },
    { code: '22', name: 'National NGO' },
    { code: '23', name: 'Regional NGO' },
    { code: '30', name: 'Public Private Partnership' },
    { code: '40', name: 'Multilateral' },
    { code: '60', name: 'Foundation' },
    { code: '70', name: 'Private Sector' },
    { code: '80', name: 'Academic, Training and Research' },
    { code: '90', name: 'Other' }
  ]
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fieldName = searchParams.get('field_name');
    
    const supabase = createClient();
    
    if (!supabase) {
      console.warn('Failed to connect to database, using fallback data');
      return NextResponse.json({
        fields: fieldName ? { [fieldName]: FALLBACK_IATI_DATA[fieldName as keyof typeof FALLBACK_IATI_DATA] || [] } : FALLBACK_IATI_DATA
      }, {
        headers: CACHE_HEADERS
      });
    }
    
    // Call the database function to get reference values
    const { data, error } = await supabase
      .rpc('get_iati_reference_values', fieldName ? { p_field_name: fieldName } : {});

    if (error) {
      console.error('Error fetching IATI reference values:', error);
      console.warn('Using fallback IATI reference data');
      return NextResponse.json({
        fields: fieldName ? { [fieldName]: FALLBACK_IATI_DATA[fieldName as keyof typeof FALLBACK_IATI_DATA] || [] } : FALLBACK_IATI_DATA
      }, {
        headers: CACHE_HEADERS
      });
    }

    // Transform the data for easier consumption by the frontend
    if (fieldName) {
      // Return just the values for a specific field
      return NextResponse.json({
        field: fieldName,
        values: data || []
      }, {
        headers: CACHE_HEADERS
      });
    } else {
      // Return all values grouped by field
      const groupedData = data?.reduce((acc: any, item: any) => {
        if (!acc[item.field_name]) {
          acc[item.field_name] = [];
        }
        acc[item.field_name].push({
          code: item.code,
          name: item.name
        });
        return acc;
      }, {}) || {};

      return NextResponse.json({
        fields: groupedData
      }, {
        headers: CACHE_HEADERS
      });
    }
  } catch (error) {
    console.error('Error in IATI reference values API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
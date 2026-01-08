import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// IATI Datastore configuration
// The new IATI datastore is hosted at datastore.iatistandard.org
const IATI_API_BASE_URL = process.env.IATI_API_BASE_URL || 'https://datastore.iatistandard.org/api';
const IATI_API_KEY = process.env.IATI_API_KEY;

interface CompareRequest {
  iati_identifier?: string;
}

// Helper function to normalize IATI narrative fields
function extractNarrative(narrativeObj: any): string {
  if (!narrativeObj) return '';
  if (typeof narrativeObj === 'string') return narrativeObj;
  if (Array.isArray(narrativeObj)) {
    return narrativeObj[0]?.narrative || narrativeObj[0] || '';
  }
  if (narrativeObj.narrative) {
    return Array.isArray(narrativeObj.narrative) 
      ? narrativeObj.narrative[0] 
      : narrativeObj.narrative;
  }
  return '';
}

// Helper function to extract date from IATI activity-date
function extractActivityDate(activityDates: any[], dateType: string): string | null {
  if (!Array.isArray(activityDates)) return null;
  
  const dateTypeMap: Record<string, string> = {
    'start-planned': '1',
    'start-actual': '2',
    'end-planned': '3',
    'end-actual': '4'
  };
  
  const date = activityDates.find(d => d['@_type'] === dateTypeMap[dateType]);
  return date?.['@_iso-date'] || null;
}

// Helper function to normalize participating organizations
function normalizeParticipatingOrgs(participatingOrgs: any): any[] {
  if (!participatingOrgs) return [];
  const orgs = Array.isArray(participatingOrgs) ? participatingOrgs : [participatingOrgs];
  
  return orgs.map(org => ({
    ref: org['@_ref'] || '',
    name: extractNarrative(org.narrative || org),
    role: org['@_role'] || '',
    type: org['@_type'] || '',
    roleLabel: getOrgRoleLabel(org['@_role'])
  }));
}

// Helper function to get organization role labels
function getOrgRoleLabel(role: string): string {
  const roleMap: Record<string, string> = {
    '1': 'Funding',
    '2': 'Accountable',
    '3': 'Extending',
    '4': 'Implementing'
  };
  return roleMap[role] || 'Other';
}

// Helper function to normalize sectors
function normalizeSectors(sectors: any): any[] {
  if (!sectors) return [];
  const sectorArray = Array.isArray(sectors) ? sectors : [sectors];
  
  return sectorArray.map(sector => ({
    code: sector['@_code'] || '',
    vocabulary: sector['@_vocabulary'] || 'DAC',
    percentage: parseFloat(sector['@_percentage'] || '0'),
    name: extractNarrative(sector.narrative || sector)
  }));
}

// Helper function to normalize transactions
function normalizeTransactions(transactions: any): any[] {
  if (!transactions) return [];
  const transArray = Array.isArray(transactions) ? transactions : [transactions];
  
  return transArray.map(transaction => ({
    type: transaction['transaction-type']?.['@_code'] || '',
    date: transaction['transaction-date']?.['@_iso-date'] || '',
    value: parseFloat(transaction.value?.['#text'] || transaction.value || '0'),
    currency: transaction.value?.['@_currency'] || 'USD',
    valueDate: transaction.value?.['@_value-date'] || '',
    description: extractNarrative(transaction.description),
    providerOrg: {
      ref: transaction['provider-org']?.['@_ref'] || '',
      name: extractNarrative(transaction['provider-org'])
    },
    receiverOrg: {
      ref: transaction['receiver-org']?.['@_ref'] || '',
      name: extractNarrative(transaction['receiver-org'])
    },
    aidType: transaction['aid-type']?.['@_code'] || '',
    financeType: transaction['finance-type']?.['@_code'] || '',
    tiedStatus: transaction['tied-status']?.['@_code'] || '',
    flowType: transaction['flow-type']?.['@_code'] || '',
    disbursementChannel: transaction['disbursement-channel']?.['@_code'] || ''
  }));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: activityId } = await params;
    const body: CompareRequest = await request.json();
    
    console.log('[IATI Compare] Starting comparison for activity:', activityId);
    
    // Fetch activity from database
    const { data: activity, error: activityError } = await getSupabaseAdmin()
      .from('activities')
      .select(`
        *,
        activity_sectors(
          id,
          activity_id,
          sector_code,
          sector_name,
          sector_category_code,
          sector_category_name,
          sector_percentage,
          category_percentage,
          type
        ),
        contributors:activity_contributors(
          organization_id,
          role,
          organizations!inner(
            id,
            name,
            iati_org_id,
            type
          )
        )
      `)
      .eq('id', activityId)
      .single();
    
    if (activityError || !activity) {
      console.error('[IATI Compare] Activity not found:', activityError);
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }
    
    // Use provided IATI identifier or the one from the activity
    const iatiIdentifier = body.iati_identifier || activity.iati_id;
    
    if (!iatiIdentifier) {
      return NextResponse.json(
        { error: 'No IATI identifier found for this activity' },
        { status: 400 }
      );
    }
    
    console.log('[IATI Compare] Using IATI identifier:', iatiIdentifier);
    
    // Prepare local data in normalized format
    const localData: any = {
      iati_identifier: activity.iati_id,
      title_narrative: activity.title,
      description_narrative: activity.description,
      activity_status: activity.activity_status,
      activity_date_start_planned: activity.planned_start_date,
      activity_date_start_actual: activity.actual_start_date,
      activity_date_end_planned: activity.planned_end_date,
      activity_date_end_actual: activity.actual_end_date,
      sectors: activity.activity_sectors?.map((s: any) => ({
        code: s.sector_code || '',
        name: s.sector_name || '',
        percentage: s.sector_percentage || 0,
        vocabulary: 'DAC'
      })) || [],
      participating_orgs: activity.contributors?.map((c: any) => ({
        ref: c.organizations.iati_org_id || '',
        name: c.organizations.name,
        type: c.organizations.type,
        role: c.role === 'funder' ? '1' : 
              c.role === 'implementer' ? '4' : 
              c.role === 'accountable' ? '2' : 
              c.role === 'extending' ? '3' : '2',
        roleLabel: c.role
      })) || [],
      default_aid_type: activity.default_aid_type,
      flow_type: activity.flow_type,
      collaboration_type: activity.collaboration_type,
      default_finance_type: activity.default_finance_type,
      transactions: [] // Initialize transactions property
    };
    
    // Fetch transactions for this activity
    const { data: transactions } = await getSupabaseAdmin()
      .from('transactions')
      .select('*')
      .eq('activity_id', activityId)
      .order('transaction_date', { ascending: false });
    
    localData.transactions = transactions?.map((t: any) => ({
      type: t.transaction_type,
      date: t.transaction_date,
      value: t.value,
      currency: t.currency,
      description: t.description,
      providerOrg: {
        ref: t.provider_org_ref || '',
        name: t.provider_org_name || ''
      },
      receiverOrg: {
        ref: t.receiver_org_ref || '',
        name: t.receiver_org_name || ''
      },
      aidType: t.aid_type,
      financeType: t.finance_type,
      tiedStatus: t.tied_status,
      flowType: t.flow_type,
      disbursementChannel: t.disbursement_channel
    })) || [];
    
    // Fetch from IATI Datastore
    let iatiData = null;
    let iatiError = null;
    
    try {
      // The IATI datastore API requires searching for activities using query parameters
      const iatiUrl = `${IATI_API_BASE_URL}/activities?iati_identifier=${encodeURIComponent(iatiIdentifier)}&format=json`;
      console.log('[IATI Compare] Fetching from IATI:', iatiUrl);
      
      const headers: HeadersInit = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      
      // Add API key if configured
      if (IATI_API_KEY) {
        headers['Ocp-Apim-Subscription-Key'] = IATI_API_KEY;
      }
      
      const iatiResponse = await fetch(iatiUrl, {
        method: 'GET',
        headers,
        next: { revalidate: 3600 } // Cache for 1 hour
      });
      
      if (!iatiResponse.ok) {
        throw new Error(`IATI API returned ${iatiResponse.status}: ${iatiResponse.statusText}`);
      }
      
      const iatiResult = await iatiResponse.json();
      
      // Extract the activity data from the search results
      // The IATI datastore returns results in an array
      const activities = iatiResult.results || iatiResult.iati_activities || [];
      const iatiActivity = activities.length > 0 ? activities[0] : null;
      
      if (iatiActivity) {
        // Normalize IATI data
        iatiData = {
          iati_identifier: iatiActivity.iati_identifier || iatiIdentifier,
          title_narrative: extractNarrative(iatiActivity.title),
          description_narrative: extractNarrative(iatiActivity.description?.find((d: any) => d.type === '1' || d['@_type'] === '1')),
          activity_status: iatiActivity.activity_status || iatiActivity['activity-status']?.['@_code'] || '',
          activity_date_start_planned: extractActivityDate(iatiActivity.activity_date || iatiActivity['activity-date'], 'start-planned'),
          activity_date_start_actual: extractActivityDate(iatiActivity.activity_date || iatiActivity['activity-date'], 'start-actual'),
          activity_date_end_planned: extractActivityDate(iatiActivity.activity_date || iatiActivity['activity-date'], 'end-planned'),
          activity_date_end_actual: extractActivityDate(iatiActivity.activity_date || iatiActivity['activity-date'], 'end-actual'),
          sectors: normalizeSectors(iatiActivity.sector || iatiActivity.sectors),
          recipient_country: iatiActivity.recipient_country?.[0]?.code || iatiActivity['recipient-country']?.['@_code'] || '',
          participating_orgs: normalizeParticipatingOrgs(iatiActivity.participating_org || iatiActivity['participating-org']),
          transactions: normalizeTransactions(iatiActivity.transaction || iatiActivity.transactions),
          default_aid_type: iatiActivity.default_aid_type || iatiActivity['default-aid-type']?.['@_code'] || '',
          flow_type: iatiActivity.default_flow_type || iatiActivity['default-flow-type']?.['@_code'] || '',
          collaboration_type: iatiActivity.collaboration_type || iatiActivity['collaboration-type']?.['@_code'] || '',
          default_finance_type: iatiActivity.default_finance_type || iatiActivity['default-finance-type']?.['@_code'] || ''
        };
      } else {
        throw new Error('No activity found with the given IATI identifier');
      }
    } catch (error) {
      console.error('[IATI Compare] Error fetching from IATI:', error);
      iatiError = error instanceof Error ? error.message : 'Failed to fetch from IATI Datastore';
    }
    
    // Prepare comparison response
    const response = {
      success: true,
      activity_id: activityId,
      iati_identifier: iatiIdentifier,
      your_data: localData,
      iati_data: iatiData,
      comparison: {
        has_iati_data: !!iatiData,
        iati_error: iatiError,
        differences: iatiData ? compareData(localData, iatiData) : null,
        last_compared: new Date().toISOString()
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[IATI Compare] Error:', error);
    return NextResponse.json(
      { error: 'Failed to compare with IATI', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to compare data and identify differences
function compareData(local: any, iati: any): Record<string, any> {
  const differences: Record<string, any> = {};
  
  // Compare simple fields
  const fieldsToCompare = [
    'title_narrative',
    'description_narrative',
    'activity_status',
    'activity_date_start_planned',
    'activity_date_start_actual',
    'activity_date_end_planned',
    'activity_date_end_actual',
    'default_aid_type',
    'flow_type',
    'collaboration_type',
    'default_finance_type'
  ];
  
  fieldsToCompare.forEach(field => {
    if (local[field] !== iati[field]) {
      differences[field] = {
        local: local[field],
        iati: iati[field],
        isDifferent: true
      };
    }
  });
  
  // Compare arrays (simplified comparison)
  if (local.sectors?.length !== iati.sectors?.length) {
    differences.sectors = {
      local_count: local.sectors?.length || 0,
      iati_count: iati.sectors?.length || 0,
      isDifferent: true
    };
  }
  
  if (local.participating_orgs?.length !== iati.participating_orgs?.length) {
    differences.participating_orgs = {
      local_count: local.participating_orgs?.length || 0,
      iati_count: iati.participating_orgs?.length || 0,
      isDifferent: true
    };
  }
  
  if (local.transactions?.length !== iati.transactions?.length) {
    differences.transactions = {
      local_count: local.transactions?.length || 0,
      iati_count: iati.transactions?.length || 0,
      isDifferent: true
    };
  }
  
  return differences;
} 



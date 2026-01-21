import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// IATI Datastore configuration
const IATI_API_BASE_URL = process.env.IATI_API_BASE_URL || 'https://api.iatistandard.org/datastore';
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
  
  const date = activityDates.find(d => d['@_type'] === dateTypeMap[dateType] || d.type === dateTypeMap[dateType]);
  return date?.['@_iso-date'] || date?.['iso-date'] || null;
}

// Helper function to normalize sectors
function normalizeSectors(sectors: any): any[] {
  if (!sectors) return [];
  const sectorArray = Array.isArray(sectors) ? sectors : [sectors];
  
  return sectorArray.map(sector => ({
    code: sector.code || sector['@_code'] || '',
    vocabulary: sector.vocabulary || sector['@_vocabulary'] || '1',
    percentage: parseFloat(sector.percentage || sector['@_percentage'] || '0'),
    name: extractNarrative(sector.narrative || sector)
  }));
}

// Helper function to normalize participating organizations
function normalizeParticipatingOrgs(participatingOrgs: any): any[] {
  if (!participatingOrgs) return [];
  const orgs = Array.isArray(participatingOrgs) ? participatingOrgs : [participatingOrgs];
  
  return orgs.map(org => ({
    ref: org.ref || org['@_ref'] || '',
    name: extractNarrative(org.narrative || org),
    role: org.role || org['@_role'] || '',
    type: org.type || org['@_type'] || '',
    roleLabel: getOrgRoleLabel(org.role || org['@_role'])
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

// Helper function to normalize transactions
function normalizeTransactions(transactions: any): any[] {
  if (!transactions) return [];
  const transArray = Array.isArray(transactions) ? transactions : [transactions];
  
  return transArray.map(transaction => ({
    type: transaction.transaction_type?.code || transaction['transaction-type']?.['@_code'] || '',
    date: transaction.transaction_date?.['iso-date'] || transaction['transaction-date']?.['@_iso-date'] || '',
    value: parseFloat(transaction.value?.['#text'] || transaction.value || '0'),
    currency: transaction.value?.currency || transaction.value?.['@_currency'] || 'USD',
    valueDate: transaction.value?.['value-date'] || transaction.value?.['@_value-date'] || '',
    description: extractNarrative(transaction.description),
    providerOrg: {
      ref: transaction.provider_org?.ref || transaction['provider-org']?.['@_ref'] || '',
      name: extractNarrative(transaction.provider_org || transaction['provider-org'])
    },
    receiverOrg: {
      ref: transaction.receiver_org?.ref || transaction['receiver-org']?.['@_ref'] || '',
      name: extractNarrative(transaction.receiver_org || transaction['receiver-org'])
    },
    aidType: transaction.aid_type?.code || transaction['aid-type']?.['@_code'] || '',
    financeType: transaction.finance_type?.code || transaction['finance-type']?.['@_code'] || '',
    tiedStatus: transaction.tied_status?.code || transaction['tied-status']?.['@_code'] || '',
    flowType: transaction.flow_type?.code || transaction['flow-type']?.['@_code'] || '',
    disbursementChannel: transaction.disbursement_channel?.code || transaction['disbursement-channel']?.['@_code'] || ''
  }));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: activityId } = await params;
    const body: CompareRequest = await request.json();
    
    console.log('[IATI Compare Simple] Starting comparison for activity:', activityId);
    
    // Fetch activity from database - simplified query
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('*')
      .eq('id', activityId)
      .single();
    
    if (activityError || !activity) {
      console.error('[IATI Compare Simple] Activity not found:', activityError);
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }
    
    // Fetch sectors separately
    const { data: sectors } = await supabase
      .from('activity_sectors')
      .select('*')
      .eq('activity_id', activityId);
    
    // Fetch contributors separately
    const { data: contributors } = await supabase
      .from('activity_contributors')
      .select(`
        *,
        organizations:organization_id(
          id,
          name,
          iati_org_id,
          type
        )
      `)
      .eq('activity_id', activityId);
    
    // Use provided IATI identifier or the one from the activity (trim whitespace)
    const iatiIdentifier = (body.iati_identifier || activity.iati_id || '').trim();
    
    if (!iatiIdentifier) {
      return NextResponse.json(
        { error: 'No IATI identifier found for this activity' },
        { status: 400 }
      );
    }
    
    // Extract IATI identifier from URL if it's a d-portal link
    let cleanIatiIdentifier = iatiIdentifier;
    
    // Check if it's a d-portal URL and extract the actual IATI ID
    if (iatiIdentifier.includes('d-portal.org')) {
      const match = iatiIdentifier.match(/aid=([^&]+)/);
      if (match && match[1]) {
        cleanIatiIdentifier = match[1];
        console.log('[IATI Compare Simple] Extracted IATI ID from d-portal URL:', cleanIatiIdentifier);
      }
    }
    
    console.log('[IATI Compare Simple] Using IATI identifier:', cleanIatiIdentifier);
    
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
      sectors: sectors?.map((s: any) => ({
        code: s.sector_code || '',
        name: s.sector_name || '',
        percentage: s.sector_percentage || 0,
        vocabulary: 'DAC'
      })) || [],
      participating_orgs: contributors?.map((c: any) => ({
        ref: c.organizations?.iati_org_id || '',
        name: c.organizations?.name || '',
        type: c.organizations?.type || '',
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
      transactions: []
    };
    
    // Fetch transactions for this activity
    const { data: transactions } = await supabase
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
    
    // Check if we should use demo mode (no API key configured or empty)
    const isDemoMode = !IATI_API_KEY || IATI_API_KEY.trim() === '';
    
    if (isDemoMode) {
      console.log('[IATI Compare Simple] Running in DEMO MODE - no API key configured');
      
      // Return demo IATI data for demonstration purposes
      iatiData = {
        iati_identifier: cleanIatiIdentifier,
        title_narrative: 'IATI Activity Title (Demo Data)',
        description_narrative: 'This is demo IATI data shown because no IATI API key is configured. In production, this would show real data from the IATI Datastore.',
        activity_status: '2', // Implementation
        activity_date_start_planned: '2023-01-01',
        activity_date_start_actual: '2023-02-15',
        activity_date_end_planned: '2025-12-31',
        activity_date_end_actual: null,
        participating_org: [
          {
            narrative: 'Demo Funding Organization',
            role: '1', // Funding
            type: '10' // Government
          },
          {
            narrative: 'Demo Implementing Organization',
            role: '4', // Implementing
            type: '22' // National NGO
          }
        ],
        sector: [
          {
            code: '11220',
            narrative: 'Primary education',
            percentage: 60
          },
          {
            code: '12261',
            narrative: 'Health education',
            percentage: 40
          }
        ],
        recipient_country: {
          code: 'MM',
          narrative: 'Myanmar'
        },
        transactions: [
          {
            transaction_type: '2', // Commitment
            value: 1000000,
            currency: 'USD',
            transaction_date: '2023-01-15',
            provider_org: 'Demo Funding Organization',
            receiver_org: 'Demo Implementing Organization'
          },
          {
            transaction_type: '3', // Disbursement
            value: 500000,
            currency: 'USD',
            transaction_date: '2023-06-01',
            provider_org: 'Demo Funding Organization',
            receiver_org: 'Demo Implementing Organization'
          }
        ],
        policy_marker: [
          {
            code: '1', // Gender
            significance: '2' // Principal objective
          },
          {
            code: '2', // Environment
            significance: '1' // Significant objective
          }
        ],
        tag: [
          {
            code: 'SDG-4',
            narrative: 'Quality Education'
          },
          {
            code: 'SDG-3',
            narrative: 'Good Health and Well-being'
          }
        ],
        default_finance_type: '110', // Standard grant
        default_tied_status: '3', // Untied
        collaboration_type: '1', // Bilateral
        default_flow_type: '10' // ODA
      };
      
      iatiError = 'Running in demo mode - no IATI API key configured. To use real IATI data, please configure IATI_API_KEY in your environment variables.';
    } else {
      try {
        // Use the correct IATI datastore API endpoint with proper query format
        const iatiUrl = `${IATI_API_BASE_URL}/activity/select?q=iati_identifier:"${encodeURIComponent(cleanIatiIdentifier)}"&wt=json&rows=1`;
        console.log('[IATI Compare Simple] Fetching from IATI:', iatiUrl);
        
        const headers: HeadersInit = {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': IATI_API_KEY
        };
        
        const iatiResponse = await fetch(iatiUrl, {
          method: 'GET',
          headers,
          next: { revalidate: 3600 } // Cache for 1 hour
        });
        
        if (!iatiResponse.ok) {
          const responseText = await iatiResponse.text();
          console.error('[IATI Compare Simple] IATI API error response:', responseText.substring(0, 200));
          
          // Check if it's an authentication error
          if (iatiResponse.status === 401 || iatiResponse.status === 403) {
            throw new Error('IATI API authentication failed. Please provide a valid API key.');
          }
          
          throw new Error(`IATI API returned ${iatiResponse.status}: ${iatiResponse.statusText}`);
        }
        
        const contentType = iatiResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const responseText = await iatiResponse.text();
          console.error('[IATI Compare Simple] Unexpected content type:', contentType);
          console.error('[IATI Compare Simple] Response preview:', responseText.substring(0, 200));
          
          // Check if it's an HTML error page
          if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
            // Check if it's likely an authentication issue
            if (responseText.includes('401') || responseText.includes('403') || responseText.includes('Unauthorized') || responseText.includes('subscription')) {
              throw new Error('IATI API requires authentication. Please configure IATI_API_KEY in your environment variables.');
            }
            throw new Error('IATI API returned an HTML error page. This usually means authentication is required or the API endpoint is incorrect.');
          }
          
          throw new Error('IATI API returned non-JSON response.');
        }
        
        const iatiResult = await iatiResponse.json();
        console.log('[IATI Compare Simple] IATI API response structure:', Object.keys(iatiResult));
        
        // Extract the activity data from the SOLR response format
        const activities = iatiResult.response?.docs || [];
        
        if (activities.length === 0) {
          throw new Error(`No activity found with IATI identifier: ${cleanIatiIdentifier}`);
        }
        
        const iatiActivity = activities[0];
        console.log('[IATI Compare Simple] Found activity:', iatiActivity.iati_identifier);
        
        // Normalize IATI data from SOLR format
        iatiData = {
          iati_identifier: iatiActivity.iati_identifier || cleanIatiIdentifier,
          title_narrative: iatiActivity.title_narrative || iatiActivity.title_narrative_text || '',
          description_narrative: iatiActivity.description_narrative || iatiActivity.description_narrative_text || '',
          activity_status: iatiActivity.activity_status_code || '',
          activity_date_start_planned: iatiActivity.activity_date_start_planned || null,
          activity_date_start_actual: iatiActivity.activity_date_start_actual || null,
          activity_date_end_planned: iatiActivity.activity_date_end_planned || null,
          activity_date_end_actual: iatiActivity.activity_date_end_actual || null,
          sectors: parseSolrSectors(iatiActivity),
          participating_orgs: parseSolrParticipatingOrgs(iatiActivity),
          transactions: [], // Transactions would need a separate API call
          default_aid_type: iatiActivity.default_aid_type_code || '',
          flow_type: iatiActivity.default_flow_type_code || '',
          collaboration_type: iatiActivity.collaboration_type_code || '',
          default_finance_type: iatiActivity.default_finance_type_code || ''
        };
      } catch (error) {
        console.error('[IATI Compare Simple] Error fetching from IATI:', error);
        
        if (error instanceof Error && error.message.includes('authentication')) {
          iatiError = 'IATI API requires authentication. Please configure IATI_API_KEY in your environment variables.';
        } else {
          iatiError = error instanceof Error ? error.message : 'Failed to fetch from IATI Datastore';
        }
        
        // As a fallback, return empty IATI data structure
        iatiData = {
          iati_identifier: cleanIatiIdentifier,
          title_narrative: '',
          description_narrative: '',
          activity_status: '',
          activity_date_start_planned: null,
          activity_date_start_actual: null,
          activity_date_end_planned: null,
          activity_date_end_actual: null,
          sectors: [],
          participating_orgs: [],
          transactions: [],
          default_aid_type: '',
          flow_type: '',
          collaboration_type: '',
          default_finance_type: ''
        };
      }
    }
    
    // Prepare comparison response
    const response = {
      success: true,
      activity_id: activityId,
      iati_identifier: cleanIatiIdentifier,
      your_data: localData,
      iati_data: iatiData,
      comparison: {
        has_iati_data: !!iatiData && !iatiError,
        iati_error: iatiError,
        differences: compareData(localData, iatiData),
        last_compared: new Date().toISOString()
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[IATI Compare Simple] Error:', error);
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
  
  // Compare arrays
  differences.sectors = {
    local_count: local.sectors?.length || 0,
    iati_count: iati.sectors?.length || 0,
    isDifferent: (local.sectors?.length || 0) !== (iati.sectors?.length || 0)
  };
  
  differences.participating_orgs = {
    local_count: local.participating_orgs?.length || 0,
    iati_count: iati.participating_orgs?.length || 0,
    isDifferent: (local.participating_orgs?.length || 0) !== (iati.participating_orgs?.length || 0)
  };
  
  differences.transactions = {
    local_count: local.transactions?.length || 0,
    iati_count: iati.transactions?.length || 0,
    isDifferent: (local.transactions?.length || 0) !== (iati.transactions?.length || 0)
  };
  
  return differences;
}

// Add helper functions for parsing SOLR data
function parseSolrSectors(activity: any): any[] {
  const sectors: any[] = [];
  
  // Check for sector codes and names in various formats
  if (activity.sector_code) {
    const codes = Array.isArray(activity.sector_code) ? activity.sector_code : [activity.sector_code];
    const names = Array.isArray(activity.sector_narrative) ? activity.sector_narrative : [activity.sector_narrative || ''];
    const percentages = Array.isArray(activity.sector_percentage) ? activity.sector_percentage : [activity.sector_percentage || 100];
    
    codes.forEach((code: string, index: number) => {
      sectors.push({
        code: code,
        name: names[index] || '',
        percentage: percentages[index] || 0,
        vocabulary: 'DAC'
      });
    });
  }
  
  return sectors;
}

function parseSolrParticipatingOrgs(activity: any): any[] {
  const orgs: any[] = [];
  
  // Check for participating org data in various formats
  if (activity.participating_org_ref) {
    const refs = Array.isArray(activity.participating_org_ref) ? activity.participating_org_ref : [activity.participating_org_ref];
    const names = Array.isArray(activity.participating_org_narrative) ? activity.participating_org_narrative : [activity.participating_org_narrative || ''];
    const roles = Array.isArray(activity.participating_org_role) ? activity.participating_org_role : [activity.participating_org_role || ''];
    const types = Array.isArray(activity.participating_org_type) ? activity.participating_org_type : [activity.participating_org_type || ''];
    
    refs.forEach((ref: string, index: number) => {
      orgs.push({
        ref: ref || '',
        name: names[index] || '',
        role: roles[index] || '',
        type: types[index] || '',
        roleLabel: getOrgRoleLabel(roles[index] || '')
      });
    });
  }
  
  return orgs;
} 
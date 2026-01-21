import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { requireAuth } from '@/lib/auth';

// Force dynamic rendering - critical for production
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for parsing large IATI files

interface ParsedLocation {
  ref?: string;
  locationReach?: string;
  locationId?: {
    vocabulary?: string;
    code?: string;
  };
  name?: string;
  description?: string;
  activityDescription?: string;
  administrative?: {
    vocabulary?: string;
    level?: string;
    code?: string;
  };
  point?: {
    srsName?: string;
    pos?: string;
  };
  exactness?: string;
  locationClass?: string;
  featureDesignation?: string;
}

interface ParsedActivity {
  iatiIdentifier: string;
  iati_id: string;
  title: string;
  description?: string;
  status?: string;
  activity_status?: string;
  startDate?: string;
  planned_start_date?: string;
  actual_start_date?: string;
  endDate?: string;
  planned_end_date?: string;
  actual_end_date?: string;
  transactions: ParsedTransaction[];
  locations?: ParsedLocation[];
  financingTerms?: {
    loanTerms?: {
      rate_1?: number;
      rate_2?: number;
      repayment_type_code?: string;
      repayment_plan_code?: string;
      commitment_date?: string;
      repayment_first_date?: string;
      repayment_final_date?: string;
    };
    other_flags?: Array<{ code: string; significance: string }>;
    loanStatuses?: Array<{
      year: number;
      currency: string;
      value_date?: string;
      interest_received?: number;
      principal_outstanding?: number;
      principal_arrears?: number;
      interest_arrears?: number;
    }>;
    channel_code?: string;
  };
}

interface ParsedTransaction {
  type: string;
  transaction_type: string;
  date: string;
  transaction_date: string;
  value: number;
  currency?: string;
  description?: string;
  providerOrg?: string;
  providerOrgRef?: string;
  providerOrgType?: string;
  receiverOrg?: string;
  receiverOrgRef?: string;
  receiverOrgType?: string;
  aidType?: string;
  flowType?: string;
  financeType?: string;
  tiedStatus?: string;
  disbursementChannel?: string;
  sectorCode?: string;
  recipientCountryCode?: string;
  isHumanitarian?: boolean;
  activityRef?: string;
  activity_id?: string;  // Internal UUID if found
  _needsActivityAssignment?: boolean;  // Flag for UI
  provider_org_name?: string;
  provider_org_ref?: string;
  provider_org_type?: string;
  receiver_org_name?: string;
  receiver_org_ref?: string;
  receiver_org_type?: string;
  aid_type?: string;
  flow_type?: string;
  finance_type?: string;
  tied_status?: string;
  disbursement_channel?: string;
  sector_code?: string;
  recipient_country_code?: string;
  is_humanitarian?: boolean;
}

interface ValidationIssue {
  type: 'missing_currency' | 'missing_activity' | 'unmapped_code' | 'missing_org' | 'missing_required' | 'invalid_value';
  severity: 'error' | 'warning';
  count: number;
  details: {
    activityId?: string;
    transactionIndex?: number;
    field?: string;
    value?: any;
    message: string;
    codeType?: string; // For unmapped codes
  }[];
}

interface ParseResult {
  success: boolean;
  activities: ParsedActivity[];
  transactions: ParsedTransaction[];
  validationIssues: ValidationIssue[];
  summary: {
    totalActivities: number;
    totalTransactions: number;
    validTransactions: number;
    invalidTransactions: number;
    transactionsNeedingAssignment: number;
    unmappedCodesCount: number;
  };
  existingActivities?: Array<{
    id: string;
    iati_id: string;
    title: string;
  }>;
  unmappedCodes?: {
    [codeType: string]: Set<string>;
  };
}

// Helper to ensure array
function ensureArray(item: any): any[] {
  return Array.isArray(item) ? item : [item];
}

// Extract narrative text
function extractNarrative(node: any): string | undefined {
  if (!node) return undefined;
  
  if (typeof node === 'string') return node;
  
  const narrative = node.narrative;
  if (narrative) {
    if (typeof narrative === 'string') return narrative;
    if (narrative['#text']) return narrative['#text'];
    if (Array.isArray(narrative) && narrative[0]) {
      return narrative[0]['#text'] || narrative[0];
    }
  }
  
  return node['#text'] || undefined;
}

// Extract IATI identifier
function extractIatiIdentifier(activity: any): string {
  const identifier = activity['iati-identifier'];
  if (typeof identifier === 'string') return identifier;
  if (identifier?.['#text']) return identifier['#text'];
  return 'unknown-' + Math.random().toString(36).substr(2, 9);
}

// Parse value
function parseValue(raw: any): number | null {
  if (raw === null || raw === undefined) return null;
  
  const cleaned = String(raw)
    .replace(/[$,]/g, '')
    .replace(/\s/g, '')
    .trim();

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

// Parse date
function parseDate(raw: any): string | null {
  if (!raw) return null;

  const dateStr = String(raw);
  
  // Try ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Try DD-MM-YYYY or DD/MM/YYYY
  const altMatch = dateStr.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
  if (altMatch) {
    return `${altMatch[3]}-${altMatch[2]}-${altMatch[1]}`;
  }

  // Try to parse with Date object
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

export async function POST(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { xmlContent } = await request.json();

    if (!xmlContent) {
      return NextResponse.json(
        { error: 'No XML content provided' },
        { status: 400 }
      );
    }

    // Check if XML content is just the declaration or empty
    const trimmedContent = xmlContent.trim();
    if (!trimmedContent || trimmedContent === '<?xml version="1.0" encoding="UTF-8"?>') {
      return NextResponse.json(
        { error: 'XML file is empty. Please provide a valid IATI activities file with content.' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      trimValues: true
    });

    let parsed;
    try {
      parsed = parser.parse(xmlContent);
    } catch (parseError) {
      return NextResponse.json(
        { 
          error: 'Invalid XML format',
          details: parseError instanceof Error ? parseError.message : 'Failed to parse XML structure'
        },
        { status: 400 }
      );
    }

    // Check for root element
    if (!parsed['iati-activities']) {
      return NextResponse.json(
        { 
          error: 'Invalid IATI XML structure',
          details: 'Missing required <iati-activities> root element. Please ensure your XML file follows the IATI standard format.'
        },
        { status: 400 }
      );
    }

    // Check if there are any activities
    const iatiActivities = parsed['iati-activities'];
    if (!iatiActivities['iati-activity']) {
      return NextResponse.json(
        { 
          error: 'No activities found',
          details: 'The XML file contains no <iati-activity> elements. Please ensure your file contains at least one activity.'
        },
        { status: 400 }
      );
    }

    const xmlActivities = ensureArray(iatiActivities['iati-activity']);

    // Initialize result
    const result: ParseResult = {
      success: true,
      activities: [],
      transactions: [],
      validationIssues: [],
      summary: {
        totalActivities: 0,
        totalTransactions: 0,
        validTransactions: 0,
        invalidTransactions: 0,
        transactionsNeedingAssignment: 0,
        unmappedCodesCount: 0
      },
      unmappedCodes: {}
    };

    // Track validation issues
    const issuesMap = new Map<string, ValidationIssue>();

    // STEP 1: Buffer all activities first
    const xmlActivityMap = new Map<string, ParsedActivity>();
    const allTransactions: Array<{activity: any, transaction: any, index: number}> = [];
    
    // First pass: Parse all activities and build the activity map
    for (const xmlActivity of xmlActivities) {
      const iatiIdentifier = extractIatiIdentifier(xmlActivity);
      
      // Parse activity
      const activity: ParsedActivity = {
        iatiIdentifier,
        iati_id: iatiIdentifier,
        title: extractNarrative(xmlActivity.title) || `Activity ${iatiIdentifier}`,
        description: extractNarrative(xmlActivity.description),
        status: xmlActivity['activity-status']?.['@_code'],
        activity_status: xmlActivity['activity-status']?.['@_code'],
        startDate: xmlActivity['activity-date']?.find((d: any) => d['@_type'] === '1')?.['@_iso-date'],
        planned_start_date: xmlActivity['activity-date']?.find((d: any) => d['@_type'] === '1')?.['@_iso-date'],
        actual_start_date: xmlActivity['activity-date']?.find((d: any) => d['@_type'] === '2')?.['@_iso-date'],
        endDate: xmlActivity['activity-date']?.find((d: any) => d['@_type'] === '3')?.['@_iso-date'],
        planned_end_date: xmlActivity['activity-date']?.find((d: any) => d['@_type'] === '3')?.['@_iso-date'],
        actual_end_date: xmlActivity['activity-date']?.find((d: any) => d['@_type'] === '4')?.['@_iso-date'],
        transactions: []
      };

      // Parse locations
      const xmlLocations = xmlActivity.location ? ensureArray(xmlActivity.location) : [];
      if (xmlLocations.length > 0) {
        activity.locations = xmlLocations.map((loc: any) => {
          const location: ParsedLocation = {
            ref: loc['@_ref'],
            name: extractNarrative(loc.name),
            description: extractNarrative(loc.description),
            activityDescription: extractNarrative(loc['activity-description']),
            locationReach: loc['location-reach']?.['@_code'],
            exactness: loc['exactness']?.['@_code'],
            locationClass: loc['location-class']?.['@_code'],
            featureDesignation: loc['feature-designation']?.['@_code'],
          };
          
          // Location ID (gazetteer reference)
          if (loc['location-id']) {
            location.locationId = {
              vocabulary: loc['location-id']['@_vocabulary'],
              code: loc['location-id']['@_code']
            };
          }
          
          // Administrative divisions
          if (loc['administrative']) {
            location.administrative = {
              vocabulary: loc['administrative']['@_vocabulary'],
              level: loc['administrative']['@_level'],
              code: loc['administrative']['@_code']
            };
          }
          
          // Point coordinates
          if (loc['point'] && loc['point']['pos']) {
            location.point = {
              srsName: loc['point']['@_srsName'] || 'http://www.opengis.net/def/crs/EPSG/0/4326',
              pos: loc['point']['pos']['#text'] || loc['point']['pos']
            };
          }
          
          return location;
        });
      }

      // Parse CRS-add financing terms
      if (xmlActivity['crs-add']) {
        const crsAdd = xmlActivity['crs-add'];
        activity.financingTerms = {};

        // Parse loan terms
        if (crsAdd['loan-terms']) {
          const loanTerms = crsAdd['loan-terms'];
          activity.financingTerms.loanTerms = {
            rate_1: loanTerms['@_rate-1'] ? parseFloat(loanTerms['@_rate-1']) : undefined,
            rate_2: loanTerms['@_rate-2'] ? parseFloat(loanTerms['@_rate-2']) : undefined,
            repayment_type_code: loanTerms['repayment-type']?.['@_code'],
            repayment_plan_code: loanTerms['repayment-plan']?.['@_code'],
            commitment_date: loanTerms['commitment-date']?.['@_iso-date'],
            repayment_first_date: loanTerms['repayment-first-date']?.['@_iso-date'],
            repayment_final_date: loanTerms['repayment-final-date']?.['@_iso-date']
          };
        }

        // Parse other-flags (OECD CRS flags)
        if (crsAdd['other-flags']) {
          const flags = ensureArray(crsAdd['other-flags']);
          activity.financingTerms.other_flags = flags.map((flag: any) => ({
            code: flag['@_code'] || '',
            significance: flag['@_significance'] || '1'
          }));
        }

        // Parse loan-status (yearly entries)
        if (crsAdd['loan-status']) {
          const statuses = ensureArray(crsAdd['loan-status']);
          activity.financingTerms.loanStatuses = statuses.map((status: any) => ({
            year: parseInt(status['@_year']),
            currency: status['@_currency'] || 'USD',
            value_date: status['@_value-date'],
            interest_received: status['interest-received'] ? parseFloat(status['interest-received']) : undefined,
            principal_outstanding: status['principal-outstanding'] ? parseFloat(status['principal-outstanding']) : undefined,
            principal_arrears: status['principal-arrears'] ? parseFloat(status['principal-arrears']) : undefined,
            interest_arrears: status['interest-arrears'] ? parseFloat(status['interest-arrears']) : undefined
          })).filter((s: any) => !isNaN(s.year));
        }

        // Parse channel-code (for reference)
        if (crsAdd['channel-code']) {
          activity.financingTerms.channel_code = crsAdd['channel-code']['#text'] || crsAdd['channel-code'];
        }
      }
      
      xmlActivityMap.set(iatiIdentifier, activity);
      result.activities.push(activity);
      result.summary.totalActivities++;
      
      // Collect transactions for second pass
      const transactions = ensureArray(xmlActivity.transaction || []);
      transactions.forEach((tx, idx) => {
        allTransactions.push({ activity: xmlActivity, transaction: tx, index: idx });
      });
    }
    
    // Get all activity IDs that will be needed
    const allActivityIds = Array.from(xmlActivityMap.keys());
    
    // Check which activities exist in the database
    const { data: existingActivities } = await supabase
      .from('activities')
      .select('id, iati_id')
      .in('iati_id', allActivityIds);
    
    const dbActivityMap = new Map<string, string>(
      (existingActivities || []).map((a: any) => [a.iati_id, a.id] as [string, string])
    );
    
    // Create a combined map for activity lookup (XML activities + DB activities)
    const activityUuidMap = new Map<string, string>();
    
    // Add existing DB activities
    dbActivityMap.forEach((uuid, iatiId) => {
      activityUuidMap.set(iatiId, uuid);
    });
    
    // For activities in XML but not in DB, we'll generate temporary IDs
    // These will be replaced with real UUIDs during import
    xmlActivityMap.forEach((activity, iatiId) => {
      if (!activityUuidMap.has(iatiId)) {
        // Mark as new activity (will be created during import)
        activityUuidMap.set(iatiId, `new-${iatiId}`);
      }
    });

    // STEP 2: Process all transactions with complete activity context
    for (const { activity: xmlActivity, transaction: xmlTx, index: i } of allTransactions) {
      const iatiIdentifier = extractIatiIdentifier(xmlActivity);
      const activity = xmlActivityMap.get(iatiIdentifier)!;
      
      result.summary.totalTransactions++;

        // Parse transaction
        const tx: ParsedTransaction = {
          type: xmlTx['transaction-type']?.['@_code'] || xmlTx['transaction-type'],
          transaction_type: xmlTx['transaction-type']?.['@_code'] || xmlTx['transaction-type'],
          date: parseDate(xmlTx['transaction-date']?.['@_iso-date'] || xmlTx['transaction-date']) || '',
          transaction_date: parseDate(xmlTx['transaction-date']?.['@_iso-date'] || xmlTx['transaction-date']) || '',
          value: parseValue(xmlTx.value?.['#text'] || xmlTx.value?.['@_value'] || xmlTx.value) || 0,
          currency: xmlTx.value?.['@_currency'] || 'USD',
          description: extractNarrative(xmlTx.description),
          activityRef: iatiIdentifier,
          activity_id: undefined,
          _needsActivityAssignment: false
        };
        
        // Try to link to activity UUID
        const activityUuid = activityUuidMap.get(iatiIdentifier);
        if (activityUuid) {
          // Activity found (either in DB or current XML)
          tx.activity_id = activityUuid;
          tx._needsActivityAssignment = false;
        } else {
          // Activity not found anywhere
          tx.activity_id = undefined;
          tx._needsActivityAssignment = true;
        }

        // Extract organizations
        const providerOrg = xmlTx['provider-org'];
        if (providerOrg) {
          tx.providerOrg = extractNarrative(providerOrg);
          tx.provider_org_name = extractNarrative(providerOrg);
          tx.providerOrgRef = providerOrg['@_ref'];
          tx.provider_org_ref = providerOrg['@_ref'];
          tx.providerOrgType = providerOrg['@_type'];
          tx.provider_org_type = providerOrg['@_type'];
        }

        const receiverOrg = xmlTx['receiver-org'];
        if (receiverOrg) {
          tx.receiverOrg = extractNarrative(receiverOrg);
          tx.receiver_org_name = extractNarrative(receiverOrg);
          tx.receiverOrgRef = receiverOrg['@_ref'];
          tx.receiver_org_ref = receiverOrg['@_ref'];
          tx.receiverOrgType = receiverOrg['@_type'];
          tx.receiver_org_type = receiverOrg['@_type'];
        }

        // Extract classifications
        tx.aidType = xmlTx['aid-type']?.['@_code'];
        tx.aid_type = xmlTx['aid-type']?.['@_code'];
        tx.flowType = xmlTx['flow-type']?.['@_code'];
        tx.flow_type = xmlTx['flow-type']?.['@_code'];
        tx.financeType = xmlTx['finance-type']?.['@_code'];
        tx.finance_type = xmlTx['finance-type']?.['@_code'];
        tx.tiedStatus = xmlTx['tied-status']?.['@_code'];
        tx.tied_status = xmlTx['tied-status']?.['@_code'];
        tx.disbursementChannel = xmlTx['disbursement-channel']?.['@_code'];
        tx.disbursement_channel = xmlTx['disbursement-channel']?.['@_code'];
        tx.sectorCode = xmlTx.sector?.['@_code'];
        tx.sector_code = xmlTx.sector?.['@_code'];
        tx.recipientCountryCode = xmlTx['recipient-country']?.['@_code'];
        tx.recipient_country_code = xmlTx['recipient-country']?.['@_code'];
        tx.isHumanitarian = xmlTx['@_humanitarian'] === true || xmlTx['@_humanitarian'] === '1';
        tx.is_humanitarian = xmlTx['@_humanitarian'] === true || xmlTx['@_humanitarian'] === '1';

        activity.transactions.push(tx);
        result.transactions.push(tx);

        // Validate transaction
        let isValid = true;

        // Check missing currency
        if (!xmlTx.value?.['@_currency']) {
          // Note: We've defaulted to USD, but still flag this for user awareness
          addIssue(issuesMap, {
            type: 'missing_currency',
            severity: 'warning',
            message: 'Transaction is missing currency attribute - defaulted to USD',
            activityId: iatiIdentifier,
            transactionIndex: i,
            field: 'currency'
          });
        }

        // Check missing date
        if (!tx.date) {
          isValid = false;
          addIssue(issuesMap, {
            type: 'missing_required',
            severity: 'error',
            message: 'Transaction is missing required date',
            activityId: iatiIdentifier,
            transactionIndex: i,
            field: 'transaction_date'
          });
        }

        // Check invalid value
        if (!tx.value || tx.value <= 0) {
          isValid = false;
          addIssue(issuesMap, {
            type: 'invalid_value',
            severity: 'error',
            message: 'Transaction has invalid or missing value',
            activityId: iatiIdentifier,
            transactionIndex: i,
            field: 'value',
            value: tx.value
          });
        }

        // Check activity linkage
        if (tx._needsActivityAssignment) {
          // Transaction references an activity not found anywhere
          isValid = false;
          addIssue(issuesMap, {
            type: 'missing_activity',
            severity: 'error',
            message: `Activity "${iatiIdentifier}" not found in database or current import. Manual assignment required.`,
            activityId: iatiIdentifier,
            transactionIndex: i
          });
        }

        // Check unmapped codes comprehensively
        const codeChecks = [
          { field: 'transaction_type', value: tx.type, validator: isValidTransactionType },
          { field: 'flow_type', value: tx.flowType, validator: isValidFlowType },
          { field: 'finance_type', value: tx.financeType, validator: isValidFinanceType },
          { field: 'aid_type', value: tx.aidType, validator: isValidAidType },
          { field: 'tied_status', value: tx.tiedStatus, validator: isValidTiedStatus },
          { field: 'disbursement_channel', value: tx.disbursementChannel, validator: isValidDisbursementChannel },
          { field: 'sector_code', value: tx.sectorCode, validator: isValidSectorCode }
        ];

        codeChecks.forEach(check => {
          if (check.value && !check.validator(check.value)) {
            // Track unmapped code
            if (!result.unmappedCodes![check.field]) {
              result.unmappedCodes![check.field] = new Set();
            }
            result.unmappedCodes![check.field].add(check.value);
            
            // Add validation issue
            addIssue(issuesMap, {
              type: 'unmapped_code',
              severity: 'error', // Changed to error to block import
              message: `${check.field} code "${check.value}" is not recognized in the system`,
              activityId: iatiIdentifier,
              transactionIndex: i,
              field: check.field,
              value: check.value,
              codeType: check.field
            });
            
            isValid = false; // Mark as invalid to prevent import
          }
        });

        // Check missing organizations
        if (!tx.providerOrg && !tx.receiverOrg) {
          addIssue(issuesMap, {
            type: 'missing_org',
            severity: 'warning',
            message: 'Transaction has no provider or receiver organization',
            activityId: iatiIdentifier,
            transactionIndex: i
          });
        }

        if (isValid) {
          result.summary.validTransactions++;
        } else {
          result.summary.invalidTransactions++;
        }
    }

    // Convert issues map to array
    result.validationIssues = Array.from(issuesMap.values());
    
    // Count transactions needing assignment
    result.summary.transactionsNeedingAssignment = result.transactions.filter(
      tx => tx._needsActivityAssignment
    ).length;
    
    // Count unmapped codes
    let unmappedCodesTotal = 0;
    if (result.unmappedCodes) {
      Object.values(result.unmappedCodes).forEach(codeSet => {
        unmappedCodesTotal += codeSet.size;
      });
    }
    result.summary.unmappedCodesCount = unmappedCodesTotal;
    
    // Convert Sets to Arrays for JSON serialization
    if (result.unmappedCodes) {
      const unmappedCodesArray: { [key: string]: string[] } = {};
      Object.entries(result.unmappedCodes).forEach(([codeType, codeSet]) => {
        unmappedCodesArray[codeType] = Array.from(codeSet);
      });
      result.unmappedCodes = unmappedCodesArray as any;
    }
    
    // Fetch all existing activities for the dropdown
    const { data: allActivities } = await supabase
      .from('activities')
      .select('id, iati_identifier, title_narrative')
      .order('title_narrative');
    
    if (allActivities) {
      result.existingActivities = allActivities;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[IATI Parse] Error:', error);
    return NextResponse.json(
      { error: 'Failed to parse XML', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper to add validation issue
function addIssue(
  issuesMap: Map<string, ValidationIssue>,
  detail: {
    type: ValidationIssue['type'];
    severity: ValidationIssue['severity'];
    message: string;
    activityId?: string;
    transactionIndex?: number;
    field?: string;
    value?: any;
    codeType?: string;
  }
) {
  const key = `${detail.type}`;
  
  if (!issuesMap.has(key)) {
    issuesMap.set(key, {
      type: detail.type,
      severity: detail.severity,
      count: 0,
      details: []
    });
  }

  const issue = issuesMap.get(key)!;
  issue.count++;
  issue.details.push({
    activityId: detail.activityId,
    transactionIndex: detail.transactionIndex,
    field: detail.field,
    value: detail.value,
    message: detail.message,
    codeType: detail.codeType
  });
}

// Check if transaction type is valid
function isValidTransactionType(type: string): boolean {
  const validTypes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '12', '13'];
  return validTypes.includes(type);
}

// Check if flow type is valid
function isValidFlowType(type: string): boolean {
  const validTypes = ['10', '13', '14', '15', '19', '20', '21', '22', '30', '35', '36', '37', '40', '50'];
  return validTypes.includes(type);
}

// Check if finance type is valid
function isValidFinanceType(type: string): boolean {
  const validTypes = ['1', '100', '110', '111', '210', '211', '310', '311', '410', '411', '412', '413', '414', '451', '452', '453', '510', '511', '512', '600', '610', '611', '612', '613', '614', '615', '616', '617', '618', '620', '621', '622', '623', '624', '625', '626', '627', '630', '631', '632', '633', '634', '700', '710', '711', '810', '811', '910', '911', '912', '913'];
  return validTypes.includes(type);
}

// Check if aid type is valid
function isValidAidType(type: string): boolean {
  const validTypes = ['A01', 'A02', 'B01', 'B02', 'B03', 'B04', 'C01', 'D01', 'D02', 'E01', 'E02', 'F01', 'G01', 'H01', 'H02', 'H03', 'H04', 'H05'];
  return validTypes.includes(type);
}

// Check if tied status is valid
function isValidTiedStatus(status: string): boolean {
  const validStatuses = ['1', '3', '4', '5'];
  return validStatuses.includes(status);
}

// Check if disbursement channel is valid
function isValidDisbursementChannel(channel: string): boolean {
  const validChannels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];
  return validChannels.includes(channel);
}

// Check if sector code is valid (simplified - in reality this would check against DAC or other vocabularies)
function isValidSectorCode(code: string): boolean {
  // For now, accept any 5-digit code starting with 1-9
  return /^[1-9]\d{4}$/.test(code);
} 
import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Detect what type of IATI snippet this is
function detectSnippetType(xmlContent: string): string {
  const content = xmlContent.trim();
  
  if (content.includes('<transaction')) return 'transaction';
  if (content.includes('<participating-org') || content.includes('<reporting-org')) return 'organization';
  if (content.includes('<location')) return 'location';
  if (content.includes('<sector')) return 'sector';
  if (content.includes('<recipient-country')) return 'recipient-country';
  if (content.includes('<recipient-region')) return 'recipient-region';
  if (content.includes('<policy-marker')) return 'policy-marker';
  if (content.includes('<budget')) return 'budget';
  if (content.includes('<result')) return 'result';
  if (content.includes('<iati-activity')) return 'full-activity';
  
  return 'unknown';
}

// Wrap snippet in proper IATI structure if needed
function wrapSnippet(xmlContent: string, snippetType: string): string {
  const content = xmlContent.trim();
  
  // If it's already a full activity or has root element, return as-is or wrap minimally
  if (content.includes('<iati-activities')) {
    return content;
  }
  
  if (snippetType === 'full-activity' && content.includes('<iati-activity')) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03">
  ${content}
</iati-activities>`;
  }
  
  // Otherwise, wrap in a minimal activity structure
  return `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03">
  <iati-activity>
    <iati-identifier>SNIPPET-${Date.now()}</iati-identifier>
    <title>
      <narrative>Snippet Import</narrative>
    </title>
    ${content}
  </iati-activity>
</iati-activities>`;
}

function ensureArray(value: any): any[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function extractNarrative(element: any): string {
  if (!element) return '';
  if (typeof element === 'string') return element;
  if (element.narrative) {
    const narratives = ensureArray(element.narrative);
    return narratives[0]?.['#text'] || narratives[0] || '';
  }
  if (element['#text']) return element['#text'];
  return '';
}

export async function POST(request: NextRequest) {
  try {
    const { xmlContent } = await request.json();

    if (!xmlContent || !xmlContent.trim()) {
      return NextResponse.json(
        { error: 'No XML content provided' },
        { status: 400 }
      );
    }

    // Detect snippet type
    const snippetType = detectSnippetType(xmlContent);
    console.log('[Snippet Parser] Detected snippet type:', snippetType);

    if (snippetType === 'unknown') {
      return NextResponse.json(
        { 
          error: 'Unknown snippet type',
          details: 'Could not detect IATI elements in the provided XML. Please ensure your snippet contains valid IATI XML elements like <transaction>, <location>, <sector>, etc.',
          snippetType
        },
        { status: 400 }
      );
    }

    // Wrap snippet in proper structure
    const wrappedContent = wrapSnippet(xmlContent, snippetType);
    console.log('[Snippet Parser] Wrapped content length:', wrappedContent.length);

    // Initialize Supabase client
    const supabase = getSupabaseAdmin();

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
      parsed = parser.parse(wrappedContent);
    } catch (parseError) {
      return NextResponse.json(
        { 
          error: 'Invalid XML format',
          details: parseError instanceof Error ? parseError.message : 'Failed to parse XML structure. Please check your XML syntax.',
          snippetType
        },
        { status: 400 }
      );
    }

    // Initialize result
    const result = {
      activities: [] as any[],
      organizations: [] as any[],
      transactions: [] as any[],
      locations: [] as any[],
      sectors: [] as any[],
      recipientCountries: [] as any[],
      recipientRegions: [] as any[],
      policyMarkers: [] as any[],
      budgets: [] as any[],
      snippetType,
      message: `Successfully parsed ${snippetType} snippet`
    };

    // Check for root element
    if (!parsed['iati-activities']) {
      return NextResponse.json(
        { 
          error: 'Invalid IATI XML structure',
          details: 'Could not parse as IATI XML. Please ensure your snippet contains valid IATI XML elements.',
          snippetType
        },
        { status: 400 }
      );
    }

    const iatiActivities = parsed['iati-activities'];
    const xmlActivities = ensureArray(iatiActivities['iati-activity']);

    // Process the activity (which might just be a wrapper)
    for (const xmlActivity of xmlActivities) {
      // Extract transactions
      const xmlTransactions = ensureArray(xmlActivity.transaction);
      for (const xmlTx of xmlTransactions) {
        if (!xmlTx || Object.keys(xmlTx).length === 0) continue;

        const tx: any = {
          type: xmlTx['transaction-type']?.['@_code'] || '',
          transaction_type: xmlTx['transaction-type']?.['@_code'] || '',
          date: xmlTx['transaction-date']?.['@_iso-date'] || '',
          transaction_date: xmlTx['transaction-date']?.['@_iso-date'] || '',
          value: parseFloat(xmlTx.value?.['#text'] || xmlTx.value || '0'),
          currency: xmlTx.value?.['@_currency'] || 'USD',
          description: extractNarrative(xmlTx.description),
        };

        // Provider/receiver orgs
        if (xmlTx['provider-org']) {
          tx.providerOrg = extractNarrative(xmlTx['provider-org']);
          tx.provider_org_name = extractNarrative(xmlTx['provider-org']);
          tx.providerOrgRef = xmlTx['provider-org']['@_ref'];
          tx.provider_org_ref = xmlTx['provider-org']['@_ref'];
          tx.providerOrgType = xmlTx['provider-org']['@_type'];
          tx.provider_org_type = xmlTx['provider-org']['@_type'];
        }

        if (xmlTx['receiver-org']) {
          tx.receiverOrg = extractNarrative(xmlTx['receiver-org']);
          tx.receiver_org_name = extractNarrative(xmlTx['receiver-org']);
          tx.receiverOrgRef = xmlTx['receiver-org']['@_ref'];
          tx.receiver_org_ref = xmlTx['receiver-org']['@_ref'];
          tx.receiverOrgType = xmlTx['receiver-org']['@_type'];
          tx.receiver_org_type = xmlTx['receiver-org']['@_type'];
        }

        // Classifications
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

        result.transactions.push(tx);
      }

      // Extract organizations
      const participatingOrgs = ensureArray(xmlActivity['participating-org']);
      for (const xmlOrg of participatingOrgs) {
        if (!xmlOrg || Object.keys(xmlOrg).length === 0) continue;
        
        // Extract all narratives with language codes
        const narrativesArray = ensureArray(xmlOrg.narrative);
        console.log('[Snippet Parser] Raw narratives for org:', xmlOrg['@_ref'], narrativesArray);
        
        const narratives: Array<{ lang: string; text: string }> = [];
        let primaryNarrative = '';
        let narrativeLang = 'en';
        
        for (const narrative of narrativesArray) {
          if (!narrative) continue;
          
          console.log('[Snippet Parser] Processing narrative:', narrative, 'Type:', typeof narrative);
          
          const text = typeof narrative === 'string' 
            ? narrative 
            : (narrative['#text'] || '');
          const lang = typeof narrative === 'object' 
            ? (narrative['@_xml:lang'] || narrative['@_lang'] || '') 
            : '';
          
          console.log('[Snippet Parser] Extracted - text:', text, 'lang:', lang);
          
          if (text) {
            if (lang && lang !== 'en') {
              // Add to multilingual narratives array
              narratives.push({ lang, text });
              console.log('[Snippet Parser] Added to multilingual:', { lang, text });
            } else if (!primaryNarrative) {
              // First narrative without lang or with 'en' becomes primary
              primaryNarrative = text;
              narrativeLang = lang || 'en';
              console.log('[Snippet Parser] Set as primary:', text);
            }
          }
        }
        
        // If no primary narrative found, use the first one
        if (!primaryNarrative && narrativesArray.length > 0) {
          const first = narrativesArray[0];
          primaryNarrative = typeof first === 'string' ? first : (first['#text'] || '');
        }
        
        console.log('[Snippet Parser] Final narratives array:', narratives);
        console.log('[Snippet Parser] Primary narrative:', primaryNarrative);
        
        result.organizations.push({
          ref: xmlOrg['@_ref'] || '',
          narrative: primaryNarrative, // Primary narrative (English or first)
          narrativeLang: narrativeLang,
          narratives: narratives.length > 0 ? narratives : undefined, // Additional multilingual narratives
          role: xmlOrg['@_role'] || '',
          type: xmlOrg['@_type'] || '',
          activityId: xmlOrg['@_activity-id'] || '', // Add missing activity-id
          crsChannelCode: xmlOrg['@_crs-channel-code'] || '' // Add missing crs-channel-code
        });
      }

      if (xmlActivity['reporting-org']) {
        result.organizations.push({
          ref: xmlActivity['reporting-org']['@_ref'] || '',
          narrative: extractNarrative(xmlActivity['reporting-org']), // Use 'narrative' for consistency
          role: 'reporting',
          type: xmlActivity['reporting-org']['@_type'] || '',
          activityId: '', // Reporting org doesn't have activity-id
          crsChannelCode: '' // Reporting org doesn't have crs-channel-code
        });
      }

      // Extract locations
      const locations = ensureArray(xmlActivity.location);
      for (const loc of locations) {
        if (!loc || Object.keys(loc).length === 0) continue;
        
        const locationData: any = {
          ref: loc['@_ref'],
          name: extractNarrative(loc.name),
          description: extractNarrative(loc.description),
          locationReach: loc['location-reach']?.['@_code'],
          exactness: loc.exactness?.['@_code'],
          locationClass: loc['location-class']?.['@_code'],
          featureDesignation: loc['feature-designation']?.['@_code']
        };

        // Point coordinates
        if (loc.point?.pos) {
          locationData.point = {
            srsName: loc.point['@_srsName'] || 'http://www.opengis.net/def/crs/EPSG/0/4326',
            pos: loc.point.pos['#text'] || loc.point.pos
          };
        }

        // Administrative
        if (loc.administrative) {
          locationData.administrative = {
            vocabulary: loc.administrative['@_vocabulary'],
            level: loc.administrative['@_level'],
            code: loc.administrative['@_code']
          };
        }

        result.locations.push(locationData);
      }

      // Extract sectors
      const sectors = ensureArray(xmlActivity.sector);
      for (const sector of sectors) {
        if (!sector || Object.keys(sector).length === 0) continue;
        
        result.sectors.push({
          vocabulary: sector['@_vocabulary'],
          code: sector['@_code'],
          percentage: sector['@_percentage'] ? parseFloat(sector['@_percentage']) : undefined,
          narrative: extractNarrative(sector)
        });
      }

      // Extract recipient countries
      const recipientCountries = ensureArray(xmlActivity['recipient-country']);
      for (const country of recipientCountries) {
        if (!country || Object.keys(country).length === 0) continue;
        
        result.recipientCountries.push({
          code: country['@_code'],
          percentage: country['@_percentage'] ? parseFloat(country['@_percentage']) : undefined,
          narrative: extractNarrative(country)
        });
      }

      // Extract recipient regions
      const recipientRegions = ensureArray(xmlActivity['recipient-region']);
      for (const region of recipientRegions) {
        if (!region || Object.keys(region).length === 0) continue;
        
        result.recipientRegions.push({
          code: region['@_code'],
          vocabulary: region['@_vocabulary'],
          percentage: region['@_percentage'] ? parseFloat(region['@_percentage']) : undefined,
          narrative: extractNarrative(region)
        });
      }

      // Extract policy markers
      const policyMarkers = ensureArray(xmlActivity['policy-marker']);
      for (const marker of policyMarkers) {
        if (!marker || Object.keys(marker).length === 0) continue;
        
        result.policyMarkers.push({
          vocabulary: marker['@_vocabulary'],
          code: marker['@_code'],
          significance: marker['@_significance'],
          narrative: extractNarrative(marker)
        });
      }

      // Extract budgets
      const budgets = ensureArray(xmlActivity.budget);
      for (const budget of budgets) {
        if (!budget || Object.keys(budget).length === 0) continue;
        
        result.budgets.push({
          type: budget['@_type'],
          status: budget['@_status'],
          periodStart: budget['period-start']?.['@_iso-date'],
          periodEnd: budget['period-end']?.['@_iso-date'],
          value: parseFloat(budget.value?.['#text'] || budget.value || '0'),
          currency: budget.value?.['@_currency']
        });
      }

      // If it's a full activity, extract the activity itself
      if (snippetType === 'full-activity') {
        result.activities.push({
          iatiIdentifier: xmlActivity['iati-identifier']?.['#text'] || xmlActivity['iati-identifier'] || '',
          iati_id: xmlActivity['iati-identifier']?.['#text'] || xmlActivity['iati-identifier'] || '',
          title: extractNarrative(xmlActivity.title),
          description: extractNarrative(xmlActivity.description),
          status: xmlActivity['activity-status']?.['@_code'],
          activity_status: xmlActivity['activity-status']?.['@_code'],
          collaborationType: xmlActivity['collaboration-type']?.['@_code'],
          activityScope: xmlActivity['activity-scope']?.['@_code'],
          planned_start_date: xmlActivity['activity-date']?.find((d: any) => d['@_type'] === '1')?.['@_iso-date'],
          actual_start_date: xmlActivity['activity-date']?.find((d: any) => d['@_type'] === '2')?.['@_iso-date'],
          planned_end_date: xmlActivity['activity-date']?.find((d: any) => d['@_type'] === '3')?.['@_iso-date'],
          actual_end_date: xmlActivity['activity-date']?.find((d: any) => d['@_type'] === '4')?.['@_iso-date'],
          transactions: result.transactions
        });
      }
    }

    // Generate summary message
    const counts = [];
    if (result.transactions.length > 0) counts.push(`${result.transactions.length} transaction(s)`);
    if (result.organizations.length > 0) counts.push(`${result.organizations.length} organization(s)`);
    if (result.locations.length > 0) counts.push(`${result.locations.length} location(s)`);
    if (result.sectors.length > 0) counts.push(`${result.sectors.length} sector(s)`);
    if (result.recipientCountries.length > 0) counts.push(`${result.recipientCountries.length} country/countries`);
    if (result.recipientRegions.length > 0) counts.push(`${result.recipientRegions.length} region(s)`);
    if (result.policyMarkers.length > 0) counts.push(`${result.policyMarkers.length} policy marker(s)`);
    if (result.budgets.length > 0) counts.push(`${result.budgets.length} budget(s)`);
    if (result.activities.length > 0) counts.push(`${result.activities.length} activity/activities`);

    if (counts.length > 0) {
      result.message = `Successfully parsed ${counts.join(', ')}`;
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Snippet Parser] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to parse snippet',
        details: error instanceof Error ? error.message : 'Unknown error occurred while parsing the snippet'
      },
      { status: 500 }
    );
  }
}


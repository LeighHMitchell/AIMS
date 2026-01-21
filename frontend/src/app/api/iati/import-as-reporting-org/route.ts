import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { extractIatiMeta, IatiParseError } from '@/lib/iati/parseMeta';
import { XMLParser } from 'fast-xml-parser';
import { iatiAnalytics } from '@/lib/analytics';
import { USER_ROLES } from '@/types/user';
import { getOrCreateOrganization } from '@/lib/organization-helpers';
import { sanitizeIatiDescriptionServerSafe } from '@/lib/sanitize-server';
import { convertTransactionToUSD, addUSDFieldsToTransaction } from '@/lib/transaction-usd-helper';

export const dynamic = 'force-dynamic';

// Helper function to extract code value from various formats
function extractCodeValue(value: any): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    return value.code ?? value['@_code'] ?? value.value ?? null;
  }
  return null;
}

// Helper function to extract date value from various formats
function extractDateValue(value: any): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value.date ?? value['@_iso-date'] ?? value.isoDate ?? null;
  }
  return null;
}

// Helper function to find value from multiple possible keys
function findValueFromKeys(data: Record<string, any>, keys: string[]): any {
  for (const key of keys) {
    if (data[key] !== undefined) {
      return data[key];
    }
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  console.log('[Import as Reporting Org] 🚀 POST handler called');
  try {
    const { xmlContent, userId, userRole, replaceActivityIds, activityId, fields, iati_data, selectedReportingOrgId, acronyms } = await request.json();
    console.log('[Import as Reporting Org] Request received:', { 
      hasXmlContent: !!xmlContent, 
      userId, 
      userRole,
      hasFields: !!fields,
      hasIatiData: !!iati_data
    });
    
    // CRITICAL: Get user's org info to ensure we NEVER use it
    let userOrgInfo = null;
    if (userId) {
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', userId)
        .single();
      
      if (userData?.organization_id) {
        const { data: userOrg } = await supabase
          .from('organizations')
          .select('id, name, acronym')
          .eq('id', userData.organization_id)
          .single();
        
        userOrgInfo = userOrg;
        console.log(`[Import as Reporting Org] ⚠️  LOGGED-IN USER'S ORG (MUST NOT USE):`, {
          id: userOrg?.id,
          name: userOrg?.name,
          acronym: userOrg?.acronym,
          note: 'This org MUST NOT be used - we use XML reporting org instead'
        });
      }
    }

    if (!xmlContent || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: xmlContent and userId' },
        { status: 400 }
      );
    }

    // Check role permissions - only super users and government users can use this
    const isSuperUser = userRole === USER_ROLES.SUPER_USER || userRole === 'admin';
    const isGovernmentUser = userRole === USER_ROLES.GOV_PARTNER_TIER_1 || userRole === USER_ROLES.GOV_PARTNER_TIER_2;
    
    if (!isSuperUser && !isGovernmentUser) {
      return NextResponse.json(
        { error: 'Forbidden: This option is only available to Super Users and Government users' },
        { status: 403 }
      );
    }

    // Get user data to verify
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Double-check role from database
    const dbRole = userData.role;
    const dbIsSuperUser = dbRole === USER_ROLES.SUPER_USER || dbRole === 'admin';
    const dbIsGovernmentUser = dbRole === USER_ROLES.GOV_PARTNER_TIER_1 || dbRole === USER_ROLES.GOV_PARTNER_TIER_2;
    
    if (!dbIsSuperUser && !dbIsGovernmentUser) {
      return NextResponse.json(
        { error: 'Forbidden: This option is only available to Super Users and Government users' },
        { status: 403 }
      );
    }

    // Parse XML to extract metadata
    let meta;
    try {
      // Create a temporary File-like object for extractIatiMeta
      const blob = new Blob([xmlContent], { type: 'text/xml' });
      const file = new File([blob], 'import.xml', { type: 'text/xml' });
      meta = await extractIatiMeta(file);
      console.log('[Import as Reporting Org] Extracted meta:', meta);
    } catch (error) {
      console.error('[Import as Reporting Org] Parse error:', error);
      if (error instanceof IatiParseError) {
        return NextResponse.json(
          { 
            error: 'Parse failed',
            message: error.message,
            code: error.code
          }, 
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to parse XML file' }, 
        { status: 400 }
      );
    }

    const reportingOrgRef = meta.reportingOrgRef;
    if (!reportingOrgRef) {
      return NextResponse.json(
        { error: 'Missing reporting-org/@ref in XML' },
        { status: 400 }
      );
    }

    // Validate xmlContent before parsing
    if (!xmlContent || typeof xmlContent !== 'string' || xmlContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'Failed to parse XML content', details: 'XML content is missing or empty' },
        { status: 400 }
      );
    }

    // Helper functions for parsing
    const ensureArray = (item: any): any[] => {
      if (!item) return [];
      return Array.isArray(item) ? item : [item];
    };

    const extractNarrative = (node: any): string | undefined => {
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
    };

    const extractIatiIdentifier = (activity: any): string => {
      const identifier = activity['iati-identifier'];
      if (typeof identifier === 'string') return identifier;
      if (identifier?.['#text']) return identifier['#text'];
      return 'unknown-' + Math.random().toString(36).substr(2, 9);
    };

    // Parse XML using fast-xml-parser (server-compatible)
    let parsed: any;
    try {
      const xmlParser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: '#text',
        parseAttributeValue: true,
        trimValues: true
      });
      parsed = xmlParser.parse(xmlContent);
    } catch (error) {
      console.error('[Import as Reporting Org] XML parser error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { error: 'Failed to parse XML content', details: errorMessage },
        { status: 400 }
      );
    }

    // Check for root element
    if (!parsed['iati-activities']) {
      return NextResponse.json(
        { error: 'Invalid IATI XML structure', details: 'Missing required <iati-activities> root element' },
        { status: 400 }
      );
    }

    // Extract activities
    const iatiActivities = parsed['iati-activities'];
    if (!iatiActivities['iati-activity']) {
      return NextResponse.json(
        { error: 'No activities found in XML' },
        { status: 400 }
      );
    }

    const xmlActivities = ensureArray(iatiActivities['iati-activity']);
    console.log(`[Import as Reporting Org] Found ${xmlActivities.length} activities in XML`);

    // Parse activities to extract basic info
    const activities = [];
    for (const xmlActivity of xmlActivities) {
      try {
        const iatiIdentifier = extractIatiIdentifier(xmlActivity);
        if (!iatiIdentifier || iatiIdentifier.startsWith('unknown-')) {
          console.warn('[Import as Reporting Org] Skipping activity with invalid identifier');
          continue;
        }

        // Extract activity dates (all types)
        const activityDates = ensureArray(xmlActivity['activity-date'] || []);
        const plannedStartDate = activityDates.find((d: any) => d['@_type'] === '1' || d['@_type'] === 1)?.['@_iso-date'];
        const actualStartDate = activityDates.find((d: any) => d['@_type'] === '2' || d['@_type'] === 2)?.['@_iso-date'];
        const plannedEndDate = activityDates.find((d: any) => d['@_type'] === '3' || d['@_type'] === 3)?.['@_iso-date'];
        const actualEndDate = activityDates.find((d: any) => d['@_type'] === '4' || d['@_type'] === 4)?.['@_iso-date'];

        // Extract default currency from activity attribute
        const defaultCurrency = xmlActivity['@_default-currency'] || 'USD';

        // Extract and sanitize description HTML
        const rawDescription = extractNarrative(xmlActivity.description);
        const sanitizedDescription = rawDescription
          ? sanitizeIatiDescriptionServerSafe(rawDescription)
          : undefined;

        // Extract default classifications from XML
        const defaultAidType = extractCodeValue(xmlActivity['default-aid-type']);
        const defaultFlowType = extractCodeValue(xmlActivity['default-flow-type']);
        const defaultFinanceType = extractCodeValue(xmlActivity['default-finance-type']);
        const defaultTiedStatus = extractCodeValue(xmlActivity['default-tied-status']);
        const collaborationType = extractCodeValue(xmlActivity['collaboration-type']);
        const activityScope = extractCodeValue(xmlActivity['activity-scope']);
        const hierarchy = xmlActivity['@_hierarchy'] || null;
        const humanitarian = xmlActivity['@_humanitarian'] === true || xmlActivity['@_humanitarian'] === '1' || xmlActivity['@_humanitarian'] === 1;

        // Extract capital spend percentage
        const capitalSpendEl = xmlActivity['capital-spend'];
        const capitalSpendPercentage = capitalSpendEl?.['@_percentage'] !== undefined
          ? parseFloat(capitalSpendEl['@_percentage'])
          : null;

        // Extract recipient countries
        const recipientCountries = ensureArray(xmlActivity['recipient-country'] || []).map((c: any) => ({
          code: c['@_code'],
          percentage: c['@_percentage'] ? parseFloat(c['@_percentage']) : undefined,
          narrative: extractNarrative(c)
        }));

        // Extract recipient regions
        const recipientRegions = ensureArray(xmlActivity['recipient-region'] || []).map((r: any) => ({
          code: r['@_code'],
          vocabulary: r['@_vocabulary'] || '1',
          vocabularyUri: r['@_vocabulary-uri'],
          percentage: r['@_percentage'] ? parseFloat(r['@_percentage']) : undefined,
          narrative: extractNarrative(r)
        }));

        // Extract participating organizations
        const participatingOrgs = ensureArray(xmlActivity['participating-org'] || []).map((org: any) => ({
          ref: org['@_ref'],
          role: org['@_role'],
          type: org['@_type'],
          activityId: org['@_activity-id'],
          narrative: extractNarrative(org),
          name: extractNarrative(org)
        }));

        console.log(`[Import as Reporting Org] Parsed activity ${iatiIdentifier}:`, {
          title: extractNarrative(xmlActivity.title),
          dates: { plannedStartDate, actualStartDate, plannedEndDate, actualEndDate },
          classifications: { defaultAidType, defaultFlowType, defaultFinanceType, defaultTiedStatus },
          collaborationType, activityScope, hierarchy, humanitarian, capitalSpendPercentage,
          recipientCountriesCount: recipientCountries.length,
          recipientRegionsCount: recipientRegions.length,
          participatingOrgsCount: participatingOrgs.length
        });

        activities.push({
          iatiIdentifier,
          activityData: {
            iatiIdentifier,
            title: extractNarrative(xmlActivity.title) || `Imported Activity: ${iatiIdentifier}`,
            description: sanitizedDescription,
            activityStatus: xmlActivity['activity-status']?.['@_code'] || 'implementation',
            plannedStartDate,
            actualStartDate,
            plannedEndDate,
            actualEndDate,
            defaultCurrency,
            defaultAidType,
            defaultFlowType,
            defaultFinanceType,
            defaultTiedStatus,
            collaborationType,
            activityScope,
            hierarchy,
            humanitarian,
            capitalSpendPercentage,
            recipientCountries,
            recipientRegions,
            participatingOrgs
          }
        });
      } catch (error) {
        console.error('[Import as Reporting Org] Error parsing activity:', error);
      }
    }

    console.log(`[Import as Reporting Org] Parsed ${activities.length} activities`);

    // Check for duplicates and collect them with details
    const skippedIdentifiers: string[] = [];
    const duplicates: Array<{ iatiIdentifier: string; existingId: string; existingTitle: string }> = [];
    const activitiesToImport = [];

    for (const { iatiIdentifier, activityData } of activities) {
      // Check if activity with this IATI ID already exists
      const { data: existing } = await supabase
        .from('activities')
        .select('id, iati_identifier, title_narrative')
        .eq('iati_identifier', iatiIdentifier)
        .single();

      if (existing) {
        console.log(`[Import as Reporting Org] Found duplicate: ${iatiIdentifier}`);
        duplicates.push({
          iatiIdentifier,
          existingId: existing.id,
          existingTitle: existing.title_narrative || 'Untitled Activity'
        });
        
        // If this activity ID is in the replace list, delete it first
        if (replaceActivityIds && Array.isArray(replaceActivityIds) && replaceActivityIds.includes(existing.id)) {
          console.log(`[Import as Reporting Org] Replacing existing activity: ${existing.id}`);
          const { error: deleteError } = await supabase
            .from('activities')
            .delete()
            .eq('id', existing.id);

          if (deleteError) {
            console.error(`[Import as Reporting Org] Error deleting activity ${existing.id}:`, deleteError);
            // If deletion failed, don't add to import list - it will be skipped
            skippedIdentifiers.push(iatiIdentifier);
            continue;
          } else {
            console.log(`[Import as Reporting Org] Deleted existing activity: ${existing.id}`);
            // Now we can import this one
            activitiesToImport.push({ iatiIdentifier, activityData });
            console.log(`[Import as Reporting Org] Added ${iatiIdentifier} to import list after deletion`);
            continue;
          }
        } else {
          skippedIdentifiers.push(iatiIdentifier);
          continue;
        }
      }

      activitiesToImport.push({ iatiIdentifier, activityData });
    }

    // If duplicates found and no activities to import (and no replacements requested), return duplicate info
    if (duplicates.length > 0 && activitiesToImport.length === 0 && (!replaceActivityIds || replaceActivityIds.length === 0)) {
      console.log(`[Import as Reporting Org] All activities are duplicates`);
      return NextResponse.json({
        success: false,
        hasDuplicates: true,
        duplicates,
        reporting_org_ref: reportingOrgRef
      });
    }

    console.log(`[Import as Reporting Org] Importing ${activitiesToImport.length} activities, skipping ${skippedIdentifiers.length} duplicates`);
    console.log(`[Import as Reporting Org] Activities to import:`, activitiesToImport.map(a => a.iatiIdentifier));

    // Check if reporting organization exists, create if it doesn't
    let reportingOrgId: string | null = null;
    let reportingOrgAcronym: string | null = null;
    let reportingOrgNameFromDB: string | null = null; // Track the org name from database
    const reportingOrgName = meta.reportingOrgName || reportingOrgRef;

    console.log(`[Import as Reporting Org] 🔍 CRITICAL: Checking for reporting organization:`, {
      selectedReportingOrgId: selectedReportingOrgId || 'not provided',
      reportingOrgName: meta.reportingOrgName,
      reportingOrgRef: reportingOrgRef,
      note: selectedReportingOrgId ? 'Using user-selected org ID' : 'Will auto-detect from XML'
    });

    // If user selected a reporting org in the modal, use it
    if (selectedReportingOrgId) {
      console.log(`[Import as Reporting Org] ✅ Using user-selected reporting org ID: ${selectedReportingOrgId}`);
      const { data: selectedOrg, error: selectedOrgError } = await supabase
        .from('organizations')
        .select('id, name, acronym, iati_org_id')
        .eq('id', selectedReportingOrgId)
        .single();

      if (selectedOrgError || !selectedOrg) {
        console.error(`[Import as Reporting Org] ⚠️  Selected org not found, falling back to auto-detection:`, selectedOrgError);
        // Fall through to auto-detection logic below
      } else {
        reportingOrgId = selectedOrg.id;
        reportingOrgAcronym = selectedOrg.acronym;
        reportingOrgNameFromDB = selectedOrg.name;
        console.log(`[Import as Reporting Org] ✅ Using selected organization: ${selectedOrg.name} (ID: ${reportingOrgId})`);
        // Skip auto-detection and proceed with selected org
      }
    }

    // Only run auto-detection if no org was selected or selected org wasn't found
    if (!reportingOrgId) {

    // Prioritize IATI org ID matching (most reliable)
    // Step 1: Try exact match by iati_org_id first
    let matchingOrg = null;
    if (reportingOrgRef) {
      console.log(`[Import as Reporting Org] Searching for org with iati_org_id = "${reportingOrgRef}"`);
      const { data: orgByRef, error: orgByRefError } = await supabase
        .from('organizations')
        .select('id, name, iati_org_id, alias_refs, acronym')
        .eq('iati_org_id', reportingOrgRef)
        .maybeSingle();

      if (orgByRefError) {
        console.error(`[Import as Reporting Org] Error querying organizations by IATI ID:`, orgByRefError);
      }

      if (orgByRef) {
        matchingOrg = orgByRef;
        console.log(`[Import as Reporting Org] ✅ Found organization by IATI ID: ${matchingOrg.name} (ID: ${matchingOrg.id}, Acronym: ${matchingOrg.acronym || 'N/A'})`);
      } else {
        console.log(`[Import as Reporting Org] ❌ No organization found with iati_org_id = "${reportingOrgRef}"`);
      }
    }

    // Step 2: If not found by IATI ID, try alias_refs
    if (!matchingOrg && reportingOrgRef) {
      const { data: orgsByAlias } = await supabase
        .from('organizations')
        .select('id, name, iati_org_id, alias_refs, acronym')
        .not('alias_refs', 'is', null);

      const aliasMatch = orgsByAlias?.find(org => 
        org.alias_refs && Array.isArray(org.alias_refs) && org.alias_refs.includes(reportingOrgRef)
      );

      if (aliasMatch) {
        matchingOrg = aliasMatch;
        console.log(`[Import as Reporting Org] Found organization by alias_refs: ${matchingOrg.name} (ID: ${matchingOrg.id}, Acronym: ${matchingOrg.acronym})`);
      }
    }

    // Step 3: Only use name match as last resort (and only if no IATI ID was provided)
    if (!matchingOrg && reportingOrgName && !reportingOrgRef) {
      const { data: orgsByName } = await supabase
        .from('organizations')
        .select('id, name, iati_org_id, alias_refs, acronym')
        .ilike('name', `%${reportingOrgName}%`)
        .limit(10);

      // Find exact or close name match
      const nameMatch = orgsByName?.find(org =>
        org.name?.toLowerCase() === reportingOrgName.toLowerCase()
      );

      if (nameMatch) {
        matchingOrg = nameMatch;
        console.log(`[Import as Reporting Org] Found organization by name: ${matchingOrg.name} (ID: ${matchingOrg.id}, Acronym: ${matchingOrg.acronym})`);
      }
    }

    if (matchingOrg) {
      // CRITICAL VALIDATION: Ensure the matched org is NOT the user's organization
      if (userOrgInfo && matchingOrg.id === userOrgInfo.id) {
        console.error(`[Import as Reporting Org] ⚠️  CRITICAL ERROR: Matched organization is the logged-in user's org (${userOrgInfo.name})!`);
        console.error(`[Import as Reporting Org] XML reporting org ref: "${reportingOrgRef}"`);
        console.error(`[Import as Reporting Org] XML reporting org name: "${meta.reportingOrgName}"`);
        console.error(`[Import as Reporting Org] Matched org: ${matchingOrg.name} (ID: ${matchingOrg.id}, iati_org_id: ${matchingOrg.iati_org_id})`);
        console.error(`[Import as Reporting Org] User org: ${userOrgInfo.name} (ID: ${userOrgInfo.id})`);
        console.error(`[Import as Reporting Org] This should NEVER happen - the XML's reporting org should be different from the user's org.`);
        console.error(`[Import as Reporting Org] 🔧 Rejecting this match and will create/find the correct organization...`);
        
        // Reject this match - set matchingOrg to null so we can try other methods or create new
        matchingOrg = null;
      } else {
        reportingOrgId = matchingOrg.id;
        reportingOrgAcronym = matchingOrg.acronym;
        reportingOrgNameFromDB = matchingOrg.name; // Use the name from the database
        console.log(`[Import as Reporting Org] ✅ FOUND organization from XML: ${matchingOrg.name} (ID: ${reportingOrgId}, Acronym: ${reportingOrgAcronym || 'N/A'})`);
        console.log(`[Import as Reporting Org] 🔒 Organization values that WILL be saved (from XML):`, {
          reportingOrgId,
          reportingOrgAcronym,
          reportingOrgNameFromDB,
          reportingOrgRef,
          userOrgId: userOrgInfo?.id,
          userOrgName: userOrgInfo?.name,
          note: 'These MUST be used, NOT the logged-in user\'s org'
        });
      }
    }
    
    // If we rejected the match (because it was user's org), try to find/create the correct one
    if (!matchingOrg && reportingOrgRef) {
      console.log(`[Import as Reporting Org] 🔍 Previous match was rejected or not found. Searching more carefully...`);
      
      // Try a more specific search - exclude user's org explicitly
      let excludeUserOrgFilter = supabase
        .from('organizations')
        .select('id, name, iati_org_id, alias_refs, acronym')
        .eq('iati_org_id', reportingOrgRef);
      
      if (userOrgInfo) {
        excludeUserOrgFilter = excludeUserOrgFilter.neq('id', userOrgInfo.id);
      }
      
      const { data: orgExcludingUser, error: excludeError } = await excludeUserOrgFilter.maybeSingle();
      
      if (orgExcludingUser) {
        matchingOrg = orgExcludingUser;
        reportingOrgId = matchingOrg.id;
        reportingOrgAcronym = matchingOrg.acronym;
        reportingOrgNameFromDB = matchingOrg.name;
        console.log(`[Import as Reporting Org] ✅ FOUND correct organization (excluding user's org): ${matchingOrg.name} (ID: ${reportingOrgId})`);
      } else {
        // Try alias_refs search, but exclude user's org
        const { data: orgsByAlias } = await supabase
          .from('organizations')
          .select('id, name, iati_org_id, alias_refs, acronym')
          .not('alias_refs', 'is', null);
        
        if (userOrgInfo) {
          // Filter out user's org from alias search
          const aliasMatch = orgsByAlias?.find(org => 
            org.id !== userOrgInfo.id &&
            org.alias_refs && 
            Array.isArray(org.alias_refs) && 
            org.alias_refs.includes(reportingOrgRef)
          );
          
          if (aliasMatch) {
            matchingOrg = aliasMatch;
            reportingOrgId = matchingOrg.id;
            reportingOrgAcronym = matchingOrg.acronym;
            reportingOrgNameFromDB = matchingOrg.name;
            console.log(`[Import as Reporting Org] ✅ FOUND organization by alias_refs (excluding user's org): ${matchingOrg.name} (ID: ${reportingOrgId})`);
          }
        }
      }
    }
    
    if (!matchingOrg) {
      // Create the reporting organization
      console.log(`[Import as Reporting Org] Creating new organization: ${reportingOrgName}`);

      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: reportingOrgName,
          iati_org_id: reportingOrgRef,
          type: 'other', // Default type, can be updated later
          country: 'MM', // Default country
          alias_refs: [reportingOrgRef]
        })
        .select('id, name, acronym')
        .single();

      if (orgError) {
        console.error(`[Import as Reporting Org] Error creating organization:`, orgError);
        // Continue without org ID - activity will still be created
      } else {
        reportingOrgId = newOrg.id;
        reportingOrgAcronym = newOrg.acronym;
        reportingOrgNameFromDB = newOrg.name; // Use the name from the newly created org
        console.log(`[Import as Reporting Org] ✅ CREATED new organization from XML: ${newOrg.name} (ID: ${reportingOrgId})`);
        console.log(`[Import as Reporting Org] 🔒 New org values that WILL be saved (from XML):`, {
          reportingOrgId,
          reportingOrgAcronym,
          reportingOrgNameFromDB,
          reportingOrgRef,
          note: 'These MUST be used, NOT the logged-in user\'s org'
        });
      }
    }
    
    } // End of auto-detection block

    // CRITICAL CHECK: Ensure we have org values from XML, not from user
    if (!reportingOrgId && !reportingOrgNameFromDB) {
      console.error(`[Import as Reporting Org] ⚠️  WARNING: No reporting org found/created! Using XML ref as fallback`);
      reportingOrgNameFromDB = meta.reportingOrgName || reportingOrgRef;
    }
    
    // FINAL VALIDATION: Double-check we're NOT using the user's organization
    if (userOrgInfo && reportingOrgId === userOrgInfo.id) {
      console.error(`[Import as Reporting Org] ⚠️  CRITICAL ERROR: Final check detected user's org is being used!`);
      console.error(`[Import as Reporting Org] User org: ${userOrgInfo.name} (ID: ${userOrgInfo.id})`);
      console.error(`[Import as Reporting Org] XML reporting org ref: "${reportingOrgRef}"`);
      console.error(`[Import as Reporting Org] XML reporting org name: "${meta.reportingOrgName}"`);
      console.error(`[Import as Reporting Org] 🔧 Clearing reportingOrgId to force use of XML text values only`);
      
      // Clear the ID but keep the XML text values - at least the name will be correct
      reportingOrgId = null;
      // Ensure we have the XML name/ref for text fields
      if (!reportingOrgNameFromDB) {
        reportingOrgNameFromDB = meta.reportingOrgName || reportingOrgRef;
      }
    }
    
    console.log(`[Import as Reporting Org] 🔒 FINAL org values before activity insert/update:`, {
      reportingOrgId,
      reportingOrgRef,
      reportingOrgName: reportingOrgNameFromDB || meta.reportingOrgName || reportingOrgRef,
      reportingOrgAcronym,
      created_by_org_name: reportingOrgNameFromDB || meta.reportingOrgName || reportingOrgRef,
      created_by_org_acronym: reportingOrgAcronym,
      userOrgId: userOrgInfo?.id,
      userOrgName: userOrgInfo?.name,
      isUserOrg: userOrgInfo ? reportingOrgId === userOrgInfo.id : false,
      note: 'These are from XML metadata, NOT from logged-in user'
    });

    // Import activities
    const importedActivities = [];
    const importErrors: Array<{ iatiIdentifier: string; error: string }> = [];
    
    for (const { iatiIdentifier, activityData } of activitiesToImport) {
      console.log(`[Import as Reporting Org] Processing import for: ${iatiIdentifier}`);
      console.log(`[Import as Reporting Org] Fields provided:`, fields ? Object.keys(fields).length : 0);
      console.log(`[Import as Reporting Org] IATI data provided:`, iati_data ? Object.keys(iati_data).length : 0);
      console.log(`[Import as Reporting Org] IATI data keys:`, iati_data ? Object.keys(iati_data) : 'N/A');
      console.log(`[Import as Reporting Org] Has _parsedActivity:`, iati_data?._parsedActivity ? 'Yes' : 'No');
      if (fields) {
        console.log(`[Import as Reporting Org] All field keys:`, Object.keys(fields));
      }
      try {
        // Check if activity still exists (in case deletion didn't fully commit or there's a race condition)
        // Prioritize activityId if provided (importing into existing activity)
        let existingCheck = null;
        let foundByActivityId = false;
        if (activityId) {
          // First check if we're updating a specific activity
          const { data } = await supabase
            .from('activities')
            .select('id, iati_identifier')
            .eq('id', activityId)
            .single();
          if (data) {
            existingCheck = data;
            foundByActivityId = true;
            console.log(`[Import as Reporting Org] Found activity by activityId: ${activityId}`);
          }
        }
        // If not found by activityId, fall back to iati_identifier matching
        if (!existingCheck) {
          const { data } = await supabase
            .from('activities')
            .select('id, iati_identifier')
            .eq('iati_identifier', iatiIdentifier)
            .single();
          existingCheck = data;
          if (existingCheck) {
            console.log(`[Import as Reporting Org] Found activity by iati_identifier: ${iatiIdentifier}`);
          }
        }

        // Build activity insert object
        // IMPORTANT: Always set reporting org fields from XML, never from iati_data
        // This ensures the XML's reporting org is used, not the logged-in user's org
        let activityInsert: any = {
          iati_identifier: iatiIdentifier,
          // CRITICAL: Set reporting org fields from XML metadata, not from any other source
          reporting_org_ref: reportingOrgRef,
          reporting_org_iati_id: reportingOrgRef, // Store the IATI org ID from XML
          reporting_org_name: reportingOrgNameFromDB || meta.reportingOrgName || reportingOrgRef,
          created_by_org_name: reportingOrgNameFromDB || meta.reportingOrgName || reportingOrgRef, // Use DB name first, then XML name, then ref
          created_by_org_acronym: reportingOrgAcronym || null, // Extract acronym if available
          reporting_org_id: reportingOrgId, // Set reporting_org_id for consistency
          source_type: 'external',
          import_mode: 'reporting_org',
          // NOTE: created_by is the user who performed the import, NOT the reporting org
          // The reporting org is set via created_by_org_name/reporting_org_id above
          created_by: userId,
          last_edited_by: userId,
          publication_status: 'draft',
          submission_status: 'not_submitted'
        };
        
        // Explicitly remove any reporting org fields from iati_data to prevent override
        // This ensures we ALWAYS use the XML's reporting org, never values from the frontend
        if (iati_data) {
          console.log(`[Import as Reporting Org] 🧹 Cleaning iati_data - removing any reporting org fields that might override XML values`);
          delete iati_data.reporting_org_name;
          delete iati_data.reporting_org_ref;
          delete iati_data.reporting_org_type;
          delete iati_data.created_by_org_name;
          delete iati_data.created_by_org_acronym;
          delete iati_data.reporting_org_id;
          // Also check nested _parsedActivity
          if (iati_data._parsedActivity) {
            delete iati_data._parsedActivity.reporting_org_name;
            delete iati_data._parsedActivity.reporting_org_ref;
            delete iati_data._parsedActivity.reporting_org_type;
            delete iati_data._parsedActivity.created_by_org_name;
            delete iati_data._parsedActivity.created_by_org_acronym;
            delete iati_data._parsedActivity.reporting_org_id;
          }
        }
        
        console.log(`[Import as Reporting Org] 🔒 FINAL reporting org values (from XML only):`, {
          reporting_org_id: activityInsert.reporting_org_id,
          reporting_org_ref: activityInsert.reporting_org_ref,
          reporting_org_name: activityInsert.reporting_org_name,
          created_by_org_name: activityInsert.created_by_org_name,
          created_by_org_acronym: activityInsert.created_by_org_acronym,
          note: 'These values come from XML metadata, NOT from logged-in user'
        });

        console.log(`[Import as Reporting Org] 🔍 Activity insert object BEFORE processing:`, {
          iatiIdentifier,
          reportingOrgId,
          reportingOrgRef,
          reportingOrgName: meta.reportingOrgName,
          reportingOrgAcronym,
          reportingOrgNameFromDB,
          reporting_org_id: activityInsert.reporting_org_id,
          created_by_org_name: activityInsert.created_by_org_name,
          created_by_org_acronym: activityInsert.created_by_org_acronym,
          reporting_org_name: activityInsert.reporting_org_name,
          reporting_org_ref: activityInsert.reporting_org_ref
        });
        
        // Ensure we always have a display name - use IATI ref as fallback
        if (!activityInsert.created_by_org_name || activityInsert.created_by_org_name === '') {
          activityInsert.created_by_org_name = reportingOrgRef || meta.reportingOrgName || 'Unknown';
          console.log(`[Import as Reporting Org] ⚠️  No org name found, using IATI ref as fallback: ${activityInsert.created_by_org_name}`);
        }
        
        // Verify all organization fields are set before insert/update
        console.log(`[Import as Reporting Org] 🔍 Organization fields that will be saved:`, {
          reporting_org_id: activityInsert.reporting_org_id,
          reporting_org_ref: activityInsert.reporting_org_ref,
          reporting_org_name: activityInsert.reporting_org_name,
          created_by_org_name: activityInsert.created_by_org_name,
          created_by_org_acronym: activityInsert.created_by_org_acronym,
          created_by: activityInsert.created_by
        });

        // Check if there's a user-provided acronym for this activity
        const userProvidedAcronym = acronyms && acronyms[iatiIdentifier];
        if (userProvidedAcronym) {
          console.log(`[Import as Reporting Org] User provided acronym: "${userProvidedAcronym}" for activity ${iatiIdentifier}`);
        }
        
        // If fields and iati_data are provided, use field selection
        if (fields && iati_data && typeof fields === 'object') {
          // Flexible field mappings - each field can be found under multiple possible keys
          // This handles various publisher formats (IATI paths, snake_case, camelCase)
          const flexibleFieldMappings: Array<{
            dbField: string;
            sourceKeys: string[];
            extractFn?: (val: any) => any;
          }> = [
            { dbField: 'title_narrative', sourceKeys: ['iati-activity/title/narrative', 'title_narrative', 'title'] },
            { dbField: 'description_narrative', sourceKeys: ['iati-activity/description[@type="1"]/narrative', 'description_narrative', 'description'] },
            { dbField: 'description_objectives', sourceKeys: ['iati-activity/description[@type="2"]/narrative', 'description_objectives'] },
            { dbField: 'description_target_groups', sourceKeys: ['iati-activity/description[@type="3"]/narrative', 'description_target_groups'] },
            { dbField: 'activity_status', sourceKeys: ['iati-activity/activity-status', 'activity_status', 'activityStatus'], extractFn: extractCodeValue },
            { dbField: 'planned_start_date', sourceKeys: ['iati-activity/activity-date[@type="1"]', 'planned_start_date', 'plannedStartDate', 'activity_date_start_planned'], extractFn: extractDateValue },
            { dbField: 'actual_start_date', sourceKeys: ['iati-activity/activity-date[@type="2"]', 'actual_start_date', 'actualStartDate', 'activity_date_start_actual'], extractFn: extractDateValue },
            { dbField: 'planned_end_date', sourceKeys: ['iati-activity/activity-date[@type="3"]', 'planned_end_date', 'plannedEndDate', 'activity_date_end_planned'], extractFn: extractDateValue },
            { dbField: 'actual_end_date', sourceKeys: ['iati-activity/activity-date[@type="4"]', 'actual_end_date', 'actualEndDate', 'activity_date_end_actual'], extractFn: extractDateValue },
            { dbField: 'default_currency', sourceKeys: ['iati-activity[@default-currency]', 'iati-activity/default-currency', 'default_currency', 'defaultCurrency'] },
            { dbField: 'collaboration_type', sourceKeys: ['iati-activity/collaboration-type', 'collaboration_type', 'collaborationType'], extractFn: extractCodeValue },
            { dbField: 'activity_scope', sourceKeys: ['iati-activity/activity-scope', 'activity_scope', 'activityScope'], extractFn: extractCodeValue },
            { dbField: 'language', sourceKeys: ['iati-activity[@xml:lang]', 'language'] },
            { dbField: 'default_aid_type', sourceKeys: ['iati-activity/default-aid-type', 'default_aid_type', 'defaultAidType'], extractFn: extractCodeValue },
            { dbField: 'default_flow_type', sourceKeys: ['iati-activity/default-flow-type', 'default_flow_type', 'defaultFlowType', 'flow_type', 'flowType'], extractFn: extractCodeValue },
            { dbField: 'default_finance_type', sourceKeys: ['iati-activity/default-finance-type', 'default_finance_type', 'defaultFinanceType'], extractFn: extractCodeValue },
            { dbField: 'default_tied_status', sourceKeys: ['iati-activity/default-tied-status', 'default_tied_status', 'defaultTiedStatus'], extractFn: extractCodeValue },
            { dbField: 'capital_spend_percentage', sourceKeys: ['iati-activity/capital-spend', 'iati-activity/capital-spend[@percentage]', 'iati-activity/capital-spend-percentage', 'capital_spend_percentage', 'capitalSpend', 'capitalSpendPercentage'] },
            { dbField: 'humanitarian', sourceKeys: ['iati-activity[@humanitarian]', 'humanitarian'] },
            { dbField: 'hierarchy', sourceKeys: ['iati-activity[@hierarchy]', 'hierarchy'] }
          ];

          // Apply flexible field mappings - check multiple possible keys for each field
          for (const mapping of flexibleFieldMappings) {
            // #region agent log
            if (mapping.dbField === 'capital_spend_percentage') {
              fetch('http://127.0.0.1:7242/ingest/b4892be5-ca87-459d-a863-d3e1a440a1d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'import-as-reporting-org/route.ts:753',message:'Capital spend mapping check',data:{sourceKeys:mapping.sourceKeys,fieldsKeys:Object.keys(fields||{}),fieldsHasCapitalSpend:fields?.['iati-activity/capital-spend'],fieldsHasCapitalSpendAttr:fields?.['iati-activity/capital-spend[@percentage]'],fieldsHasCapitalSpendPct:fields?.['capital_spend_percentage']},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
            }
            // #endregion
            // Check if any of the source keys are selected in fields
            const isSelected = mapping.sourceKeys.some(key => fields[key]);
            // #region agent log
            if (mapping.dbField === 'capital_spend_percentage') {
              fetch('http://127.0.0.1:7242/ingest/b4892be5-ca87-459d-a863-d3e1a440a1d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'import-as-reporting-org/route.ts:755',message:'Capital spend isSelected result',data:{isSelected,matchedKeys:mapping.sourceKeys.filter(key=>fields?.[key])},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
            }
            // #endregion
            if (!isSelected) continue;

            // Find the value from any of the source keys
            let value = findValueFromKeys(iati_data, mapping.sourceKeys);
            // #region agent log
            if (mapping.dbField === 'capital_spend_percentage') {
              fetch('http://127.0.0.1:7242/ingest/b4892be5-ca87-459d-a863-d3e1a440a1d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'import-as-reporting-org/route.ts:759',message:'Capital spend value lookup',data:{valueFound:value,iatiDataKeys:Object.keys(iati_data||{}),iatiDataCapitalSpend:iati_data?.capital_spend_percentage,iatiDataCapitalSpendStr:iati_data?.['capital_spend_percentage']},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
            }
            // #endregion
            
            // Apply extraction function if provided
            if (value !== undefined && mapping.extractFn) {
              value = mapping.extractFn(value);
            }
            
            if (value !== undefined && value !== null) {
              activityInsert[mapping.dbField] = value;
              console.log(`[Import as Reporting Org] Set ${mapping.dbField} = ${value}`);
              // #region agent log
              if (mapping.dbField === 'capital_spend_percentage') {
                fetch('http://127.0.0.1:7242/ingest/b4892be5-ca87-459d-a863-d3e1a440a1d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'import-as-reporting-org/route.ts:768',message:'Capital spend value SET SUCCESS',data:{finalValue:value,dbField:mapping.dbField},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
              }
              // #endregion
            }
          }

          // Handle parsed activity data for complex fields
          const parsedActivity = iati_data._parsedActivity;
          if (parsedActivity) {
            // Use parsed activity data to fill in any missing basic fields
            if (!activityInsert.title_narrative && parsedActivity.title) {
              activityInsert.title_narrative = parsedActivity.title;
            }
            
            // Set user-provided acronym if available
            if (userProvidedAcronym) {
              activityInsert.acronym = userProvidedAcronym;
            }
            
            if (!activityInsert.description_narrative && parsedActivity.description) {
              // Sanitize HTML in description
              activityInsert.description_narrative = sanitizeIatiDescriptionServerSafe(parsedActivity.description);
            }
            if (!activityInsert.activity_status && parsedActivity.activityStatus) {
              activityInsert.activity_status = extractCodeValue(parsedActivity.activityStatus);
            }
            if (!activityInsert.planned_start_date && parsedActivity.plannedStartDate) {
              activityInsert.planned_start_date = extractDateValue(parsedActivity.plannedStartDate);
            }
            if (!activityInsert.planned_end_date && parsedActivity.plannedEndDate) {
              activityInsert.planned_end_date = extractDateValue(parsedActivity.plannedEndDate);
            }
            if (!activityInsert.actual_start_date && parsedActivity.actualStartDate) {
              activityInsert.actual_start_date = extractDateValue(parsedActivity.actualStartDate);
            }
            if (!activityInsert.actual_end_date && parsedActivity.actualEndDate) {
              activityInsert.actual_end_date = extractDateValue(parsedActivity.actualEndDate);
            }
            if (!activityInsert.default_currency && parsedActivity.defaultCurrency) {
              activityInsert.default_currency = parsedActivity.defaultCurrency;
            }
            
            // Classification fields fallback from parsedActivity
            if (!activityInsert.collaboration_type && parsedActivity.collaborationType) {
              activityInsert.collaboration_type = extractCodeValue(parsedActivity.collaborationType);
              console.log(`[Import as Reporting Org] Set collaboration_type from parsedActivity = ${activityInsert.collaboration_type}`);
            }
            if (!activityInsert.default_aid_type && parsedActivity.defaultAidType) {
              activityInsert.default_aid_type = extractCodeValue(parsedActivity.defaultAidType);
              console.log(`[Import as Reporting Org] Set default_aid_type from parsedActivity = ${activityInsert.default_aid_type}`);
            }
            if (!activityInsert.default_flow_type && parsedActivity.defaultFlowType) {
              activityInsert.default_flow_type = extractCodeValue(parsedActivity.defaultFlowType);
              console.log(`[Import as Reporting Org] Set default_flow_type from parsedActivity = ${activityInsert.default_flow_type}`);
            }
            if (!activityInsert.default_finance_type && parsedActivity.defaultFinanceType) {
              activityInsert.default_finance_type = extractCodeValue(parsedActivity.defaultFinanceType);
              console.log(`[Import as Reporting Org] Set default_finance_type from parsedActivity = ${activityInsert.default_finance_type}`);
            }
            if (!activityInsert.default_tied_status && parsedActivity.defaultTiedStatus) {
              activityInsert.default_tied_status = extractCodeValue(parsedActivity.defaultTiedStatus);
              console.log(`[Import as Reporting Org] Set default_tied_status from parsedActivity = ${activityInsert.default_tied_status}`);
            }
            if (!activityInsert.activity_scope && parsedActivity.activityScope) {
              activityInsert.activity_scope = extractCodeValue(parsedActivity.activityScope);
              console.log(`[Import as Reporting Org] Set activity_scope from parsedActivity = ${activityInsert.activity_scope}`);
            }
            if (!activityInsert.hierarchy && parsedActivity.hierarchy) {
              activityInsert.hierarchy = parsedActivity.hierarchy;
              console.log(`[Import as Reporting Org] Set hierarchy from parsedActivity = ${activityInsert.hierarchy}`);
            }
            if (!activityInsert.capital_spend_percentage && parsedActivity.capitalSpendPercentage) {
              activityInsert.capital_spend_percentage = parsedActivity.capitalSpendPercentage;
              console.log(`[Import as Reporting Org] Set capital_spend_percentage from parsedActivity = ${activityInsert.capital_spend_percentage}`);
            }
            if (parsedActivity.humanitarian !== undefined && activityInsert.humanitarian === undefined) {
              activityInsert.humanitarian = parsedActivity.humanitarian;
              console.log(`[Import as Reporting Org] Set humanitarian from parsedActivity = ${activityInsert.humanitarian}`);
            }
          }

          // AUTHORITATIVE: Use server-side parsed activityData to ALWAYS overwrite values
          // This ensures XML values take precedence over any defaults or frontend-parsed data
          // The server directly parses the raw XML, so these are the definitive values
          if (activityData) {
            console.log(`[Import as Reporting Org] 🔄 Applying server-parsed XML values (AUTHORITATIVE):`, {
              title: activityData.title,
              description: activityData.description ? `${activityData.description.substring(0, 50)}...` : null,
              activityScope: activityData.activityScope,
              dates: {
                plannedStart: activityData.plannedStartDate,
                actualStart: activityData.actualStartDate,
                plannedEnd: activityData.plannedEndDate,
                actualEnd: activityData.actualEndDate
              }
            });

            // ALWAYS overwrite title with server-parsed value (don't check if already set)
            if (activityData.title) {
              const oldTitle = activityInsert.title_narrative;
              activityInsert.title_narrative = activityData.title;
              console.log(`[Import as Reporting Org] ✓ Set title from server XML: "${oldTitle}" → "${activityData.title}"`);
            }

            // ALWAYS overwrite description with server-parsed value
            if (activityData.description) {
              activityInsert.description_narrative = activityData.description;
              console.log(`[Import as Reporting Org] ✓ Set description from server XML`);
            }

            // ALWAYS overwrite activity_scope with server-parsed value
            if (activityData.activityScope) {
              const oldScope = activityInsert.activity_scope;
              activityInsert.activity_scope = activityData.activityScope;
              console.log(`[Import as Reporting Org] ✓ Set activity_scope from server XML: "${oldScope}" → "${activityData.activityScope}"`);
            }

            // Overwrite dates if available from XML
            if (activityData.plannedStartDate) {
              activityInsert.planned_start_date = activityData.plannedStartDate;
              console.log(`[Import as Reporting Org] ✓ Set planned_start_date from server XML = ${activityData.plannedStartDate}`);
            }
            if (activityData.actualStartDate) {
              activityInsert.actual_start_date = activityData.actualStartDate;
              console.log(`[Import as Reporting Org] ✓ Set actual_start_date from server XML = ${activityData.actualStartDate}`);
            }
            if (activityData.plannedEndDate) {
              activityInsert.planned_end_date = activityData.plannedEndDate;
              console.log(`[Import as Reporting Org] ✓ Set planned_end_date from server XML = ${activityData.plannedEndDate}`);
            }
            if (activityData.actualEndDate) {
              activityInsert.actual_end_date = activityData.actualEndDate;
              console.log(`[Import as Reporting Org] ✓ Set actual_end_date from server XML = ${activityData.actualEndDate}`);
            }

            // Overwrite currency and classifications if available from XML
            if (activityData.defaultCurrency) {
              activityInsert.default_currency = activityData.defaultCurrency;
              console.log(`[Import as Reporting Org] ✓ Set default_currency from server XML = ${activityData.defaultCurrency}`);
            }
            if (activityData.defaultAidType) {
              activityInsert.default_aid_type = activityData.defaultAidType;
              console.log(`[Import as Reporting Org] ✓ Set default_aid_type from server XML = ${activityData.defaultAidType}`);
            }
            if (activityData.defaultFlowType) {
              activityInsert.default_flow_type = activityData.defaultFlowType;
              console.log(`[Import as Reporting Org] ✓ Set default_flow_type from server XML = ${activityData.defaultFlowType}`);
            }
            if (activityData.defaultFinanceType) {
              activityInsert.default_finance_type = activityData.defaultFinanceType;
              console.log(`[Import as Reporting Org] ✓ Set default_finance_type from server XML = ${activityData.defaultFinanceType}`);
            }
            if (activityData.defaultTiedStatus) {
              activityInsert.default_tied_status = activityData.defaultTiedStatus;
              console.log(`[Import as Reporting Org] ✓ Set default_tied_status from server XML = ${activityData.defaultTiedStatus}`);
            }
            if (activityData.collaborationType) {
              activityInsert.collaboration_type = activityData.collaborationType;
              console.log(`[Import as Reporting Org] ✓ Set collaboration_type from server XML = ${activityData.collaborationType}`);
            }
            if (activityData.hierarchy) {
              activityInsert.hierarchy = activityData.hierarchy;
              console.log(`[Import as Reporting Org] ✓ Set hierarchy from server XML = ${activityData.hierarchy}`);
            }
            if (activityData.capitalSpendPercentage !== null && activityData.capitalSpendPercentage !== undefined) {
              activityInsert.capital_spend_percentage = activityData.capitalSpendPercentage;
              console.log(`[Import as Reporting Org] ✓ Set capital_spend_percentage from server XML = ${activityData.capitalSpendPercentage}`);
            }
            if (activityData.humanitarian !== undefined) {
              activityInsert.humanitarian = activityData.humanitarian;
              console.log(`[Import as Reporting Org] ✓ Set humanitarian from server XML = ${activityData.humanitarian}`);
            }
            if (activityData.activityStatus) {
              activityInsert.activity_status = activityData.activityStatus;
              console.log(`[Import as Reporting Org] ✓ Set activity_status from server XML = ${activityData.activityStatus}`);
            }

            console.log(`[Import as Reporting Org] 📋 Final values after server XML override:`, {
              title_narrative: activityInsert.title_narrative,
              description_narrative: activityInsert.description_narrative ? `${activityInsert.description_narrative.substring(0, 50)}...` : null,
              activity_scope: activityInsert.activity_scope,
              activity_status: activityInsert.activity_status
            });
          }

          // Ensure required fields have defaults
          if (!activityInsert.title_narrative) {
            activityInsert.title_narrative = `Imported Activity: ${iatiIdentifier}`;
          }
          if (!activityInsert.activity_status) {
            activityInsert.activity_status = 'implementation';
          }
          if (!activityInsert.default_currency) {
            activityInsert.default_currency = 'USD';
          }
        } else {
          // Use basic activityData (backward compatibility / no fields selected)
          // Sanitize HTML in description
          const sanitizedDesc = activityData.description
            ? sanitizeIatiDescriptionServerSafe(activityData.description)
            : null;
          activityInsert = {
            ...activityInsert,
            title_narrative: activityData.title || `Imported Activity: ${iatiIdentifier}`,
            acronym: userProvidedAcronym || null,
            description_narrative: sanitizedDesc,
            activity_status: activityData.activityStatus || 'implementation',
            planned_start_date: activityData.plannedStartDate || null,
            actual_start_date: activityData.actualStartDate || null,
            planned_end_date: activityData.plannedEndDate || null,
            actual_end_date: activityData.actualEndDate || null,
            default_currency: activityData.defaultCurrency || 'USD',
            default_aid_type: activityData.defaultAidType || null,
            default_flow_type: activityData.defaultFlowType || null,
            default_finance_type: activityData.defaultFinanceType || null,
            default_tied_status: activityData.defaultTiedStatus || null,
            collaboration_type: activityData.collaborationType || null,
            activity_scope: activityData.activityScope || null,
            hierarchy: activityData.hierarchy || null,
            capital_spend_percentage: activityData.capitalSpendPercentage || null,
            humanitarian: activityData.humanitarian || false
          };
          console.log(`[Import as Reporting Org] Using server-side parsed data for activity ${iatiIdentifier}:`, {
            title: activityInsert.title_narrative,
            dates: {
              plannedStart: activityInsert.planned_start_date,
              actualStart: activityInsert.actual_start_date,
              plannedEnd: activityInsert.planned_end_date,
              actualEnd: activityInsert.actual_end_date
            },
            classifications: {
              aidType: activityInsert.default_aid_type,
              flowType: activityInsert.default_flow_type,
              financeType: activityInsert.default_finance_type,
              tiedStatus: activityInsert.default_tied_status
            },
            collaborationType: activityInsert.collaboration_type,
            activityScope: activityInsert.activity_scope,
            hierarchy: activityInsert.hierarchy,
            capitalSpend: activityInsert.capital_spend_percentage,
            humanitarian: activityInsert.humanitarian
          });
        }

        console.log(`[Import as Reporting Org] Activity ${iatiIdentifier} exists check:`, existingCheck ? `Found (ID: ${existingCheck.id})` : 'Not found');

        // Declare variables outside the if/else blocks
        let finalActivityId: string | null = null;
        let activityResult: any = null;

        // If activity exists, update it; otherwise insert
        if (existingCheck) {
          console.log(`[Import as Reporting Org] Activity exists, updating instead of inserting: ${iatiIdentifier}`);
          
          // Get current activity state before update for comparison
          // Use the same query method we'll use for update
          let currentActivityQuery = supabase
            .from('activities')
            .select('id, reporting_org_id, reporting_org_ref, reporting_org_name, created_by_org_name, created_by_org_acronym');
          
          if (foundByActivityId && activityId) {
            currentActivityQuery = currentActivityQuery.eq('id', activityId);
          } else {
            currentActivityQuery = currentActivityQuery.eq('iati_identifier', iatiIdentifier);
          }
          
          const { data: currentActivityState } = await currentActivityQuery.single();
          
          console.log(`[Import as Reporting Org] 📊 CURRENT activity state BEFORE update:`, {
            reporting_org_id: currentActivityState?.reporting_org_id,
            reporting_org_ref: currentActivityState?.reporting_org_ref,
            reporting_org_name: currentActivityState?.reporting_org_name,
            created_by_org_name: currentActivityState?.created_by_org_name,
            created_by_org_acronym: currentActivityState?.created_by_org_acronym
          });
          
          console.log(`[Import as Reporting Org] 🔍 FINAL activityInsert object before update:`, {
            reporting_org_id: activityInsert.reporting_org_id,
            reporting_org_ref: activityInsert.reporting_org_ref,
            reporting_org_name: activityInsert.reporting_org_name,
            created_by_org_name: activityInsert.created_by_org_name,
            created_by_org_acronym: activityInsert.created_by_org_acronym,
            created_by: activityInsert.created_by
          });
          
          // Ensure reporting org fields are explicitly included in update
          // CRITICAL: Always override any reporting org fields from activityInsert with XML values
          const updatePayload = {
            ...activityInsert,
            // FORCE reporting org fields from XML - these must never be overridden
            reporting_org_id: reportingOrgId,
            reporting_org_ref: reportingOrgRef,
            reporting_org_iati_id: reportingOrgRef, // Store the IATI org ID from XML
            reporting_org_name: reportingOrgNameFromDB || meta.reportingOrgName || reportingOrgRef,
            created_by_org_name: reportingOrgNameFromDB || meta.reportingOrgName || reportingOrgRef,
            created_by_org_acronym: reportingOrgAcronym,
            updated_at: new Date().toISOString()
          };
          
          // Remove any reporting org fields that might have been in activityInsert from iati_data
          // This ensures we always use the XML's reporting org, not any values from the frontend
          console.log(`[Import as Reporting Org] 🔒 LOCKING reporting org fields to XML values:`, {
            reporting_org_id: updatePayload.reporting_org_id,
            reporting_org_ref: updatePayload.reporting_org_ref,
            reporting_org_iati_id: updatePayload.reporting_org_iati_id,
            reporting_org_name: updatePayload.reporting_org_name,
            created_by_org_name: updatePayload.created_by_org_name,
            created_by_org_acronym: updatePayload.created_by_org_acronym
          });
          
          console.log(`[Import as Reporting Org] 🎯 Update payload with explicit reporting org fields:`, {
            reporting_org_id: updatePayload.reporting_org_id,
            reporting_org_ref: updatePayload.reporting_org_ref,
            reporting_org_iati_id: updatePayload.reporting_org_iati_id,
            reporting_org_name: updatePayload.reporting_org_name,
            created_by_org_name: updatePayload.created_by_org_name,
            created_by_org_acronym: updatePayload.created_by_org_acronym
          });
          
          // Use activityId if we found activity by ID, otherwise use iati_identifier
          let updateQuery;
          if (foundByActivityId && activityId) {
            // Update by activityId (importing into specific existing activity)
            updateQuery = supabase
              .from('activities')
              .update(updatePayload)
              .eq('id', activityId);
            console.log(`[Import as Reporting Org] Updating activity by ID: ${activityId}`);
          } else {
            // Update by iati_identifier (fallback behavior)
            updateQuery = supabase
              .from('activities')
              .update(updatePayload)
              .eq('iati_identifier', iatiIdentifier);
            console.log(`[Import as Reporting Org] Updating activity by iati_identifier: ${iatiIdentifier}`);
          }
          
          const { data: updated, error: updateError } = await updateQuery
            .select('id, iati_identifier')
            .single();
          
          if (updateError) {
            const errorMsg = updateError.message || String(updateError);
            console.error(`[Import as Reporting Org] Error updating activity ${iatiIdentifier}:`, updateError);
            console.error(`[Import as Reporting Org] Update error code: ${updateError.code}, message: ${errorMsg}`);
            importErrors.push({ iatiIdentifier, error: `Update failed: ${errorMsg}` });
            continue;
          }
          
          if (!updated) {
            console.error(`[Import as Reporting Org] Update returned no data for ${iatiIdentifier}`);
            importErrors.push({ iatiIdentifier, error: 'Update returned no data' });
            continue;
          }
          
          finalActivityId = updated.id;
          activityResult = updated;
          importedActivities.push(updated);
          console.log(`[Import as Reporting Org] Successfully updated activity: ${iatiIdentifier} (ID: ${updated.id})`);
        } else {
          console.log(`[Import as Reporting Org] 🔍 FINAL activityInsert object before insert:`, {
            reporting_org_id: activityInsert.reporting_org_id,
            reporting_org_ref: activityInsert.reporting_org_ref,
            reporting_org_name: activityInsert.reporting_org_name,
            created_by_org_name: activityInsert.created_by_org_name,
            created_by_org_acronym: activityInsert.created_by_org_acronym,
            created_by: activityInsert.created_by
          });
          console.log(`[Import as Reporting Org] Attempting to insert activity:`, JSON.stringify(activityInsert, null, 2));

          const { data: inserted, error: insertError } = await supabase
            .from('activities')
            .insert(activityInsert)
            .select('id, iati_identifier')
            .single();

          if (insertError) {
            const errorMsg = insertError.message || String(insertError);
            console.error(`[Import as Reporting Org] Error inserting activity ${iatiIdentifier}:`, insertError);
            console.error(`[Import as Reporting Org] Error code: ${insertError.code}, message: ${errorMsg}`);
            console.error(`[Import as Reporting Org] Insert data was:`, JSON.stringify(activityInsert, null, 2));
            
            // If it's a unique constraint error, try to update instead
            if (insertError.code === '23505' || insertError.message?.includes('unique') || insertError.message?.includes('duplicate')) {
              console.log(`[Import as Reporting Org] Unique constraint violation, attempting update instead`);
              
              // Use explicit update payload with reporting org fields
              // CRITICAL: Always use XML reporting org values, never from activityInsert
              const updatePayload = {
                ...activityInsert,
                // FORCE reporting org fields from XML - override any values from activityInsert
                reporting_org_id: reportingOrgId,
                reporting_org_ref: reportingOrgRef,
                reporting_org_iati_id: reportingOrgRef, // Store the IATI org ID from XML
                reporting_org_name: reportingOrgNameFromDB || meta.reportingOrgName || reportingOrgRef,
                created_by_org_name: reportingOrgNameFromDB || meta.reportingOrgName || reportingOrgRef,
                created_by_org_acronym: reportingOrgAcronym,
                updated_at: new Date().toISOString()
              };
              
              console.log(`[Import as Reporting Org] 🔒 FALLBACK: LOCKING reporting org fields to XML values:`, {
                reporting_org_id: updatePayload.reporting_org_id,
                reporting_org_ref: updatePayload.reporting_org_ref,
                reporting_org_name: updatePayload.reporting_org_name,
                created_by_org_name: updatePayload.created_by_org_name,
                created_by_org_acronym: updatePayload.created_by_org_acronym
              });
              
              console.log(`[Import as Reporting Org] 🎯 Fallback update payload with explicit reporting org fields:`, {
                reporting_org_id: updatePayload.reporting_org_id,
                reporting_org_ref: updatePayload.reporting_org_ref,
                reporting_org_name: updatePayload.reporting_org_name,
                created_by_org_name: updatePayload.created_by_org_name,
                created_by_org_acronym: updatePayload.created_by_org_acronym
              });
              
              // Use activityId if we found activity by ID, otherwise use iati_identifier
              let fallbackUpdateQuery;
              if (foundByActivityId && activityId) {
                // Update by activityId (importing into specific existing activity)
                fallbackUpdateQuery = supabase
                  .from('activities')
                  .update(updatePayload)
                  .eq('id', activityId);
                console.log(`[Import as Reporting Org] Fallback: Updating activity by ID: ${activityId}`);
              } else {
                // Update by iati_identifier (fallback behavior)
                fallbackUpdateQuery = supabase
                  .from('activities')
                  .update(updatePayload)
                  .eq('iati_identifier', iatiIdentifier);
                console.log(`[Import as Reporting Org] Fallback: Updating activity by iati_identifier: ${iatiIdentifier}`);
              }
              
              const { data: updated, error: updateError } = await fallbackUpdateQuery
                .select('id, iati_identifier')
                .single();
              
              if (updateError) {
                console.error(`[Import as Reporting Org] Error updating activity ${iatiIdentifier}:`, updateError);
                importErrors.push({ iatiIdentifier, error: `Update failed: ${updateError.message}` });
                continue;
              }
              
              if (!updated) {
                console.error(`[Import as Reporting Org] Update returned no data for ${iatiIdentifier}`);
                importErrors.push({ iatiIdentifier, error: 'Update returned no data' });
                continue;
              }
              
              finalActivityId = updated.id;
              activityResult = updated;
              importedActivities.push(updated);
              console.log(`[Import as Reporting Org] Updated activity after insert conflict: ${iatiIdentifier} (ID: ${updated.id})`);
            } else {
              importErrors.push({ iatiIdentifier, error: errorMsg });
              continue;
            }
          } else {
            if (!inserted) {
              console.error(`[Import as Reporting Org] Insert returned no data for ${iatiIdentifier}`);
              importErrors.push({ iatiIdentifier, error: 'Insert returned no data' });
              continue;
            }
            
            finalActivityId = inserted.id;
            activityResult = inserted;
            importedActivities.push(inserted);
            console.log(`[Import as Reporting Org] Successfully imported activity: ${iatiIdentifier} (ID: ${inserted.id})`);
          }
        }

        // Verify what was actually saved to the database
        if (finalActivityId) {
          // CRITICAL: Query directly from database to see what's actually stored
          const { data: verifyActivity, error: verifyError } = await supabase
            .from('activities')
            .select('id, iati_identifier, reporting_org_id, reporting_org_ref, reporting_org_iati_id, reporting_org_name, created_by_org_name, created_by_org_acronym, created_by')
            .eq('id', finalActivityId)
            .single();
          
          // Also check if there's a view or join that might be overriding values
          console.log(`[Import as Reporting Org] 🔍 DIRECT DATABASE QUERY RESULT:`, {
            id: verifyActivity?.id,
            iati_identifier: verifyActivity?.iati_identifier,
            reporting_org_id: verifyActivity?.reporting_org_id,
            reporting_org_ref: verifyActivity?.reporting_org_ref,
            reporting_org_iati_id: verifyActivity?.reporting_org_iati_id,
            reporting_org_name: verifyActivity?.reporting_org_name,
            created_by_org_name: verifyActivity?.created_by_org_name,
            created_by_org_acronym: verifyActivity?.created_by_org_acronym,
            created_by: verifyActivity?.created_by,
            note: 'These are the ACTUAL values in the database right now'
          });

          if (verifyError) {
            console.error(`[Import as Reporting Org] ❌ Error verifying saved activity:`, verifyError);
          } else {
            const expectedOrgId = reportingOrgId;
            const expectedOrgRef = reportingOrgRef;
            const expectedOrgName = reportingOrgNameFromDB || meta.reportingOrgName || reportingOrgRef;
            
            console.log(`[Import as Reporting Org] ✅ Verified saved activity data:`, {
              id: verifyActivity.id,
              iati_identifier: verifyActivity.iati_identifier,
              reporting_org_id: verifyActivity.reporting_org_id,
              reporting_org_ref: verifyActivity.reporting_org_ref,
              reporting_org_iati_id: verifyActivity.reporting_org_iati_id,
              reporting_org_name: verifyActivity.reporting_org_name,
              created_by_org_name: verifyActivity.created_by_org_name,
              created_by_org_acronym: verifyActivity.created_by_org_acronym,
              created_by: verifyActivity.created_by
            });
            
            // Compare expected vs actual values
            console.log(`[Import as Reporting Org] 🔍 EXPECTED vs ACTUAL comparison:`, {
              reporting_org_id: {
                expected: expectedOrgId,
                actual: verifyActivity.reporting_org_id,
                match: expectedOrgId === verifyActivity.reporting_org_id
              },
              reporting_org_ref: {
                expected: expectedOrgRef,
                actual: verifyActivity.reporting_org_ref,
                match: expectedOrgRef === verifyActivity.reporting_org_ref
              },
              reporting_org_iati_id: {
                expected: expectedOrgRef,
                actual: verifyActivity.reporting_org_iati_id,
                match: expectedOrgRef === verifyActivity.reporting_org_iati_id
              },
              reporting_org_name: {
                expected: expectedOrgName,
                actual: verifyActivity.reporting_org_name,
                match: expectedOrgName === verifyActivity.reporting_org_name
              },
              created_by_org_name: {
                expected: expectedOrgName,
                actual: verifyActivity.created_by_org_name,
                match: expectedOrgName === verifyActivity.created_by_org_name
              },
              created_by_org_acronym: {
                expected: reportingOrgAcronym,
                actual: verifyActivity.created_by_org_acronym,
                match: reportingOrgAcronym === verifyActivity.created_by_org_acronym
              }
            });
            
            // Alert if fields are unexpectedly NULL or don't match
            if (!verifyActivity.reporting_org_id) {
              console.error(`[Import as Reporting Org] ⚠️  WARNING: reporting_org_id is NULL after update! Expected: ${expectedOrgId}`);
            } else if (expectedOrgId && verifyActivity.reporting_org_id !== expectedOrgId) {
              console.error(`[Import as Reporting Org] ⚠️  WARNING: reporting_org_id mismatch! Expected: ${expectedOrgId}, Got: ${verifyActivity.reporting_org_id}`);
            }
            
            if (!verifyActivity.created_by_org_name) {
              console.error(`[Import as Reporting Org] ⚠️  WARNING: created_by_org_name is NULL after update! Expected: ${expectedOrgName}`);
            } else if (expectedOrgName && verifyActivity.created_by_org_name !== expectedOrgName) {
              console.error(`[Import as Reporting Org] ⚠️  WARNING: created_by_org_name mismatch! Expected: ${expectedOrgName}, Got: ${verifyActivity.created_by_org_name}`);
            }
            
            if (expectedOrgRef && verifyActivity.reporting_org_ref !== expectedOrgRef) {
              console.error(`[Import as Reporting Org] ⚠️  WARNING: reporting_org_ref mismatch! Expected: ${expectedOrgRef}, Got: ${verifyActivity.reporting_org_ref}`);
            }
            
            // Success message if everything matches
            if (expectedOrgId && verifyActivity.reporting_org_id === expectedOrgId && 
                expectedOrgName && verifyActivity.created_by_org_name === expectedOrgName) {
              console.log(`[Import as Reporting Org] ✅ SUCCESS: Reporting org correctly set to ${expectedOrgName} (${expectedOrgRef})`);
            }
          }
        }

        // Get the activity ID (either from inserted or updated)
        if (!finalActivityId) {
          console.error(`[Import as Reporting Org] Could not determine activity ID for ${iatiIdentifier}`);
          continue;
        }

        // Handle budgets, transactions, and planned disbursements if selected
        const parsedActivity = iati_data?._parsedActivity;
        console.log(`[Import as Reporting Org] DEBUG - Checking for complex fields for activity ${finalActivityId}`);
        console.log(`[Import as Reporting Org] DEBUG - parsedActivity exists:`, !!parsedActivity);
        console.log(`[Import as Reporting Org] DEBUG - fields exists:`, !!fields);
        console.log(`[Import as Reporting Org] DEBUG - fields type:`, typeof fields);
        console.log(`[Import as Reporting Org] DEBUG - fields keys count:`, fields ? Object.keys(fields).length : 0);
        console.log(`[Import as Reporting Org] DEBUG - fields keys (first 20):`, fields ? Object.keys(fields).slice(0, 20) : 'N/A');
        
        // Log all budget/transaction/planned disbursement field keys
        if (fields) {
          const budgetKeys = Object.keys(fields).filter(key => key.includes('budget'));
          const transactionKeys = Object.keys(fields).filter(key => key.includes('transaction'));
          const plannedDisbursementKeys = Object.keys(fields).filter(key => key.includes('planned-disbursement') || key.includes('plannedDisbursement'));
          console.log(`[Import as Reporting Org] DEBUG - Budget field keys found:`, budgetKeys);
          console.log(`[Import as Reporting Org] DEBUG - Transaction field keys found:`, transactionKeys);
          console.log(`[Import as Reporting Org] DEBUG - Planned Disbursement field keys found:`, plannedDisbursementKeys);
        }
        
        if (parsedActivity) {
          console.log(`[Import as Reporting Org] DEBUG - parsedActivity.budgets:`, parsedActivity.budgets ? `${parsedActivity.budgets.length} items` : 'undefined');
          console.log(`[Import as Reporting Org] DEBUG - parsedActivity.transactions:`, parsedActivity.transactions ? `${parsedActivity.transactions.length} items` : 'undefined');
          console.log(`[Import as Reporting Org] DEBUG - parsedActivity.plannedDisbursements:`, parsedActivity.plannedDisbursements ? `${parsedActivity.plannedDisbursements.length} items` : 'undefined');
          
          // Log sample budget/transaction/planned disbursement data
          if (parsedActivity.budgets && parsedActivity.budgets.length > 0) {
            console.log(`[Import as Reporting Org] DEBUG - Sample budget:`, JSON.stringify(parsedActivity.budgets[0], null, 2));
          }
          if (parsedActivity.transactions && parsedActivity.transactions.length > 0) {
            console.log(`[Import as Reporting Org] DEBUG - Sample transaction:`, JSON.stringify(parsedActivity.transactions[0], null, 2));
          }
          if (parsedActivity.plannedDisbursements && parsedActivity.plannedDisbursements.length > 0) {
            console.log(`[Import as Reporting Org] DEBUG - Sample planned disbursement:`, JSON.stringify(parsedActivity.plannedDisbursements[0], null, 2));
          }
        } else {
          console.log(`[Import as Reporting Org] DEBUG - iati_data structure:`, iati_data ? Object.keys(iati_data) : 'iati_data is null/undefined');
        }
        
        if (parsedActivity && fields) {
          // Check if any budget field is selected
          const hasBudgetFields = Object.keys(fields).some(key => key.startsWith('iati-activity/budget['));
          console.log(`[Import as Reporting Org] DEBUG - hasBudgetFields:`, hasBudgetFields);
          console.log(`[Import as Reporting Org] DEBUG - Budget field check details:`, {
            fieldsIsObject: typeof fields === 'object',
            fieldsKeysLength: Object.keys(fields).length,
            matchingKeys: Object.keys(fields).filter(key => key.startsWith('iati-activity/budget['))
          });
          
          // Fallback: If any fields are selected and parsedActivity has budgets, import them
          // This handles cases where field path matching might fail but user wants to import
          const hasAnyFieldsSelected = Object.keys(fields).length > 0;
          const shouldImportBudgets = hasBudgetFields || (hasAnyFieldsSelected && parsedActivity.budgets && Array.isArray(parsedActivity.budgets) && parsedActivity.budgets.length > 0);
          
          if (shouldImportBudgets && parsedActivity.budgets && Array.isArray(parsedActivity.budgets)) {
            console.log(`[Import as Reporting Org] Importing ${parsedActivity.budgets.length} budgets for activity ${finalActivityId}`);
            
            // Clear existing budgets
            await supabase
              .from('activity_budgets')
              .delete()
              .eq('activity_id', finalActivityId);
            
            // Insert new budgets
            // Note: Try 'amount' first (newer schema), fallback to 'value' if that fails
            const validBudgets = parsedActivity.budgets
              .filter((budget: any) => budget && budget.value !== undefined)
              .map((budget: any) => {
                // Resolve currency - use budget currency, fallback to activity default, then USD
                const resolvedCurrency = budget.currency || parsedActivity.defaultCurrency || 'USD';
                return {
                  activity_id: finalActivityId,
                  type: parseInt(budget.type) || 1, // SMALLINT: 1 = Original, 2 = Revised
                  status: parseInt(budget.status) || 1, // SMALLINT: 1 = Indicative, 2 = Committed
                  period_start: budget.period?.start || null,
                  period_end: budget.period?.end || null,
                  value: budget.value, // Using 'value' as the error suggests 'amount' doesn't exist
                  currency: resolvedCurrency,
                  value_date: budget.valueDate || null
                };
              });
            
            if (validBudgets.length > 0) {
              const { error: budgetsError } = await supabase
                .from('activity_budgets')
                .insert(validBudgets);
              
              if (budgetsError) {
                console.error(`[Import as Reporting Org] Error inserting budgets:`, budgetsError);
              } else {
                console.log(`[Import as Reporting Org] ✓ Imported ${validBudgets.length} budgets`);
              }
            }
          }

          // Check if any transaction field is selected
          const hasTransactionFields = Object.keys(fields).some(key => key.startsWith('iati-activity/transaction['));
          console.log(`[Import as Reporting Org] DEBUG - hasTransactionFields:`, hasTransactionFields);
          
          // Fallback: If any fields are selected and parsedActivity has transactions, import them
          const shouldImportTransactions = hasTransactionFields || (hasAnyFieldsSelected && parsedActivity.transactions && Array.isArray(parsedActivity.transactions) && parsedActivity.transactions.length > 0);
          
          if (shouldImportTransactions && parsedActivity.transactions && Array.isArray(parsedActivity.transactions)) {
            console.log(`[Import as Reporting Org] Importing ${parsedActivity.transactions.length} transactions for activity ${finalActivityId}`);
            
            // Get existing transactions to check for duplicates
            const { data: existingTransactions } = await supabase
              .from('transactions')
              .select('transaction_type, transaction_date, value, currency')
              .eq('activity_id', finalActivityId);
            
            const existingSignatures = new Set(
              (existingTransactions || []).map((t: any) => 
                `${t.transaction_type}-${t.transaction_date}-${t.value}-${t.currency}`
              )
            );
            
            // Filter out duplicates and prepare transactions with USD conversion
            const validTransactions: any[] = [];
            for (const t of parsedActivity.transactions) {
              if (!t || t.value === undefined) continue;
              const signature = `${t.type}-${t.date}-${t.value}-${t.currency || 'USD'}`;
              if (existingSignatures.has(signature)) continue;
              
              const transactionData = {
                activity_id: finalActivityId,
                transaction_type: t.type,
                transaction_date: t.date || null,
                value: t.value,
                currency: t.currency || parsedActivity.defaultCurrency || 'USD',
                status: 'actual',
                description: t.description || null,
                provider_org_ref: t.providerOrg?.ref || null,
                provider_org_name: t.providerOrg?.name || null,
                provider_org_activity_id: t.providerOrg?.providerActivityId || null,
                receiver_org_ref: t.receiverOrg?.ref || null,
                receiver_org_name: t.receiverOrg?.name || null,
                receiver_org_activity_id: t.receiverOrg?.receiverActivityId || null,
                // Extract code values from objects - aidType can be {code: "A01", vocabulary: "1"}
                aid_type: extractCodeValue(t.aidType),
                finance_type: extractCodeValue(t.financeType),
                tied_status: extractCodeValue(t.tiedStatus),
                flow_type: extractCodeValue(t.flowType),
                disbursement_channel: extractCodeValue(t.disbursementChannel),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              
              // Convert to USD
              const usdResult = await convertTransactionToUSD(
                transactionData.value,
                transactionData.currency,
                transactionData.transaction_date || new Date().toISOString()
              );
              
              if (usdResult.success) {
                console.log(`[Import as Reporting Org] USD conversion: ${transactionData.value} ${transactionData.currency} = $${usdResult.value_usd} USD`);
              } else {
                console.warn(`[Import as Reporting Org] USD conversion failed: ${usdResult.error}`);
              }
              
              // Add USD fields to transaction data
              const transactionDataWithUSD = addUSDFieldsToTransaction(transactionData, usdResult);
              validTransactions.push(transactionDataWithUSD);
            }
            
            if (validTransactions.length > 0) {
              const { error: transactionsError } = await supabase
                .from('transactions')
                .insert(validTransactions);
              
              if (transactionsError) {
                console.error(`[Import as Reporting Org] Error inserting transactions:`, transactionsError);
              } else {
                console.log(`[Import as Reporting Org] ✓ Imported ${validTransactions.length} transactions`);
              }
            }
          }

          // Check if any planned disbursement field is selected
          const hasPlannedDisbursementFields = Object.keys(fields).some(key => key.startsWith('iati-activity/planned-disbursement['));
          console.log(`[Import as Reporting Org] DEBUG - hasPlannedDisbursementFields:`, hasPlannedDisbursementFields);
          
          // Fallback: If any fields are selected and parsedActivity has planned disbursements, import them
          const shouldImportPlannedDisbursements = hasPlannedDisbursementFields || (hasAnyFieldsSelected && parsedActivity.plannedDisbursements && Array.isArray(parsedActivity.plannedDisbursements) && parsedActivity.plannedDisbursements.length > 0);
          
          if (shouldImportPlannedDisbursements && parsedActivity.plannedDisbursements && Array.isArray(parsedActivity.plannedDisbursements)) {
            console.log(`[Import as Reporting Org] Importing ${parsedActivity.plannedDisbursements.length} planned disbursements for activity ${finalActivityId}`);
            
            // Clear existing planned disbursements
            await supabase
              .from('planned_disbursements')
              .delete()
              .eq('activity_id', finalActivityId);
            
            // Process organizations for planned disbursements
            const pdOrgMap = new Map<string, string>();
            
            for (const pd of parsedActivity.plannedDisbursements) {
              // Process provider organization
              if (pd.providerOrg?.ref || pd.providerOrg?.name) {
                const key = pd.providerOrg.ref || pd.providerOrg.name!;
                if (!pdOrgMap.has(key)) {
                  const orgId = await getOrCreateOrganization(supabase, {
                    ref: pd.providerOrg.ref,
                    name: pd.providerOrg.name,
                    type: pd.providerOrg.type
                  });
                  if (orgId) {
                    pdOrgMap.set(key, orgId);
                    if (pd.providerOrg.ref) pdOrgMap.set(pd.providerOrg.ref, orgId);
                    if (pd.providerOrg.name) pdOrgMap.set(pd.providerOrg.name, orgId);
                  }
                }
              }
              
              // Process receiver organization
              if (pd.receiverOrg?.ref || pd.receiverOrg?.name) {
                const key = pd.receiverOrg.ref || pd.receiverOrg.name!;
                if (!pdOrgMap.has(key)) {
                  const orgId = await getOrCreateOrganization(supabase, {
                    ref: pd.receiverOrg.ref,
                    name: pd.receiverOrg.name,
                    type: pd.receiverOrg.type
                  });
                  if (orgId) {
                    pdOrgMap.set(key, orgId);
                    if (pd.receiverOrg.ref) pdOrgMap.set(pd.receiverOrg.ref, orgId);
                    if (pd.receiverOrg.name) pdOrgMap.set(pd.receiverOrg.name, orgId);
                  }
                }
              }
            }
            
            // Insert new planned disbursements with resolved organization IDs
            const validPDs = parsedActivity.plannedDisbursements
              .filter((pd: any) => pd && pd.value !== undefined)
              .map((pd: any) => {
                // Resolve currency - use PD currency, fallback to activity default, then USD
                const resolvedCurrency = pd.currency || parsedActivity.defaultCurrency || 'USD';
                
                // Look up organization IDs
                const providerOrgId = pd.providerOrg?.ref ?
                  pdOrgMap.get(pd.providerOrg.ref) :
                  (pd.providerOrg?.name ? pdOrgMap.get(pd.providerOrg.name) : null);
                
                const receiverOrgId = pd.receiverOrg?.ref ?
                  pdOrgMap.get(pd.receiverOrg.ref) :
                  (pd.receiverOrg?.name ? pdOrgMap.get(pd.receiverOrg.name) : null);
                
                return {
                  activity_id: finalActivityId,
                  period_start: pd.period?.start || null,
                  period_end: pd.period?.end || null,
                  amount: pd.value,
                  currency: resolvedCurrency,
                  value_date: pd.valueDate || null,
                  provider_org_id: providerOrgId || null,
                  provider_org_ref: pd.providerOrg?.ref || null,
                  provider_org_name: pd.providerOrg?.name || null,
                  provider_org_activity_id: pd.providerOrg?.providerActivityId || null,
                  receiver_org_id: receiverOrgId || null,
                  receiver_org_ref: pd.receiverOrg?.ref || null,
                  receiver_org_name: pd.receiverOrg?.name || null,
                  receiver_org_activity_id: pd.receiverOrg?.receiverActivityId || null
                };
              });
            
            if (validPDs.length > 0) {
              const { error: pdError } = await supabase
                .from('planned_disbursements')
                .insert(validPDs);
              
              if (pdError) {
                console.error(`[Import as Reporting Org] Error inserting planned disbursements:`, pdError);
              } else {
                console.log(`[Import as Reporting Org] ✓ Imported ${validPDs.length} planned disbursements`);
              }
            }
          }
        }

        // Handle sectors if provided
        const sectorsData = 
          iati_data?.sectors ||
          parsedActivity?.sectors ||
          [];

        if (sectorsData && Array.isArray(sectorsData) && sectorsData.length > 0) {
          console.log(`[Import as Reporting Org] Importing ${sectorsData.length} sectors`);

          // Clear existing sectors
          await supabase
            .from('activity_sectors')
            .delete()
            .eq('activity_id', finalActivityId);

          // Insert activity-sector relationships
          // Note: activity_sectors table uses sector_code, sector_name, sector_percentage columns
          const sectorRelations = sectorsData.map((s: any) => ({
            activity_id: finalActivityId,
            sector_code: s.code,
            sector_name: s.name || `Sector ${s.code}`,
            sector_percentage: s.percentage || 0,
            sector_category_code: s.code?.substring(0, 3) || null,
            sector_category_name: s.categoryName || null,
            type: 'secondary'
          }));

          if (sectorRelations.length > 0) {
            const { error: sectorsError } = await supabase
              .from('activity_sectors')
              .insert(sectorRelations);

            if (sectorsError) {
              console.error(`[Import as Reporting Org] Error inserting sectors:`, sectorsError);
            } else {
              console.log(`[Import as Reporting Org] ✓ Imported ${sectorRelations.length} sectors`);
            }
          }
        }

        // Handle recipient countries (JSONB field on activities table)
        // Priority: iati_data > parsedActivity (frontend) > activityData (server XML parse)
        const recipientCountries =
          iati_data?.recipient_countries ||
          parsedActivity?.recipientCountries ||
          activityData?.recipientCountries ||
          [];

        console.log(`[Import as Reporting Org] Recipient countries sources:`, {
          fromIatiData: iati_data?.recipient_countries?.length || 0,
          fromParsedActivity: parsedActivity?.recipientCountries?.length || 0,
          fromActivityData: activityData?.recipientCountries?.length || 0,
          finalCount: recipientCountries.length
        });

        if (recipientCountries && Array.isArray(recipientCountries) && recipientCountries.length > 0) {
          console.log(`[Import as Reporting Org] Processing ${recipientCountries.length} recipient countries`);
          
          const formattedCountries = recipientCountries.map((country: any) => ({
            id: country.id || `country-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            country: {
              code: country.country?.code || country.code,
              name: country.country?.name || country.name,
              iso2: country.country?.iso2 || country.code,
              withdrawn: country.country?.withdrawn || false
            },
            percentage: country.percentage || 0,
            vocabulary: country.vocabulary || 'A4',
            vocabularyUri: country.vocabularyUri || null,
            narrative: country.narrative || null
          }));
          
          const { error: countriesError } = await supabase
            .from('activities')
            .update({ recipient_countries: formattedCountries })
            .eq('id', finalActivityId);
          
          if (countriesError) {
            console.error(`[Import as Reporting Org] Error updating recipient countries:`, countriesError);
          } else {
            console.log(`[Import as Reporting Org] ✓ Processed ${formattedCountries.length} recipient countries`);
          }
        }

        // Handle recipient regions (JSONB field on activities table)
        // Priority: iati_data > parsedActivity (frontend) > activityData (server XML parse)
        const recipientRegions =
          iati_data?.recipient_regions ||
          parsedActivity?.recipientRegions ||
          activityData?.recipientRegions ||
          [];

        console.log(`[Import as Reporting Org] Recipient regions sources:`, {
          fromIatiData: iati_data?.recipient_regions?.length || 0,
          fromParsedActivity: parsedActivity?.recipientRegions?.length || 0,
          fromActivityData: activityData?.recipientRegions?.length || 0,
          finalCount: recipientRegions.length
        });

        if (recipientRegions && Array.isArray(recipientRegions) && recipientRegions.length > 0) {
          console.log(`[Import as Reporting Org] Processing ${recipientRegions.length} recipient regions`);
          
          const formattedRegions = recipientRegions.map((region: any) => ({
            id: region.id || `region-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            region: {
              code: region.region?.code || region.code,
              name: region.region?.name || region.name,
              withdrawn: region.region?.withdrawn || false
            },
            percentage: region.percentage || 0,
            vocabulary: region.vocabulary || '1',
            vocabularyUri: region.vocabularyUri || null,
            narrative: region.narrative || null
          }));
          
          const { error: regionsError } = await supabase
            .from('activities')
            .update({ recipient_regions: formattedRegions })
            .eq('id', finalActivityId);
          
          if (regionsError) {
            console.error(`[Import as Reporting Org] Error updating recipient regions:`, regionsError);
          } else {
            console.log(`[Import as Reporting Org] ✓ Processed ${formattedRegions.length} recipient regions`);
          }
        }

        // Handle custom geographies (vocabulary 99)
        const customGeographies = 
          iati_data?.custom_geographies ||
          parsedActivity?.customGeographies ||
          [];

        if (customGeographies && Array.isArray(customGeographies) && customGeographies.length > 0) {
          console.log(`[Import as Reporting Org] Processing ${customGeographies.length} custom geographies`);
          
          const formattedGeos = customGeographies.map((geo: any) => ({
            id: geo.id || `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: geo.name,
            code: geo.code,
            percentage: geo.percentage || 0,
            vocabulary: geo.vocabulary || '99',
            vocabularyUri: geo.vocabularyUri || null,
            narrative: geo.narrative || null
          }));
          
          const { error: geoError } = await supabase
            .from('activities')
            .update({ custom_geographies: formattedGeos })
            .eq('id', finalActivityId);
          
          if (geoError) {
            console.error(`[Import as Reporting Org] Error updating custom geographies:`, geoError);
          } else {
            console.log(`[Import as Reporting Org] ✓ Processed ${formattedGeos.length} custom geographies`);
          }
        }

        // Handle tags
        const tagsData = 
          iati_data?.tags ||
          parsedActivity?.tagClassifications ||
          [];

        if (tagsData && Array.isArray(tagsData) && tagsData.length > 0) {
          console.log(`[Import as Reporting Org] Processing ${tagsData.length} tags`);
          
          try {
            // Clear existing activity_tags relationships
            await supabase
              .from('activity_tags')
              .delete()
              .eq('activity_id', finalActivityId);

            // Insert new tags
            for (const tag of tagsData) {
              // Check if tag exists in tags table
              const { data: existingTag } = await supabase
                .from('tags')
                .select('id')
                .eq('code', tag.code)
                .eq('vocabulary', tag.vocabulary || '1')
                .maybeSingle();

              let tagId = existingTag?.id;

              // If tag doesn't exist, create it
              if (!tagId) {
                const { data: newTag, error: tagError } = await supabase
                  .from('tags')
                  .insert({
                    code: tag.code,
                    name: tag.narrative || tag.name || `Tag ${tag.code}`,
                    vocabulary: tag.vocabulary || '1',
                    vocabulary_uri: tag.vocabularyUri || null
                  })
                  .select('id')
                  .single();

                if (tagError) {
                  console.error('[Import as Reporting Org] Error creating tag:', tagError);
                  continue;
                }

                tagId = newTag.id;
              }

              // Create activity-tag relationship
              await supabase
                .from('activity_tags')
                .insert({
                  activity_id: finalActivityId,
                  tag_id: tagId
                });
            }

            console.log(`[Import as Reporting Org] ✓ Imported ${tagsData.length} tags`);
          } catch (error) {
            console.error('[Import as Reporting Org] Error importing tags:', error);
          }
        }

        // Handle locations
        const locationsData = 
          iati_data?.locations ||
          parsedActivity?.locations ||
          [];

        if (locationsData && Array.isArray(locationsData) && locationsData.length > 0) {
          console.log(`[Import as Reporting Org] Importing ${locationsData.length} locations`);
          
          // Clear existing locations
          await supabase
            .from('activity_locations')
            .delete()
            .eq('activity_id', finalActivityId);
          
          // Process each location
          const locationEntries = locationsData.map((loc: any) => {
            // Parse coordinates if present
            let latitude = null;
            let longitude = null;
            if (loc.point?.pos) {
              const coords = loc.point.pos.split(' ');
              if (coords.length === 2) {
                latitude = parseFloat(coords[0]);
                longitude = parseFloat(coords[1]);
              }
            }
            
            // Determine location type - site if has coordinates, coverage otherwise
            const locationType = (latitude && longitude) ? 'site' : 'coverage';
            
            const locationEntry: any = {
              activity_id: finalActivityId,
              location_type: locationType,
              location_name: loc.name || 'Unnamed Location',
              description: loc.description,
              location_description: loc.description,
              activity_location_description: loc.activityDescription,
              srs_name: loc.point?.srsName || 'http://www.opengis.net/def/crs/EPSG/0/4326',
              
              // IATI location reference
              location_ref: loc.ref || undefined,
              
              // IATI fields
              location_reach: loc.locationReach || undefined,
              exactness: loc.exactness || undefined,
              location_class: loc.locationClass || undefined,
              feature_designation: loc.featureDesignation,
              
              // Gazetteer
              location_id_vocabulary: loc.locationId?.vocabulary,
              location_id_code: loc.locationId?.code,
              
              // Administrative
              admin_vocabulary: loc.administrative?.vocabulary,
              admin_level: loc.administrative?.level,
              admin_code: loc.administrative?.code,
              
              // Metadata
              source: 'import',
              validation_status: 'valid',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            // Add coordinates if available
            if (locationType === 'site' && latitude && longitude) {
              locationEntry.latitude = latitude;
              locationEntry.longitude = longitude;
            }
            
            // Add coverage-specific fields
            if (locationType === 'coverage') {
              locationEntry.coverage_scope = 'regional';
            }
            
            return locationEntry;
          });
          
          if (locationEntries.length > 0) {
            const { error: locationsError } = await supabase
              .from('activity_locations')
              .insert(locationEntries);
            
            if (locationsError) {
              console.error(`[Import as Reporting Org] Error inserting locations:`, locationsError);
            } else {
              console.log(`[Import as Reporting Org] ✓ Imported ${locationEntries.length} locations`);
            }
          }
        }

        // Handle document links
        const documentLinks = 
          iati_data?.document_links ||
          parsedActivity?.documentLinks ||
          [];

        if (documentLinks && Array.isArray(documentLinks) && documentLinks.length > 0) {
          console.log(`[Import as Reporting Org] Importing ${documentLinks.length} document links`);
          
          // Get existing documents to delete their categories first
          const { data: existingDocs } = await supabase
            .from('activity_documents')
            .select('id')
            .eq('activity_id', finalActivityId);
          
          // Delete categories first (to avoid foreign key issues)
          if (existingDocs && existingDocs.length > 0) {
            const docIds = existingDocs.map(d => d.id);
            await supabase
              .from('activity_document_categories')
              .delete()
              .in('document_id', docIds);
          }
          
          // Clear existing document links
          await supabase
            .from('activity_documents')
            .delete()
            .eq('activity_id', finalActivityId);
          
          // Insert new document links
          let importedDocsCount = 0;
          for (const doc of documentLinks) {
            // Get category codes - support both new array format and legacy single category
            const categoryCodes = doc.category_codes && Array.isArray(doc.category_codes)
              ? doc.category_codes
              : (doc.category_code ? [doc.category_code] : ['A01']);
            
            const firstCategoryCode = categoryCodes.length > 0 ? categoryCodes[0] : 'A01';
            
            // Ensure title is in the correct format (array of narratives)
            const titleArray = Array.isArray(doc.title) ? doc.title : (doc.title ? [{ text: doc.title, lang: 'en' }] : [{ text: 'Document', lang: 'en' }]);
            const descriptionArray = Array.isArray(doc.description) ? doc.description : (doc.description ? [{ text: doc.description, lang: 'en' }] : []);
            
            const docData = {
              activity_id: finalActivityId,
              format: doc.format || 'application/octet-stream',
              url: doc.url,
              title: titleArray,
              description: descriptionArray,
              category_code: firstCategoryCode,
              language_codes: Array.isArray(doc.language_code) ? doc.language_code : [doc.language_code || 'en'],
              document_date: doc.document_date || null,
              is_external: true,
              uploaded_by: null,
              file_name: null,
              file_size: 0,
              file_path: null,
              thumbnail_url: null
            };
            
            // Insert document and get ID
            const { data: insertedDoc, error: docsError } = await supabase
              .from('activity_documents')
              .insert(docData)
              .select('id')
              .single();
            
            if (docsError || !insertedDoc) {
              console.error('[Import as Reporting Org] Error inserting document link:', docsError);
              continue;
            }
            
            importedDocsCount++;
            
            // Insert all categories into junction table
            if (categoryCodes.length > 0) {
              const categoryData = categoryCodes.map((code: string) => ({
                document_id: insertedDoc.id,
                category_code: code
              }));
              
              const { error: categoryError } = await supabase
                .from('activity_document_categories')
                .insert(categoryData);
              
              if (categoryError) {
                console.error('[Import as Reporting Org] Error inserting document categories:', categoryError);
              }
            }
          }
          
          console.log(`[Import as Reporting Org] ✓ Imported ${importedDocsCount} document links`);
        }

        // Handle participating organizations
        // Priority: iati_data > parsedActivity (frontend) > activityData (server XML parse)
        const participatingOrgsData =
          iati_data?.importedParticipatingOrgs ||
          iati_data?.participating_orgs ||
          parsedActivity?.participatingOrgs ||
          activityData?.participatingOrgs ||
          [];

        console.log(`[Import as Reporting Org] Participating orgs sources:`, {
          fromIatiDataImported: iati_data?.importedParticipatingOrgs?.length || 0,
          fromIatiDataOrgs: iati_data?.participating_orgs?.length || 0,
          fromParsedActivity: parsedActivity?.participatingOrgs?.length || 0,
          fromActivityData: activityData?.participatingOrgs?.length || 0,
          finalCount: participatingOrgsData.length
        });

        if (participatingOrgsData && participatingOrgsData.length > 0) {
          console.log(`[Import as Reporting Org] Importing ${participatingOrgsData.length} participating organizations`);
          
          // Clear existing participating organizations for this activity
          await supabase
            .from('activity_participating_organizations')
            .delete()
            .eq('activity_id', finalActivityId);
          
          // Process each participating organization
          const processedOrgs = [];
          for (let index = 0; index < participatingOrgsData.length; index++) {
            const org = participatingOrgsData[index];
            const orgName = org.name || org.narrative || org.ref || 'Unknown Organization';
            const orgRef = org.ref || org.validated_ref || org.original_ref || null;
            
            let orgId: string | null = null;
            
            // Try to find existing organization by IATI ID
            if (orgRef) {
              const { data: existingOrg } = await supabase
                .from('organizations')
                .select('id, name')
                .eq('iati_org_id', orgRef)
                .maybeSingle();
              
              if (existingOrg) {
                orgId = existingOrg.id;
                console.log(`[Import as Reporting Org] ✓ Found org by IATI ID: ${existingOrg.name}`);
              } else {
                // Try alias_refs
                const { data: aliasOrgs } = await supabase
                  .from('organizations')
                  .select('id, name, alias_refs')
                  .not('alias_refs', 'is', null);
                
                const aliasMatch = aliasOrgs?.find(o => 
                  o.alias_refs && Array.isArray(o.alias_refs) && o.alias_refs.includes(orgRef)
                );
                
                if (aliasMatch) {
                  orgId = aliasMatch.id;
                  console.log(`[Import as Reporting Org] ✓ Found org by alias: ${aliasMatch.name}`);
                }
              }
            }
            
            // Try to find by name if not found by ref
            if (!orgId && orgName && orgName !== 'Unknown Organization') {
              const { data: nameMatch } = await supabase
                .from('organizations')
                .select('id, name')
                .ilike('name', orgName)
                .maybeSingle();
              
              if (nameMatch) {
                orgId = nameMatch.id;
                console.log(`[Import as Reporting Org] ✓ Found org by name: ${nameMatch.name}`);
              }
            }
            
            // Create organization if not found
            if (!orgId) {
              try {
                const { data: newOrg, error: createError } = await supabase
                  .from('organizations')
                  .insert({
                    name: orgName,
                    iati_org_id: orgRef,
                    alias_refs: orgRef ? [orgRef] : [],
                    type: org.type || 'other',
                    country: null
                  })
                  .select('id, name')
                  .single();
                
                if (newOrg && !createError) {
                  orgId = newOrg.id;
                  console.log(`[Import as Reporting Org] ✓ Created new org: ${newOrg.name}`);
                } else if (createError) {
                  // Try to find it again (might be duplicate)
                  if (orgRef) {
                    const { data: existing } = await supabase
                      .from('organizations')
                      .select('id')
                      .eq('iati_org_id', orgRef)
                      .maybeSingle();
                    if (existing) orgId = existing.id;
                  }
                  if (!orgId && orgName) {
                    const { data: existing } = await supabase
                      .from('organizations')
                      .select('id')
                      .ilike('name', orgName)
                      .maybeSingle();
                    if (existing) orgId = existing.id;
                  }
                }
              } catch (err) {
                console.error(`[Import as Reporting Org] Error creating org ${orgName}:`, err);
              }
            }
            
            if (orgId) {
              // Map IATI role codes to our role types
              let roleType: 'extending' | 'implementing' | 'government' | 'funding' = 'implementing';
              const roleCode = org.role || '4';
              if (roleCode === '1') roleType = 'funding';
              else if (roleCode === '2') roleType = 'implementing';
              else if (roleCode === '3') roleType = 'extending';
              else if (roleCode === '4') roleType = 'implementing';
              
              const iatiRoleCode = parseInt(roleCode, 10);
              
              processedOrgs.push({
                activity_id: finalActivityId,
                organization_id: orgId,
                role_type: roleType,
                display_order: index,
                iati_role_code: (iatiRoleCode >= 1 && iatiRoleCode <= 4) ? iatiRoleCode : 4,
                iati_org_ref: orgRef,
                org_type: org.type || null,
                activity_id_ref: org.activityId || null,
                crs_channel_code: org.crsChannelCode || null,
                narrative: org.narrative || org.name || null,
                narrative_lang: org.narrativeLang || 'en',
                narratives: org.narratives ? JSON.stringify(org.narratives) : null,
                org_activity_id: org.activityId || null,
                reporting_org_ref: null,
                secondary_reporter: false
              });
            } else {
              console.warn(`[Import as Reporting Org] ⚠️  Could not resolve org: ${orgName} (ref: ${orgRef})`);
            }
          }
          
          // Insert participating organizations
          if (processedOrgs.length > 0) {
            const { error: insertError } = await supabase
              .from('activity_participating_organizations')
              .insert(processedOrgs);
            
            if (insertError) {
              console.error(`[Import as Reporting Org] Error inserting participating orgs:`, insertError);
            } else {
              console.log(`[Import as Reporting Org] ✓ Imported ${processedOrgs.length} participating organizations`);
            }
          }
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[Import as Reporting Org] Exception importing activity ${iatiIdentifier}:`, error);
        importErrors.push({ iatiIdentifier, error: errorMsg });
      }
    }

    // Log any import errors
    if (importErrors.length > 0) {
      console.error(`[Import as Reporting Org] Import errors:`, importErrors);
    }

    // Log import event
    try {
      await supabase
        .from('activity_import_log')
        .insert({
          imported_by: userId,
          reporting_org_ref: reportingOrgRef,
          import_mode: 'reporting_org',
          activity_count: importedActivities.length,
          skipped_count: skippedIdentifiers.length
        });
    } catch (logError) {
      console.error('[Import as Reporting Org] Error logging import:', logError);
      // Don't fail the request if logging fails
    }

    // Track analytics
    iatiAnalytics.optionSelected('reporting_org', meta.iatiId, reportingOrgRef);
    importedActivities.forEach(activity => {
      iatiAnalytics.importCompleted('reporting_org', activity.id);
    });

    console.log(`[Import as Reporting Org] Successfully imported ${importedActivities.length} activities under ${reportingOrgRef}`);

    return NextResponse.json({
      success: true,
      reporting_org_ref: reportingOrgRef,
      count: importedActivities.length,
      importedActivities: importedActivities, // Include activity IDs for frontend redirect
      skippedCount: skippedIdentifiers.length,
      skippedIdentifiers: skippedIdentifiers,
      duplicates: duplicates.length > 0 ? duplicates : undefined,
      errors: importErrors.length > 0 ? importErrors : undefined
    });

  } catch (error) {
    console.error('[Import as Reporting Org] Unexpected error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}


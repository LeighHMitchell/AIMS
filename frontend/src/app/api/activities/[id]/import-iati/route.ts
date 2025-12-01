import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';
import { getOrCreateOrganization } from '@/lib/organization-helpers';
import { validatePolicyMarkerSignificance } from '@/lib/policy-marker-validation';
import { sanitizeIatiDescription } from '@/lib/sanitize';

interface ImportRequest {
  fields: Record<string, boolean>;
  iati_data: any;
}

// Type definitions for better type safety
interface IATISector {
  code: string;
  name?: string;
  percentage?: number;
  vocabulary?: string;
}

interface IATIOrganization {
  ref?: string;
  name?: string;
  narrative?: string; // Some parsers use 'narrative' instead of 'name'
  role?: string;
  type?: string;
  activityId?: string; // IATI @activity-id attribute
  crsChannelCode?: string; // IATI @crs-channel-code attribute
  narrativeLang?: string; // xml:lang attribute for narrative
  narratives?: Array<{ lang: string; text: string }>; // Multilingual narratives
  validated_ref?: string; // Validated/corrected IATI org reference
  original_ref?: string; // Original IATI org reference before validation
  wasCorrected?: boolean; // Whether the ref was corrected during validation
}

interface IATITransaction {
  type: string;
  date: string;
  value: number;
  currency?: string;
  description?: string;
  providerOrg?: {
    ref?: string;
    name?: string;
    providerActivityId?: string;
  };
  receiverOrg?: {
    ref?: string;
    name?: string;
    receiverActivityId?: string;
  };
  aidType?: string;
  financeType?: string;
  tiedStatus?: string;
  flowType?: string;
  disbursementChannel?: string;
}

interface DBSector {
  id: string;
  code: string;
}

interface DBOrganization {
  id: string;
  name: string;
  iati_org_id?: string;
}

/**
 * Resolve currency following IATI Standard §4.2 priority order:
 * 1. Item-level currency (transaction/budget/planned disbursement)
 * 2. Activity default currency
 * 3. Organization default currency
 * 4. null (record will be skipped)
 */
function resolveCurrency(
  itemCurrency: string | undefined | null,
  activityDefaultCurrency: string | undefined | null,
  orgDefaultCurrency: string | undefined | null
): string | null {
  if (itemCurrency && itemCurrency.trim() !== '') {
    return itemCurrency.toUpperCase();
  }
  
  if (activityDefaultCurrency && activityDefaultCurrency.trim() !== '') {
    return activityDefaultCurrency.toUpperCase();
  }
  
  if (orgDefaultCurrency && orgDefaultCurrency.trim() !== '') {
    return orgDefaultCurrency.toUpperCase();
  }
  
  return null; // No currency at any level - record will be skipped
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  console.log('[IATI Import] 🚀 POST handler called');
  try {
    // Handle both sync and async params (Next.js 14/15 compatibility)
    const resolvedParams = await Promise.resolve(params);
    const activityId = resolvedParams.id;

    const body: ImportRequest = await request.json();
    const { fields, iati_data } = body;
    
    // Extract acronyms from body (if provided by user after review)
    const acronyms = (body as any).acronyms || {};
    
    // Extract reporting org fields from body (they're sent at top level, not in iati_data)
    // NOTE: For merge/fork/reference modes, we should NOT update reporting org fields
    // These fields should only be processed in import-as-reporting-org mode
    const reportingOrgName = (body as any).reporting_org_name;
    const reportingOrgRef = (body as any).reporting_org_ref;
    const reportingOrgType = (body as any).reporting_org_type;
    
    console.log('[IATI Import] Request received:', { 
      activityId,
      hasFields: !!fields,
      hasIatiData: !!iati_data,
      reportingOrgRef,
      reportingOrgName,
      note: 'This route (merge/fork/reference) should NOT update reporting org fields'
    });
    
    if (!fields || !iati_data) {
      return NextResponse.json(
        { error: 'Missing required fields: fields and iati_data' },
        { status: 400 }
      );
    }
    
    console.log('[IATI Import] 🚀 POST handler called for activity:', activityId);
    console.log('[IATI Import] Starting import for activity:', activityId);
    console.log('[IATI Import] Fields to import:', Object.keys(fields).filter(k => fields[k]));
    console.log('[IATI Import] Related activities flag:', fields.related_activities);
    console.log('[IATI Import] Related activities data present:', !!iati_data.relatedActivities);
    
    const supabase = getSupabaseAdmin();
    
    // Fetch current activity data
    const { data: currentActivity, error: fetchError } = await supabase
      .from('activities')
      .select('*')
      .eq('id', activityId)
      .single();
    
    if (fetchError || !currentActivity) {
      console.error('[IATI Import] Activity not found:', fetchError);
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }
    
    // Fetch organization default currency for IATI-compliant currency resolution
    let organizationDefaultCurrency: string | null = null;
    if (currentActivity.organization_id) {
      try {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('default_currency')
          .eq('id', currentActivity.organization_id)
          .single();
        organizationDefaultCurrency = orgData?.default_currency || null;
        console.log('[IATI Import] Organization default currency:', organizationDefaultCurrency);
      } catch (err) {
        console.warn('[IATI Import] Could not fetch organization default_currency:', err);
      }
    }
    
    // Store previous values for audit log
    const previousValues: Record<string, any> = {};
    const updatedFields: string[] = [];
    
    // Track import warnings
    const importWarnings: Array<{type: string; message: string; details?: any}> = [];
    
    // Build update object based on selected fields
    const updateData: Record<string, any> = {};
    
    // Check if there's an acronym for this activity's IATI identifier
    const activityIatiId = currentActivity.iati_identifier || iati_data.iati_identifier;
    const userProvidedAcronym = activityIatiId && acronyms[activityIatiId];
    
    if (userProvidedAcronym) {
      console.log('[IATI Import] User provided acronym for activity:', userProvidedAcronym);
    }
    
    // Simple field mappings
    // Maps from IATI field name (key) to database column name (value)
    const fieldMappings: Record<string, string> = {
      title_narrative: 'title_narrative',
      acronym: 'acronym',
      description_narrative: 'description_narrative',
      description_objectives: 'description_objectives',
      description_target_groups: 'description_target_groups',
      description_other: 'description_other',
      iati_identifier: 'iati_identifier',  // Added - was missing
      activity_status: 'activity_status',
      activity_scope: 'activity_scope',
      activity_date_start_planned: 'planned_start_date',
      activity_date_start_actual: 'actual_start_date',
      activity_date_end_planned: 'planned_end_date',
      activity_date_end_actual: 'actual_end_date',
      default_aid_type: 'default_aid_type',
      flow_type: 'default_flow_type',
      collaboration_type: 'collaboration_type',
      default_finance_type: 'default_finance_type',
      default_currency: 'default_currency',  // Added - was missing
      default_tied_status: 'default_tied_status',  // Added - was missing
      capital_spend_percentage: 'capital_spend_percentage',
      hierarchy: 'hierarchy'
    };
    
    // Description fields that need HTML sanitization
    const descriptionFields = [
      'description_narrative',
      'description_objectives',
      'description_target_groups',
      'description_other'
    ];

    // Process simple fields
    Object.entries(fieldMappings).forEach(([iatiField, dbField]) => {
      if (fields[iatiField] && iati_data[iatiField] !== undefined) {
        previousValues[dbField] = currentActivity[dbField];
        
        // Extract date string from date objects (IATI dates sometimes come as {date: "YYYY-MM-DD", narratives: []})
        let value = iati_data[iatiField];
        if (value && typeof value === 'object' && value.date) {
          value = value.date;
        }
        
        // Sanitize HTML in description fields
        if (descriptionFields.includes(iatiField) && typeof value === 'string') {
          value = sanitizeIatiDescription(value);
        }
        
        updateData[dbField] = value;
        updatedFields.push(iatiField);
      }
    });
    
    // Add user-provided acronym if available
    if (userProvidedAcronym) {
      updateData.acronym = userProvidedAcronym;
      updatedFields.push('acronym');
      console.log(`[IATI Import] Setting acronym from user input: "${userProvidedAcronym}"`);
    }
    
    // IMPORTANT: This route is for merge/fork/reference modes only
    // We should NOT update reporting org fields - preserve the existing reporting org
    // Reporting org updates are handled by the import-as-reporting-org route
    if (reportingOrgName || reportingOrgRef) {
      console.log(`[IATI Import] ⚠️  Reporting org fields provided but IGNORED - this route preserves existing reporting org`);
      console.log(`[IATI Import] ⚠️  To update reporting org, use import-as-reporting-org mode instead`);
    }

    // Handle JSONB geography fields (stored directly on activities table)
    if (fields.recipient_countries && iati_data.recipient_countries && Array.isArray(iati_data.recipient_countries)) {
      console.log('[IATI Import] Processing recipient_countries:', iati_data.recipient_countries.length, 'items');
      previousValues.recipient_countries = currentActivity.recipient_countries;
      updateData.recipient_countries = iati_data.recipient_countries.map((country: any) => ({
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
      updatedFields.push('recipient_countries');
      console.log(`[IATI Import] ✓ Processed ${updateData.recipient_countries.length} recipient countries`);
    }

    if (fields.recipient_regions && iati_data.recipient_regions && Array.isArray(iati_data.recipient_regions)) {
      console.log('[IATI Import] Processing recipient_regions:', iati_data.recipient_regions.length, 'items');
      previousValues.recipient_regions = currentActivity.recipient_regions;
      updateData.recipient_regions = iati_data.recipient_regions.map((region: any) => ({
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
      updatedFields.push('recipient_regions');
      console.log(`[IATI Import] ✓ Processed ${updateData.recipient_regions.length} recipient regions`);
    }

    if (fields.custom_geographies && iati_data.custom_geographies && Array.isArray(iati_data.custom_geographies)) {
      console.log('[IATI Import] Processing custom_geographies:', iati_data.custom_geographies.length, 'items');
      previousValues.custom_geographies = currentActivity.custom_geographies;
      updateData.custom_geographies = iati_data.custom_geographies.map((geo: any) => ({
        id: geo.id || `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: geo.name,
        code: geo.code,
        percentage: geo.percentage || 0,
        vocabulary: geo.vocabulary || '99',
        vocabularyUri: geo.vocabularyUri || null,
        narrative: geo.narrative || null
      }));
      updatedFields.push('custom_geographies');
      console.log(`[IATI Import] ✓ Processed ${updateData.custom_geographies.length} custom geographies`);
    }
    
    // Update activity with simple fields
    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();
      
      // Explicitly DO NOT update reporting org fields - preserve existing values
      // This ensures merge/fork/reference modes keep the original reporting org
      
      const { error: updateError } = await supabase
        .from('activities')
        .update(updateData)
        .eq('id', activityId);
      
      if (updateError) {
        console.error('[IATI Import] ❌ Error updating activity:', updateError);
        throw updateError;
      }
      
      console.log('[IATI Import] ✅ Activity updated successfully');
      
      // Verify what was actually saved to the database
      const { data: verifyActivity } = await supabase
        .from('activities')
        .select('id, reporting_org_id, reporting_org_ref, reporting_org_name, created_by_org_name, created_by_org_acronym')
        .eq('id', activityId)
        .single();
      
      console.log(`[IATI Import] ✅ Verified saved org fields:`, verifyActivity);
      
      if (!verifyActivity?.reporting_org_id && !verifyActivity?.created_by_org_name) {
        console.error(`[IATI Import] ⚠️  WARNING: Organization fields are NULL after update!`);
      }
    }
    
    // Handle sectors if selected
    if (fields.sectors && iati_data.sectors) {
      console.log('[IATI Import] Updating sectors');
      
      // Store previous sectors
      const { data: previousSectors } = await supabase
        .from('activity_sectors')
        .select('*')
        .eq('activity_id', activityId);
      
      previousValues.sectors = previousSectors;
      
      // Clear existing sectors
      await supabase
        .from('activity_sectors')
        .delete()
        .eq('activity_id', activityId);
      
      // Insert new sectors
      if (Array.isArray(iati_data.sectors) && iati_data.sectors.length > 0) {
        // First, ensure all sector codes exist in the sectors table
        const sectorCodes = iati_data.sectors.map((s: IATISector) => s.code);
        
        // Get existing sectors
        const { data: existingSectors } = await supabase
          .from('sectors')
          .select('id, code')
          .in('code', sectorCodes);
        
        const existingSectorMap = new Map<string, string>(
          (existingSectors || []).map((s: DBSector) => [s.code, s.id])
        );
        
        // Create missing sectors
        const missingSectors = iati_data.sectors.filter(
          (s: IATISector) => !existingSectorMap.has(s.code)
        );
        
        if (missingSectors.length > 0) {
          const { data: newSectors } = await supabase
            .from('sectors')
            .insert(
              missingSectors.map((s: IATISector) => ({
                code: s.code,
                name: s.name || `Sector ${s.code}`,
                category: s.code.substring(0, 3), // First 3 digits are category
                type: 'secondary'
              }))
            )
            .select();
          
          // Add new sectors to map
          (newSectors || []).forEach((s: DBSector) => {
            existingSectorMap.set(s.code, s.id);
          });
        }
        
        // Insert activity-sector relationships
        const sectorRelations = iati_data.sectors
          .filter((s: IATISector) => existingSectorMap.has(s.code))
          .map((s: IATISector) => ({
            activity_id: activityId,
            sector_id: existingSectorMap.get(s.code),
            percentage: s.percentage || 0
          }));
        
        if (sectorRelations.length > 0) {
          await supabase
            .from('activity_sectors')
            .insert(sectorRelations);
        }
      }
      
      updatedFields.push('sectors');
    }
    
    // Handle policy markers if selected
    let policyMarkersCount = 0;
    if (fields.policy_markers && iati_data.policyMarkers) {
      console.log('[IATI Import] Updating policy markers');
      
      // Store previous policy markers
      const { data: previousPolicyMarkers } = await supabase
        .from('activity_policy_markers')
        .select('*')
        .eq('activity_id', activityId);
      
      previousValues.policy_markers = previousPolicyMarkers;
      
      // Clear existing policy markers
      await supabase
        .from('activity_policy_markers')
        .delete()
        .eq('activity_id', activityId);
      
      // Insert new policy markers
      if (Array.isArray(iati_data.policyMarkers) && iati_data.policyMarkers.length > 0) {
        // Fetch available policy markers from database
        // Get all standard IATI markers
        const { data: standardMarkers, error: standardError } = await supabase
          .from('policy_markers')
          .select('uuid, code, iati_code, name, vocabulary, vocabulary_uri, is_iati_standard')
          .eq('is_active', true)
          .eq('is_iati_standard', true);
        
        if (standardError) {
          console.error('[IATI Import] Error fetching standard policy markers:', standardError);
          importWarnings.push({
            type: 'policy_markers_fetch_error',
            message: 'Failed to fetch standard policy markers from database',
            details: standardError.message
          });
        }
        
        // Get custom markers linked to this activity
        const { data: activityCustomMarkers, error: customError } = await supabase
          .from('activity_policy_markers')
          .select(`
            policy_markers!activity_policy_markers_policy_marker_uuid_fkey (
              uuid, code, iati_code, name, vocabulary, vocabulary_uri, is_iati_standard
            )
          `)
          .eq('activity_id', activityId);
        
        if (customError) {
          console.error('[IATI Import] Error fetching custom policy markers:', customError);
        }
        
        // Combine all available markers
        const availableMarkers: any[] = [...(standardMarkers || [])];
        if (activityCustomMarkers) {
          const customMarkersList = activityCustomMarkers
            .map((item: any) => item.policy_markers)
            .filter(Boolean);
          availableMarkers.push(...customMarkersList);
        }
        
        // Remove duplicates based on UUID
        const uniqueMarkers = Array.from(
          new Map(availableMarkers.map((m: any) => [m.uuid, m])).values()
        );
        
        console.log(`[IATI Import] Found ${uniqueMarkers.length} available policy markers`);
        
        const importedPolicyMarkers: any[] = [];
        const unmatchedMarkers: any[] = [];
        
        // Process each policy marker from XML
        for (const xmlMarker of iati_data.policyMarkers) {
          const markerVocabulary = xmlMarker.vocabulary || '1';
          let matchingMarker = null;
          
          // Determine lookup strategy based on vocabulary
          if (markerVocabulary === '1') {
            // Standard IATI marker: match by vocabulary + iati_code
            matchingMarker = uniqueMarkers.find((marker: any) => {
              return marker.is_iati_standard === true &&
                marker.vocabulary === '1' &&
                marker.iati_code === xmlMarker.code;
            });
          } else if (markerVocabulary === '99') {
            // Custom marker: match by vocabulary + code + vocabulary_uri
            const vocabularyUri = xmlMarker.vocabulary_uri || '';
            matchingMarker = uniqueMarkers.find((marker: any) => {
              return marker.is_iati_standard === false &&
                marker.vocabulary === '99' &&
                marker.code === xmlMarker.code &&
                (marker.vocabulary_uri || '') === vocabularyUri;
            });
          }
          
          if (matchingMarker) {
            // Convert significance from string to number
            const rawSignificance = parseInt(xmlMarker.significance || '0', 10);
            
            // Validate significance according to IATI rules
            const validation = validatePolicyMarkerSignificance(matchingMarker, rawSignificance);
            
            let significance = rawSignificance;
            if (!validation.isValid) {
              // Normalize to maximum allowed significance
              significance = validation.maxAllowedSignificance;
              console.warn(`[IATI Import] Normalized significance for ${matchingMarker.name}: ${rawSignificance} -> ${significance} (IATI compliance)`);
              importWarnings.push({
                type: 'policy_marker_significance_normalized',
                message: `Significance normalized for ${matchingMarker.name}`,
                details: {
                  marker: matchingMarker.name,
                  original: rawSignificance,
                  normalized: significance,
                  reason: validation.error
                }
              });
            }
            
            importedPolicyMarkers.push({
              activity_id: activityId,
              policy_marker_id: matchingMarker.uuid, // Use UUID, not ID!
              significance: significance,
              rationale: xmlMarker.narrative || null
            });
            
            console.log(`[IATI Import] Mapped policy marker: ${xmlMarker.code} -> ${matchingMarker.name} (significance: ${significance})`);
          } else {
            // Marker not found - try to create custom marker if vocabulary is 99
            if (markerVocabulary === '99') {
              console.log(`[IATI Import] Creating custom policy marker for code: ${xmlMarker.code}, vocabulary: 99`);
              
              try {
                // Create custom policy marker
                const { data: newMarker, error: createError } = await supabase
                  .from('policy_markers')
                  .insert({
                    name: `Policy Marker ${xmlMarker.code}`,
                    description: `Custom policy marker imported from IATI XML (code: ${xmlMarker.code})`,
                    marker_type: 'custom',
                    code: xmlMarker.code,
                    vocabulary: '99',
                    vocabulary_uri: xmlMarker.vocabulary_uri || null,
                    is_iati_standard: false,
                    is_active: true,
                    display_order: 999
                  })
                  .select('uuid, code, iati_code, name, vocabulary, vocabulary_uri, is_iati_standard')
                  .single();
                
                if (createError || !newMarker) {
                  console.error(`[IATI Import] Failed to create custom policy marker:`, createError);
                  unmatchedMarkers.push({
                    code: xmlMarker.code,
                    vocabulary: markerVocabulary,
                    reason: createError?.message || 'Failed to create custom marker'
                  });
                  importWarnings.push({
                    type: 'policy_marker_creation_failed',
                    message: `Failed to create custom policy marker "${xmlMarker.code}"`,
                    details: createError?.message || 'Unknown error'
                  });
                } else {
                  console.log(`[IATI Import] Successfully created custom policy marker:`, newMarker);
                  
                  // Convert significance from string to number
                  const rawSignificance = parseInt(xmlMarker.significance || '0', 10);
                  
                  // Validate significance according to IATI rules
                  const validation = validatePolicyMarkerSignificance(newMarker, rawSignificance);
                  
                  let significance = rawSignificance;
                  if (!validation.isValid) {
                    // Normalize to maximum allowed significance
                    significance = validation.maxAllowedSignificance;
                    console.warn(`[IATI Import] Normalized significance for custom marker ${xmlMarker.code}: ${rawSignificance} -> ${significance} (IATI compliance)`);
                  }
                  
                  // Add the newly created marker to our import list
                  importedPolicyMarkers.push({
                    activity_id: activityId,
                    policy_marker_id: newMarker.uuid, // Use UUID!
                    significance: significance,
                    rationale: xmlMarker.narrative || null
                  });
                  
                  console.log(`[IATI Import] Created and assigned custom policy marker: ${xmlMarker.code} -> ${newMarker.name} (significance: ${significance})`);
                }
              } catch (createErr: any) {
                console.error(`[IATI Import] Exception creating custom policy marker:`, createErr);
                unmatchedMarkers.push({
                  code: xmlMarker.code,
                  vocabulary: markerVocabulary,
                  reason: createErr.message || 'Exception during creation'
                });
              }
            } else {
              // Standard marker not found - log warning
              console.warn(`[IATI Import] Policy marker not found: code=${xmlMarker.code}, vocabulary=${markerVocabulary}`);
              unmatchedMarkers.push({
                code: xmlMarker.code,
                vocabulary: markerVocabulary,
                reason: 'Standard IATI marker not found in database'
              });
              importWarnings.push({
                type: 'policy_marker_not_found',
                message: `Policy marker not found: code ${xmlMarker.code} (vocabulary ${markerVocabulary})`,
                details: {
                  code: xmlMarker.code,
                  vocabulary: markerVocabulary,
                  suggestion: 'Ensure IATI standard policy markers are seeded in the database'
                }
              });
            }
          }
        }
        
        // Insert matched policy markers
        if (importedPolicyMarkers.length > 0) {
          const { error: insertError } = await supabase
            .from('activity_policy_markers')
            .insert(importedPolicyMarkers);
          
          if (insertError) {
            console.error('[IATI Import] Error inserting policy markers:', insertError);
            importWarnings.push({
              type: 'policy_markers_insert_error',
              message: 'Failed to insert policy markers',
              details: insertError.message
            });
          } else {
            policyMarkersCount = importedPolicyMarkers.length;
            console.log(`[IATI Import] ✓ Imported ${policyMarkersCount} policy markers`);
            updatedFields.push('policy_markers');
          }
        }
        
        // Log unmatched markers
        if (unmatchedMarkers.length > 0) {
          console.warn(`[IATI Import] ⚠️  ${unmatchedMarkers.length} policy marker(s) could not be matched or created`);
          unmatchedMarkers.forEach((marker, idx) => {
            console.warn(`[IATI Import]    ${idx + 1}. Code: ${marker.code}, Vocabulary: ${marker.vocabulary}, Reason: ${marker.reason}`);
          });
        }
      }
    }
    
    // Handle participating organizations if selected
    if (fields.participating_orgs && iati_data.participating_orgs) {
      console.log('[IATI Import] Updating participating organizations');
      console.log(`[IATI Import] Attempting to import ${iati_data.participating_orgs.length} participating organizations`);
      
      // Store previous participating organizations
      const { data: previousParticipatingOrgs } = await supabase
        .from('activity_participating_organizations')
        .select('*')
        .eq('activity_id', activityId);
      
      previousValues.participating_orgs = previousParticipatingOrgs;
      
      // Clear existing participating organizations
      await supabase
        .from('activity_participating_organizations')
        .delete()
        .eq('activity_id', activityId);
      
      // Track results for better error reporting
      const unmatchedOrgs: Array<{ref?: string; name?: string; role?: string; reason?: string}> = [];
      const matchedOrgs: Array<{name: string; id: string; method: string; wasExisting: boolean}> = [];
      
      // Server-side organization resolution function (uses direct Supabase queries)
      const resolveOrCreateOrganization = async (org: IATIOrganization): Promise<{id: string | null; method: string; wasExisting: boolean}> => {
        const orgName = org.name || org.narrative || org.ref || 'Unknown Organization';
        let orgId: string | null = null;
        let method = '';
        let wasExisting = false;
        
        // Step 1: Try direct match by iati_org_id
        if (org.ref) {
          const { data: directMatch } = await supabase
            .from('organizations')
            .select('id, name, iati_org_id')
            .eq('iati_org_id', org.ref)
            .maybeSingle();
          
          if (directMatch) {
            orgId = directMatch.id;
            method = 'matched by IATI ID';
            wasExisting = true;
            console.log(`[IATI Import] ✓ Found existing organization: "${directMatch.name || orgName}" (${method})`);
            return { id: orgId, method, wasExisting };
          }
          
          // Step 2: Try match by alias_refs array
          const { data: aliasMatches } = await supabase
            .from('organizations')
            .select('id, name, alias_refs')
            .not('alias_refs', 'is', null);
          
          if (aliasMatches && aliasMatches.length > 0) {
            const aliasMatch = aliasMatches.find(o => 
              o.alias_refs && Array.isArray(o.alias_refs) && o.alias_refs.includes(org.ref)
            );
            if (aliasMatch) {
              orgId = aliasMatch.id;
              method = 'matched by alias reference';
              wasExisting = true;
              console.log(`[IATI Import] ✓ Found existing organization: "${aliasMatch.name || orgName}" (${method})`);
              return { id: orgId, method, wasExisting };
            }
          }
        }
        
        // Step 3: Try fuzzy match by name
        if (!orgId && (org.name || org.narrative)) {
          const searchName = (org.name || org.narrative || '').trim();
          if (searchName) {
            // Try exact match first
            const { data: exactMatch } = await supabase
              .from('organizations')
              .select('id, name')
              .ilike('name', searchName)
              .limit(1)
              .maybeSingle();
            
            if (exactMatch) {
              orgId = exactMatch.id;
              method = 'matched by name (exact)';
              wasExisting = true;
              console.log(`[IATI Import] ✓ Found existing organization: "${exactMatch.name || orgName}" (${method})`);
              return { id: orgId, method, wasExisting };
            }
            
            // Try partial match
            const { data: partialMatches } = await supabase
              .from('organizations')
              .select('id, name')
              .ilike('name', `%${searchName}%`)
              .limit(1);
            
            if (partialMatches && partialMatches.length > 0) {
              orgId = partialMatches[0].id;
              method = 'matched by name (partial)';
              wasExisting = true;
              console.log(`[IATI Import] ✓ Found existing organization: "${partialMatches[0].name || orgName}" (${method})`);
              return { id: orgId, method, wasExisting };
            }
          }
        }
        
        // Step 4: Try to create new organization (but check if it already exists)
        try {
          const newOrgData: any = {
            name: orgName,
            iati_org_id: org.ref || null,
            alias_refs: org.ref ? [org.ref] : [],
            type: org.type || null,
            Organisation_Type_Code: org.type || null,
            country: null
          };
          
          const { data: createdOrg, error: createError } = await supabase
            .from('organizations')
            .insert([newOrgData])
            .select()
            .single();
          
          if (createdOrg && !createError) {
            orgId = createdOrg.id;
            method = 'created new organization';
            wasExisting = false;
            console.log(`[IATI Import] ✓ Created new organization: "${createdOrg.name || orgName}"`);
            return { id: orgId, method, wasExisting };
          } else if (createError) {
            // Check if error is due to duplicate (unique constraint violation)
            if (createError.code === '23505' || createError.message?.includes('duplicate') || createError.message?.includes('unique')) {
              // Try to find the existing organization
              if (org.ref) {
                const { data: existing } = await supabase
                  .from('organizations')
                  .select('id, name')
                  .eq('iati_org_id', org.ref)
                  .maybeSingle();
                
                if (existing) {
                  orgId = existing.id;
                  method = 'already exists in database (duplicate prevented)';
                  wasExisting = true;
                  console.log(`[IATI Import] ✓ Organization already exists: "${existing.name || orgName}" (${method})`);
                  return { id: orgId, method, wasExisting };
                }
              }
              
              // Try by name
              const searchName = (org.name || org.narrative || '').trim();
              if (searchName) {
                const { data: existing } = await supabase
                  .from('organizations')
                  .select('id, name')
                  .ilike('name', searchName)
                  .maybeSingle();
                
                if (existing) {
                  orgId = existing.id;
                  method = 'already exists in database (duplicate prevented)';
                  wasExisting = true;
                  console.log(`[IATI Import] ✓ Organization already exists: "${existing.name || orgName}" (${method})`);
                  return { id: orgId, method, wasExisting };
                }
              }
            }
            
            console.error(`[IATI Import] ✗ Error creating organization "${orgName}":`, createError.message);
            return { id: null, method: `creation failed: ${createError.message}`, wasExisting: false };
          }
        } catch (createErr: any) {
          console.error(`[IATI Import] ✗ Exception creating organization "${orgName}":`, createErr);
          return { id: null, method: `creation failed: ${createErr.message || 'unknown error'}`, wasExisting: false };
        }
        
        return { id: null, method: 'not found and creation failed', wasExisting: false };
      };
      
      // Process each participating organization - find or create as needed
      const participatingOrgs = await Promise.all(
        iati_data.participating_orgs.map(async (org: IATIOrganization, index: number) => {
          // Handle both 'name' and 'narrative' fields (different parsers use different fields)
          const orgName = org.name || org.narrative || org.ref || 'Unknown Organization';
          
          // Resolve or create the organization
          const result = await resolveOrCreateOrganization(org);
          
          if (!result.id) {
            // Log detailed warning about unmatched organization
            const orgIdentifier = org.ref || org.name || org.narrative || 'Unknown';
            const detailedReason = result.method || 'Unknown error during organization resolution';
            
            console.warn(`[IATI Import] ⚠️  Organization not found/created: ${orgIdentifier}`);
            console.warn(`[IATI Import]     - IATI Ref: ${org.ref || 'N/A'}`);
            console.warn(`[IATI Import]     - Name: ${org.name || 'N/A'}`);
            console.warn(`[IATI Import]     - Narrative: ${org.narrative || 'N/A'}`);
            console.warn(`[IATI Import]     - Role: ${org.role || 'N/A'}`);
            console.warn(`[IATI Import]     - Type: ${org.type || 'N/A'}`);
            console.warn(`[IATI Import]     - Activity ID: ${org.activityId || 'N/A'}`);
            console.warn(`[IATI Import]     - CRS Channel Code: ${org.crsChannelCode || 'N/A'}`);
            console.warn(`[IATI Import]     - Reason: ${detailedReason}`);
            
            // Create user-friendly error message
            let userFriendlyReason = detailedReason;
            if (detailedReason.includes('creation failed')) {
              userFriendlyReason = `Failed to create organization: ${detailedReason.replace('creation failed: ', '')}`;
            } else if (detailedReason.includes('not found')) {
              userFriendlyReason = 'Organization not found in database and could not be created. Please ensure the organization exists or can be created.';
            } else if (detailedReason.includes('duplicate')) {
              userFriendlyReason = 'Organization already exists but could not be matched.';
            }
            
            unmatchedOrgs.push({
              ref: org.ref || org.validated_ref,
              name: org.name || org.narrative || orgIdentifier,
              role: org.role || 'unknown',
              reason: userFriendlyReason,
              type: org.type || null,
              activityId: org.activityId || null
            });
            
            return null;
          }
          
          // Track successful matches
          matchedOrgs.push({
            name: orgName,
            id: result.id,
            method: result.method,
            wasExisting: result.wasExisting
          });
          
          // Map IATI role codes to our role types
          let roleType: 'extending' | 'implementing' | 'government' | 'funding' = 'implementing';
          if (org.role === '1') {
            roleType = 'funding';
          } else if (org.role === '2') {
            roleType = 'implementing';
          } else if (org.role === '3') {
            roleType = 'extending';
          } else if (org.role === '4') {
            roleType = 'implementing';
          }
          
          // Parse IATI role code to integer (1-4)
          const iatiRoleCode = org.role ? parseInt(org.role, 10) : 4;
          
          // Prepare IATI fields for insert
          const iatiOrgRef = org.validated_ref || org.ref || null;
          const narrative = org.narrative || org.name || null;
          const narrativeLang = org.narrativeLang || 'en';
          const narratives = org.narratives && org.narratives.length > 0 
            ? JSON.stringify(org.narratives) 
            : null;
          
          return {
            activity_id: activityId,
            organization_id: result.id,
            role_type: roleType,
            display_order: index,
            // IATI-specific fields
            iati_role_code: (iatiRoleCode >= 1 && iatiRoleCode <= 4) ? iatiRoleCode : 4,
            iati_org_ref: iatiOrgRef,
            org_type: org.type || null,
            activity_id_ref: org.activityId || null,
            crs_channel_code: org.crsChannelCode || null,
            narrative: narrative,
            narrative_lang: narrativeLang,
            narratives: narratives,
            org_activity_id: org.activityId || null,
            reporting_org_ref: null,
            secondary_reporter: false
          };
        })
      );
      
      // Filter out null values
      const validParticipatingOrgs = participatingOrgs.filter(Boolean);
      
      if (validParticipatingOrgs.length > 0) {
        // Check for existing records to handle unique constraint violations
        const orgIdsToCheck = validParticipatingOrgs.map(org => org.organization_id);
        const { data: existingOrgs, error: checkError } = await supabase
          .from('activity_participating_organizations')
          .select('id, activity_id, organization_id, role_type')
          .eq('activity_id', activityId)
          .in('organization_id', orgIdsToCheck);
        
        if (checkError) {
          console.error('[IATI Import] Error checking existing participating orgs:', checkError);
        }
        
        // Create a map of existing orgs for quick lookup
        const existingOrgsMap = new Map<string, string>();
        if (existingOrgs) {
          existingOrgs.forEach(existing => {
            const key = `${existing.activity_id}-${existing.organization_id}-${existing.role_type}`;
            existingOrgsMap.set(key, existing.id);
          });
        }
        
        // Separate new orgs from ones that need updating
        const orgsToInsert: any[] = [];
        const orgsToUpdate: Array<{ id: string; data: any }> = [];
        const duplicateOrgs: Array<{ org: any; reason: string }> = [];
        
        for (const org of validParticipatingOrgs) {
          const key = `${org.activity_id}-${org.organization_id}-${org.role_type}`;
          const existingId = existingOrgsMap.get(key);
          
          if (existingId) {
            // Record exists - update it with new IATI fields
            orgsToUpdate.push({
              id: existingId,
              data: {
                iati_role_code: org.iati_role_code,
                iati_org_ref: org.iati_org_ref,
                org_type: org.org_type,
                activity_id_ref: org.activity_id_ref,
                crs_channel_code: org.crs_channel_code,
                narrative: org.narrative,
                narrative_lang: org.narrative_lang,
                narratives: org.narratives,
                org_activity_id: org.org_activity_id,
                display_order: org.display_order,
                updated_at: new Date().toISOString()
              }
            });
          } else {
            // New record - insert it
            orgsToInsert.push(org);
          }
        }
        
        let insertedCount = 0;
        let updatedCount = 0;
        let failedCount = 0;
        
        // Insert new records
        if (orgsToInsert.length > 0) {
          const { data: insertedData, error: insertError } = await supabase
            .from('activity_participating_organizations')
            .insert(orgsToInsert)
            .select('id');
          
          if (insertError) {
            console.error('[IATI Import] Error inserting participating organizations:', insertError);
            console.error('[IATI Import] Error code:', insertError.code);
            console.error('[IATI Import] Error message:', insertError.message);
            console.error('[IATI Import] Failed orgs data:', JSON.stringify(orgsToInsert, null, 2));
            
            // Handle unique constraint violations
            if (insertError.code === '23505' || insertError.message?.includes('unique') || insertError.message?.includes('duplicate')) {
              console.warn('[IATI Import] Unique constraint violation detected - some orgs may already exist');
              
              // Try to identify which orgs failed
              for (const org of orgsToInsert) {
                duplicateOrgs.push({
                  org,
                  reason: 'Organization already participating in this role for this activity'
                });
              }
            } else {
              // Other errors - add to unmatched orgs
              for (const org of orgsToInsert) {
                const orgName = org.narrative || `Organization ID ${org.organization_id}`;
                unmatchedOrgs.push({
                  ref: org.iati_org_ref || null,
                  name: orgName,
                  role: org.iati_role_code?.toString() || 'unknown',
                  reason: `Database insert failed: ${insertError.message}`
                });
                failedCount++;
              }
            }
          } else {
            insertedCount = insertedData?.length || 0;
            console.log(`[IATI Import] ✅ Successfully inserted ${insertedCount} new participating organizations`);
          }
        }
        
        // Update existing records
        if (orgsToUpdate.length > 0) {
          for (const updateItem of orgsToUpdate) {
            const { error: updateError } = await supabase
              .from('activity_participating_organizations')
              .update(updateItem.data)
              .eq('id', updateItem.id);
            
            if (updateError) {
              console.error(`[IATI Import] Error updating participating org ${updateItem.id}:`, updateError);
              failedCount++;
            } else {
              updatedCount++;
            }
          }
          
          if (updatedCount > 0) {
            console.log(`[IATI Import] ✅ Successfully updated ${updatedCount} existing participating organizations with IATI fields`);
          }
        }
        
        // Log summary of matched organizations
        const existingCount = matchedOrgs.filter(m => m.wasExisting).length;
        const createdCount = matchedOrgs.filter(m => !m.wasExisting).length;
        
        if (existingCount > 0) {
          console.log(`[IATI Import] ℹ️  ${existingCount} organization(s) were already in the database and were linked to the activity`);
        }
        if (createdCount > 0) {
          console.log(`[IATI Import] ℹ️  ${createdCount} organization(s) were created during import`);
        }
        
        // Add warnings for duplicate orgs
        if (duplicateOrgs.length > 0) {
          importWarnings.push({
            type: 'duplicate_organizations',
            message: `${duplicateOrgs.length} organization(s) were skipped because they already participate in the same role`,
            details: {
              skipped_organizations: duplicateOrgs.map(d => ({
                organization_id: d.org.organization_id,
                role_type: d.org.role_type,
                reason: d.reason
              }))
            }
          });
        }
        
        // Log final summary
        const totalProcessed = insertedCount + updatedCount;
        if (totalProcessed > 0) {
          console.log(`[IATI Import] ✅ Successfully processed ${totalProcessed} participating organizations (${insertedCount} inserted, ${updatedCount} updated)`);
        }
        if (failedCount > 0) {
          console.error(`[IATI Import] ❌ Failed to process ${failedCount} participating organizations`);
        }
      }
      
      // Log summary of unmatched organizations with better messaging
      if (unmatchedOrgs.length > 0) {
        console.error(`[IATI Import] ❌ Failed to match ${unmatchedOrgs.length} organizations:`);
        unmatchedOrgs.forEach((org, idx) => {
          const reason = org.reason || 'Not found in database';
          const identifier = org.ref || org.name || 'Unknown';
          console.error(`[IATI Import]    ${idx + 1}. ${identifier} (${org.ref ? 'ref' : 'name'}-based lookup)`);
          console.error(`[IATI Import]       Role: ${org.role || 'N/A'}, Type: ${(org as any).type || 'N/A'}`);
          console.error(`[IATI Import]       Reason: ${reason}`);
          if ((org as any).activityId) {
            console.error(`[IATI Import]       Activity ID: ${(org as any).activityId}`);
          }
        });
        console.error('[IATI Import] 💡 Tip: Ensure these organizations exist in the organizations table with matching iati_org_id or name values');
        
        // Add to import warnings with better messaging
        importWarnings.push({
          type: 'organization_matching',
          message: `${unmatchedOrgs.length} organization(s) could not be matched or created and were skipped`,
          details: {
            total_attempted: iati_data.participating_orgs.length,
            successfully_matched: validParticipatingOrgs.length,
            unmatched_count: unmatchedOrgs.length,
            unmatched_organizations: unmatchedOrgs.map(org => ({
              identifier: org.ref || org.name || 'Unknown',
              ref: org.ref || null,
              name: org.name || null,
              role: org.role || 'unknown',
              type: (org as any).type || null,
              activity_id: (org as any).activityId || null,
              reason: org.reason || 'Not found in database',
              lookup_method: org.ref ? 'iati_org_id' : 'name',
              suggestion: org.reason?.includes('creation failed') 
                ? 'Check database constraints and organization data requirements'
                : org.reason?.includes('not found')
                ? 'Create the organization manually or ensure it exists with matching IATI ID or name'
                : 'Review the error message for specific resolution steps'
            })),
            matched_organizations: matchedOrgs.map(m => ({
              name: m.name,
              id: m.id,
              method: m.method,
              was_existing: m.wasExisting
            }))
          }
        });
      } else if (matchedOrgs.length > 0) {
        // All organizations were matched - log summary
        const existingCount = matchedOrgs.filter(m => m.wasExisting).length;
        if (existingCount > 0) {
          console.log(`[IATI Import] ℹ️  All ${matchedOrgs.length} organizations were successfully linked (${existingCount} were already in the database)`);
        }
      }
      
      updatedFields.push('participating_orgs');
    }
    
    // Handle locations if selected
    if (fields.locations && iati_data.locations) {
      console.log('[IATI Import] Updating locations');
      
      // Store previous locations
      const { data: previousLocations } = await supabase
        .from('activity_locations')
        .select('*')
        .eq('activity_id', activityId);
      
      previousValues.locations = previousLocations;
      
      // Clear existing locations (optional - could merge instead)
      await supabase
        .from('activity_locations')
        .delete()
        .eq('activity_id', activityId);
      
      // Insert new locations
      if (Array.isArray(iati_data.locations) && iati_data.locations.length > 0) {
        console.log('[IATI Import] About to process', iati_data.locations.length, 'locations');
        try {
          const locationData = await Promise.all(
            iati_data.locations.map(async (loc: any) => {
            console.log('[IATI Import] Processing location:', {
              ref: loc.ref,
              name: loc.name,
              locationReach: loc.locationReach,
              exactness: loc.exactness,
              fullLocation: loc
            });
            
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
            console.log('[IATI Import] Parsed coordinates:', { latitude, longitude });
            
            // Determine location type - site if has coordinates, coverage otherwise
            const locationType = (latitude && longitude) ? 'site' : 'coverage';
            
            const locationEntry: any = {
              activity_id: activityId,
              location_type: locationType,
              location_name: loc.name || 'Unnamed Location',
              description: loc.description,
              location_description: loc.description,
              activity_location_description: loc.activityDescription,
              srs_name: loc.point?.srsName || 'http://www.opengis.net/def/crs/EPSG/0/4326',
              
              // IATI location reference (ref attribute)
              location_ref: loc.ref || undefined,
              
              // IATI fields - keep as strings, not integers
              location_reach: loc.locationReach || undefined,
              exactness: loc.exactness || undefined,
              location_class: loc.locationClass || undefined,
              feature_designation: loc.featureDesignation,
              
              // Gazetteer
              location_id_vocabulary: loc.locationId?.vocabulary,
              location_id_code: loc.locationId?.code,
              
              // Administrative - keep level as string
              admin_vocabulary: loc.administrative?.vocabulary,
              admin_level: loc.administrative?.level,
              admin_code: loc.administrative?.code,
              
              // Metadata
              source: 'import',
              validation_status: 'valid',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            // Add site-specific fields
            if (locationType === 'site' && latitude && longitude) {
              locationEntry.latitude = latitude;
              locationEntry.longitude = longitude;

              // Perform reverse geocoding to populate address fields
              try {
                console.log(`[IATI Import] Reverse geocoding coordinates: ${latitude}, ${longitude}`);
                const geocodeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/geocoding/reverse?lat=${latitude}&lon=${longitude}`;
                const geocodeResponse = await fetch(geocodeUrl);
                
                if (geocodeResponse.ok) {
                  const geocodeData = await geocodeResponse.json();
                  console.log('[IATI Import] Geocoding result:', geocodeData);
                  
                  // Populate address fields from geocoding
                  if (geocodeData.address) {
                    locationEntry.address = geocodeData.display_name;
                    locationEntry.city = geocodeData.address.city || 
                                        geocodeData.address.town || 
                                        geocodeData.address.village;
                    locationEntry.postal_code = geocodeData.address.postcode;
                    locationEntry.country_code = geocodeData.address.country_code?.toUpperCase();
                    
                    // Myanmar-specific admin boundaries
                    locationEntry.state_region_name = geocodeData.address.state || 
                                                      geocodeData.address.province;
                    locationEntry.township_name = geocodeData.address.county || 
                                                 geocodeData.address.municipality;
                    locationEntry.district_name = geocodeData.address.district;
                    locationEntry.village_name = geocodeData.address.village || 
                                                geocodeData.address.hamlet;
                    
                    console.log('[IATI Import] Address fields populated from reverse geocoding');
                  }
                } else {
                  console.warn('[IATI Import] Reverse geocoding failed, continuing without address data');
                }
              } catch (geocodeError) {
                console.error('[IATI Import] Geocoding error:', geocodeError);
                // Continue import even if geocoding fails
              }
            }

            // Add coverage-specific fields
            if (locationType === 'coverage') {
              locationEntry.coverage_scope = 'regional'; // Default for imported coverage areas
            }

            console.log('[IATI Import] Returning locationEntry:', {
              location_name: locationEntry.location_name,
              location_ref: locationEntry.location_ref,
              location_type: locationEntry.location_type
            });
            return locationEntry;
          })
        );
        console.log('[IATI Import] Promise.all completed, locationData length:', locationData.length);
        
        console.log('[IATI Import] Location data to insert:', locationData.map(loc => ({
          location_name: loc.location_name,
          location_ref: loc.location_ref,
          location_reach: loc.location_reach
        })));
        
        const { error: locationsError } = await supabase
          .from('activity_locations')
          .insert(locationData);
        
        if (locationsError) {
          console.error('[IATI Import] Error inserting locations:', locationsError);
          // Don't throw - continue with other updates
        } else {
          console.log('[IATI Import] Locations inserted successfully');
          updatedFields.push('locations');
        }
        } catch (locationProcessingError) {
          console.error('[IATI Import] Error processing locations:', locationProcessingError);
          // Don't throw - continue with other updates
        }
      }
    }

    // Handle transactions if selected
    let newTransactionsCount = 0;
    // Initialize organization stats at function level scope
    let orgStats = { created: 0, linked: 0 };
    // Initialize planned disbursements count
    let plannedDisbursementsCount = 0;

    if (fields.transactions && iati_data.transactions) {
      console.log('[IATI Import] Processing transactions');

      // Get existing transactions to check for duplicates
      const { data: existingTransactions } = await supabase
        .from('transactions')
        .select('transaction_type, transaction_date, value, currency')
        .eq('activity_id', activityId);

      // Define transaction type for existing transactions
      interface ExistingTransaction {
        transaction_type: string;
        transaction_date: string;
        value: number;
        currency: string;
      }

      // Create a set of existing transaction signatures
      // Normalize dates to handle null/empty consistently
      const existingSignatures = new Set(
        (existingTransactions || []).map((t: ExistingTransaction) =>
          `${t.transaction_type}-${t.transaction_date || ''}-${t.value}-${t.currency}`
        )
      );

      // Filter out duplicate transactions
      const newTransactions = (iati_data.transactions || []).filter((t: IATITransaction) => {
        // Normalize empty dates for consistent matching
        const normalizedDate = t.date && t.date.trim() !== '' ? t.date : '';
        const signature = `${t.type}-${normalizedDate}-${t.value}-${t.currency || 'USD'}`;
        return !existingSignatures.has(signature);
      });

      newTransactionsCount = newTransactions.length;
      console.log(`[IATI Import] Found ${newTransactionsCount} new transactions out of ${iati_data.transactions.length} total`);
      
      if (newTransactions.length > 0) {
        // Map organization names to IDs if needed
        const allOrgNames = new Set<string>();
        newTransactions.forEach((t: IATITransaction) => {
          if (t.providerOrg?.name) allOrgNames.add(t.providerOrg.name);
          if (t.receiverOrg?.name) allOrgNames.add(t.receiverOrg.name);
        });
        
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id, name, iati_org_id')
          .or(`name.in.(${Array.from(allOrgNames).join(',')}),iati_org_id.in.(${Array.from(allOrgNames).join(',')})`);
        
        const orgNameMap = new Map<string, string>();
        (orgs || []).forEach((org: DBOrganization) => {
          orgNameMap.set(org.name, org.id);
          if (org.iati_org_id) orgNameMap.set(org.iati_org_id, org.id);
        });
        
        // Helper function to find activities by IATI identifier
        const findActivityByIatiId = async (iatiId: string | null | undefined): Promise<string | null> => {
          if (!iatiId) return null;
          
          console.log(`[Transaction] Searching for activity by IATI ID: "${iatiId}"`);
          
          const { data: activities } = await supabase
            .from('activities')
            .select('id, title_narrative')
            .eq('iati_identifier', iatiId)
            .limit(1);
          
          if (activities && activities.length > 0) {
            console.log(`[Transaction] ✓ Found activity: ${activities[0].title_narrative || 'Untitled'}`);
            return activities[0].id;
          }
          
          console.log(`[Transaction] No activity found with IATI ID "${iatiId}"`);
          return null;
        };
        
        // AUTO-CREATE MISSING ORGANIZATIONS using shared helper
        const createMissingOrganizations = async (transactions: IATITransaction[]) => {
          let createdCount = 0;
          let linkedCount = 0;
          
          console.log('[IATI Import] Processing organizations for', transactions.length, 'transactions...');
          
          for (const t of transactions) {
            // Process provider organization
            if (t.providerOrg?.ref || t.providerOrg?.name) {
              const key = t.providerOrg.ref || t.providerOrg.name!;
              
              // Skip if already processed
              if (!orgNameMap.has(key)) {
                const orgId = await getOrCreateOrganization(supabase, {
                  ref: t.providerOrg.ref,
                  name: t.providerOrg.name,
                  type: t.providerOrg.type
                });
                
                if (orgId) {
                  orgNameMap.set(key, orgId);
                  // Also map by ref and name separately for flexible lookup
                  if (t.providerOrg.ref) orgNameMap.set(t.providerOrg.ref, orgId);
                  if (t.providerOrg.name) orgNameMap.set(t.providerOrg.name, orgId);
                  linkedCount++;
                }
              }
            }
            
            // Process receiver organization
            if (t.receiverOrg?.ref || t.receiverOrg?.name) {
              const key = t.receiverOrg.ref || t.receiverOrg.name!;
              
              // Skip if already processed
              if (!orgNameMap.has(key)) {
                const orgId = await getOrCreateOrganization(supabase, {
                  ref: t.receiverOrg.ref,
                  name: t.receiverOrg.name,
                  type: t.receiverOrg.type
                });
                
                if (orgId) {
                  orgNameMap.set(key, orgId);
                  // Also map by ref and name separately for flexible lookup
                  if (t.receiverOrg.ref) orgNameMap.set(t.receiverOrg.ref, orgId);
                  if (t.receiverOrg.name) orgNameMap.set(t.receiverOrg.name, orgId);
                  linkedCount++;
                }
              }
            }
          }
          
          return { created: createdCount, linked: linkedCount };
        };
        
        // Auto-create missing organizations and get creation stats
        orgStats = await createMissingOrganizations(newTransactions);
        console.log('[IATI Import] Organization stats:', orgStats);
        
        // Prepare transaction data with IATI-compliant currency resolution
        const validTransactions: any[] = [];
        const skippedTransactions: any[] = [];
        
        for (const t of newTransactions) {
          // Find activities by IATI identifier
          const providerActivityUuid = await findActivityByIatiId(t.providerOrg?.providerActivityId);
          const receiverActivityUuid = await findActivityByIatiId(t.receiverOrg?.receiverActivityId);
          
          // Resolve currency following IATI Standard §4.2
          const resolvedCurrency = resolveCurrency(
            t.currency,
            currentActivity?.default_currency,
            organizationDefaultCurrency
          );
          
          if (!resolvedCurrency) {
            // Skip this transaction and log validation error
            skippedTransactions.push({
              type: 'transaction',
              transaction_type: t.type,
              date: t.date,
              value: t.value,
              provider: t.providerOrg?.name || t.providerOrg?.ref || 'N/A',
              receiver: t.receiverOrg?.name || t.receiverOrg?.ref || 'N/A',
              reason: 'Currency missing: No currency defined at transaction, activity, or organisation level'
            });
            console.warn('[IATI Import] Skipping transaction - no currency:', {
              type: t.type,
              date: t.date,
              value: t.value
            });
            continue;
          }
          
          // Normalize empty string dates to null (PostgreSQL DATE columns don't accept empty strings)
          const normalizedDate = t.date && t.date.trim() !== '' ? t.date : null;
          
          validTransactions.push({
            activity_id: activityId,
            transaction_type: t.type,
            transaction_date: normalizedDate,
            value: t.value,
            currency: resolvedCurrency,
            status: 'actual', // IATI transactions are actual
            description: t.description,
            
            // Provider organization
            provider_org_id: t.providerOrg?.ref ? 
              (orgNameMap.get(t.providerOrg.ref) || orgNameMap.get(t.providerOrg.name || '')) : null,
            provider_org_ref: t.providerOrg?.ref,
            provider_org_name: t.providerOrg?.name,
            provider_org_activity_id: t.providerOrg?.providerActivityId || null,
            provider_activity_uuid: providerActivityUuid,
            
            // Receiver organization
            receiver_org_id: t.receiverOrg?.ref ? 
              (orgNameMap.get(t.receiverOrg.ref) || orgNameMap.get(t.receiverOrg.name || '')) : null,
            receiver_org_ref: t.receiverOrg?.ref,
            receiver_org_name: t.receiverOrg?.name,
            receiver_org_activity_id: t.receiverOrg?.receiverActivityId || null,
            receiver_activity_uuid: receiverActivityUuid,
            
            // IATI fields
            aid_type: typeof t.aidType === 'object' ? t.aidType?.code : t.aidType,
            finance_type: t.financeType,
            tied_status: t.tiedStatus,
            flow_type: t.flowType,
            disbursement_channel: t.disbursementChannel,
            
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        
        // Insert only valid transactions
        if (validTransactions.length > 0) {
          const { error: transactionError } = await supabase
            .from('transactions')
            .insert(validTransactions);
          
          if (transactionError) {
            console.error('[IATI Import] Error inserting transactions:', transactionError);
            // Don't throw - continue with other updates
          } else {
            updatedFields.push('transactions');
            console.log(`[IATI Import] ✓ Imported ${validTransactions.length} transactions`);
          }
        }
        
        // Add skipped transactions to warnings
        if (skippedTransactions.length > 0) {
          importWarnings.push({
            type: 'currency_validation',
            message: `Skipped ${skippedTransactions.length} transaction(s) due to missing currency`,
            details: skippedTransactions
          });
          console.warn(`[IATI Import] Skipped ${skippedTransactions.length} transactions due to missing currency`);
        }
      }
    }
    
    // Handle contacts if selected
    if (fields.contacts && iati_data.contactInfo) {
      console.log('[IATI Import] Updating contacts');
      
      // Clear existing contacts
      await supabase
        .from('activity_contacts')
        .delete()
        .eq('activity_id', activityId);
      
      // Insert new contacts
      if (Array.isArray(iati_data.contactInfo) && iati_data.contactInfo.length > 0) {
        const contactData = iati_data.contactInfo.map((contact: any) => ({
          activity_id: activityId,
          contact_type: contact.type || '1',
          organization_name: contact.organization,
          department: contact.department,
          person_name: contact.personName,
          job_title: contact.jobTitle,
          telephone: contact.telephone,
          email: contact.email,
          website: contact.website,
          mailing_address: contact.mailingAddress
        }));
        
        const { error: contactsError } = await supabase
          .from('activity_contacts')
          .insert(contactData);
        
        if (!contactsError) {
          updatedFields.push('contacts');
          console.log(`[IATI Import] ✓ Imported ${contactData.length} contacts`);
        } else {
          console.error('[IATI Import] Error inserting contacts:', contactsError);
        }
      }
    }
    
    // Handle conditions if selected
    if (fields.conditions && iati_data.conditions) {
      console.log('[IATI Import] Updating conditions');
      
      // Update conditions_attached flag on activity
      await supabase
        .from('activities')
        .update({ conditions_attached: iati_data.conditions.attached })
        .eq('id', activityId);
      
      // Clear existing conditions
      await supabase
        .from('activity_conditions')
        .delete()
        .eq('activity_id', activityId);
      
      // Insert new conditions
      if (iati_data.conditions.conditions && iati_data.conditions.conditions.length > 0) {
        const conditionData = iati_data.conditions.conditions.map((condition: any, index: number) => {
          // Convert narrative to JSONB format
          // If narrative is already an object (multi-language), use it
          // Otherwise, create a single-language object
          let narrativeJson: any;
          if (condition.narrative && typeof condition.narrative === 'object') {
            narrativeJson = condition.narrative;
          } else {
            const lang = condition.narrativeLang || 'en';
            narrativeJson = { [lang]: condition.narrative || '' };
          }

          return {
            activity_id: activityId,
            type: condition.type || '1',
            narrative: narrativeJson,
            attached: iati_data.conditions.attached
          };
        });
        
        const { error: conditionsError } = await supabase
          .from('activity_conditions')
          .insert(conditionData);
        
        if (!conditionsError) {
          updatedFields.push('conditions');
          console.log(`[IATI Import] ✓ Imported ${conditionData.length} conditions`);
        } else {
          console.error('[IATI Import] Error inserting conditions:', conditionsError);
        }
      }
    }
    
    // Handle budgets if selected
    if (fields.budgets && iati_data.budgets) {
      console.log('[IATI Import] Updating budgets');
      
      // Clear existing budgets
      await supabase
        .from('activity_budgets')
        .delete()
        .eq('activity_id', activityId);
      
      // Insert new budgets with IATI-compliant currency resolution
      if (Array.isArray(iati_data.budgets) && iati_data.budgets.length > 0) {
        const validBudgets: any[] = [];
        const skippedBudgets: any[] = [];
        
        for (const budget of iati_data.budgets) {
          // Resolve currency following IATI Standard §4.2
          const resolvedCurrency = resolveCurrency(
            budget.currency,
            currentActivity?.default_currency,
            organizationDefaultCurrency
          );

          if (!resolvedCurrency) {
            // Skip this budget and log validation error
            skippedBudgets.push({
              type: 'budget',
              budget_type: budget.type || '1',
              period: `${budget.period?.start || 'N/A'} to ${budget.period?.end || 'N/A'}`,
              value: budget.value,
              reason: 'Currency missing: No currency defined at budget, activity, or organisation level'
            });
            console.warn('[IATI Import] Skipping budget - no currency:', {
              period: `${budget.period?.start} to ${budget.period?.end}`,
              value: budget.value
            });
            continue;
          }

          // Calculate USD value using the same logic as the budgets API
          let usdValue = null;
          const valueDate = budget.valueDate || budget.period?.start;

          if (resolvedCurrency !== 'USD' && valueDate) {
            try {
              const result = await fixedCurrencyConverter.convertToUSD(
                budget.value,
                resolvedCurrency,
                new Date(valueDate)
              );
              usdValue = result.usd_amount;
              console.log(`[IATI Import] Converted budget ${budget.value} ${resolvedCurrency} → $${usdValue} USD`);
            } catch (error) {
              console.error('[IATI Import] Error converting budget to USD:', error);
              // Continue without USD value rather than failing
            }
          } else if (resolvedCurrency === 'USD') {
            usdValue = budget.value;
          }

          validBudgets.push({
            activity_id: activityId,
            type: budget.type || '1',
            status: budget.status || '1',
            period_start: budget.period?.start,
            period_end: budget.period?.end,
            value: budget.value,
            currency: resolvedCurrency,
            value_date: valueDate,
            usd_value: usdValue
          });
        }
        
        // Insert only valid budgets
        if (validBudgets.length > 0) {
          const { error: budgetsError } = await supabase
            .from('activity_budgets')
            .insert(validBudgets);
          
          if (!budgetsError) {
            updatedFields.push('budgets');
            console.log(`[IATI Import] ✓ Imported ${validBudgets.length} budgets`);
          } else {
            console.error('[IATI Import] Error inserting budgets:', budgetsError);
          }
        }
        
        // Add skipped budgets to warnings
        if (skippedBudgets.length > 0) {
          importWarnings.push({
            type: 'currency_validation',
            message: `Skipped ${skippedBudgets.length} budget(s) due to missing currency`,
            details: skippedBudgets
          });
          console.warn(`[IATI Import] Skipped ${skippedBudgets.length} budgets due to missing currency`);
        }
      }
    }
    
    // Handle planned disbursements if selected
    console.log('[IATI Import] Checking planned disbursements:', {
      flag: fields.planned_disbursements,
      hasData: !!iati_data.plannedDisbursements,
      dataLength: iati_data.plannedDisbursements?.length,
      dataType: typeof iati_data.plannedDisbursements,
      isArray: Array.isArray(iati_data.plannedDisbursements)
    });

    if (fields.planned_disbursements && iati_data.plannedDisbursements) {
      console.log('[IATI Import] Updating planned disbursements');

      // Clear existing planned disbursements
      await supabase
        .from('planned_disbursements')
        .delete()
        .eq('activity_id', activityId);

      // Insert new planned disbursements with IATI-compliant currency resolution
      if (Array.isArray(iati_data.plannedDisbursements) && iati_data.plannedDisbursements.length > 0) {
        // Process organizations for planned disbursements using shared helper
        const pdOrgNameMap = new Map<string, string>();
        
        console.log(`[IATI Import] Processing organizations for ${iati_data.plannedDisbursements.length} planned disbursements...`);
        
        for (const pd of iati_data.plannedDisbursements) {
          // Process provider organization
          if (pd.providerOrg?.ref || pd.providerOrg?.name) {
            const key = pd.providerOrg.ref || pd.providerOrg.name!;
            
            // Skip if already processed
            if (!pdOrgNameMap.has(key)) {
              const orgId = await getOrCreateOrganization(supabase, {
                ref: pd.providerOrg.ref,
                name: pd.providerOrg.name,
                type: pd.providerOrg.type
              });
              
              if (orgId) {
                pdOrgNameMap.set(key, orgId);
                // Also map by ref and name separately for flexible lookup
                if (pd.providerOrg.ref) pdOrgNameMap.set(pd.providerOrg.ref, orgId);
                if (pd.providerOrg.name) pdOrgNameMap.set(pd.providerOrg.name, orgId);
              }
            }
          }
          
          // Process receiver organization
          if (pd.receiverOrg?.ref || pd.receiverOrg?.name) {
            const key = pd.receiverOrg.ref || pd.receiverOrg.name!;
            
            // Skip if already processed
            if (!pdOrgNameMap.has(key)) {
              const orgId = await getOrCreateOrganization(supabase, {
                ref: pd.receiverOrg.ref,
                name: pd.receiverOrg.name,
                type: pd.receiverOrg.type
              });
              
              if (orgId) {
                pdOrgNameMap.set(key, orgId);
                // Also map by ref and name separately for flexible lookup
                if (pd.receiverOrg.ref) pdOrgNameMap.set(pd.receiverOrg.ref, orgId);
                if (pd.receiverOrg.name) pdOrgNameMap.set(pd.receiverOrg.name, orgId);
              }
            }
          }
        }

        const validPDs: any[] = [];
        const skippedPDs: any[] = [];

        for (const pd of iati_data.plannedDisbursements) {
          console.log('[IATI Import] Processing planned disbursement:', {
            value: pd.value,
            currency: pd.currency,
            period: pd.period,
            hasProviderOrg: !!pd.providerOrg,
            hasReceiverOrg: !!pd.receiverOrg
          });

          // Resolve currency following IATI Standard §4.2
          const resolvedCurrency = resolveCurrency(
            pd.currency,
            currentActivity?.default_currency,
            organizationDefaultCurrency
          );

          console.log('[IATI Import] Currency resolution result:', {
            pdCurrency: pd.currency,
            activityDefaultCurrency: currentActivity?.default_currency,
            organizationDefaultCurrency,
            resolvedCurrency
          });

          if (!resolvedCurrency) {
            // Skip this planned disbursement and log validation error
            skippedPDs.push({
              type: 'planned_disbursement',
              disbursement_type: pd.type || '1',
              period: `${pd.period?.start || 'N/A'} to ${pd.period?.end || 'N/A'}`,
              value: pd.value,
              reason: 'Currency missing: No currency defined at planned disbursement, activity, or organisation level'
            });
            console.warn('[IATI Import] Skipping planned disbursement - no currency:', {
              period: `${pd.period?.start} to ${pd.period?.end}`,
              value: pd.value
            });
            continue;
          }

          // Look up organization IDs using ref or name as fallback
          const providerOrgId = pd.providerOrg?.ref ?
            pdOrgNameMap.get(pd.providerOrg.ref) :
            (pd.providerOrg?.name ? pdOrgNameMap.get(pd.providerOrg.name?.trim()) : null);

          const receiverOrgId = pd.receiverOrg?.ref ?
            pdOrgNameMap.get(pd.receiverOrg.ref) :
            (pd.receiverOrg?.name ? pdOrgNameMap.get(pd.receiverOrg.name?.trim()) : null);

          console.log('[IATI Import] Linking planned disbursement organizations:', {
            provider: {
              name: pd.providerOrg?.name,
              ref: pd.providerOrg?.ref,
              foundId: providerOrgId,
              mapHasName: pd.providerOrg?.name ? pdOrgNameMap.has(pd.providerOrg.name.trim()) : false
            },
            receiver: {
              name: pd.receiverOrg?.name,
              ref: pd.receiverOrg?.ref,
              foundId: receiverOrgId,
              mapHasName: pd.receiverOrg?.name ? pdOrgNameMap.has(pd.receiverOrg.name.trim()) : false
            }
          });

          // Calculate USD amount using the same logic as budgets
          let usdAmount = null;
          const valueDate = pd.valueDate || pd.period?.start;

          if (resolvedCurrency !== 'USD' && valueDate) {
            try {
              const result = await fixedCurrencyConverter.convertToUSD(
                pd.value,
                resolvedCurrency,
                new Date(valueDate)
              );
              usdAmount = result.usd_amount;
              console.log(`[IATI Import] Converted planned disbursement ${pd.value} ${resolvedCurrency} → $${usdAmount} USD`);
            } catch (error) {
              console.error('[IATI Import] Error converting planned disbursement to USD:', error);
              // Continue without USD amount rather than failing
            }
          } else if (resolvedCurrency === 'USD') {
            usdAmount = pd.value;
          }

          const pdToInsert = {
            activity_id: activityId,
            type: pd.type || '1',  // Changed from disbursement_type to type (actual column name)
            period_start: pd.period?.start,
            period_end: pd.period?.end,
            amount: pd.value,
            currency: resolvedCurrency,
            value_date: valueDate,
            usd_amount: usdAmount,
            // Sequence and raw XML for proper ordering and display
            sequence_index: pd.sequenceIndex,
            raw_xml: pd.rawXml,
            // Organization FK references (new)
            provider_org_id: providerOrgId || null,
            receiver_org_id: receiverOrgId || null,
            // Organization text references (IATI compliance)
            provider_org_ref: pd.providerOrg?.ref,
            provider_org_name: pd.providerOrg?.name,
            provider_org_type: pd.providerOrg?.type,
            provider_org_activity_id: pd.providerOrg?.providerActivityId,
            receiver_org_ref: pd.receiverOrg?.ref,
            receiver_org_name: pd.receiverOrg?.name,
            receiver_org_type: pd.receiverOrg?.type,
            receiver_org_activity_id: pd.receiverOrg?.receiverActivityId
          };

          console.log('[IATI Import] Prepared planned disbursement for insert:', {
            type: pdToInsert.type,
            provider_org_type: pdToInsert.provider_org_type,
            provider_org_ref: pdToInsert.provider_org_ref,
            receiver_org_type: pdToInsert.receiver_org_type,
            receiver_org_ref: pdToInsert.receiver_org_ref,
            source_pd: {
              type: pd.type,
              providerOrg: pd.providerOrg,
              receiverOrg: pd.receiverOrg
            }
          });

          validPDs.push(pdToInsert);
        }

        // Insert only valid planned disbursements
        console.log(`[IATI Import] Prepared ${validPDs.length} valid planned disbursements out of ${iati_data.plannedDisbursements.length} total`);

        if (validPDs.length > 0) {
          console.log('[IATI Import] Sample planned disbursement to insert:', validPDs[0]);

          const { error: pdError } = await supabase
            .from('planned_disbursements')
            .insert(validPDs);

          if (!pdError) {
            updatedFields.push('planned_disbursements');
            plannedDisbursementsCount = validPDs.length;
            console.log(`[IATI Import] ✓ Imported ${validPDs.length} planned disbursements`);
          } else {
            console.error('[IATI Import] Error inserting planned disbursements:', pdError);
            console.error('[IATI Import] Error details:', JSON.stringify(pdError, null, 2));
          }
        } else {
          console.warn('[IATI Import] No valid planned disbursements to insert');
        }

        // Add skipped planned disbursements to warnings
        if (skippedPDs.length > 0) {
          importWarnings.push({
            type: 'currency_validation',
            message: `Skipped ${skippedPDs.length} planned disbursement(s) due to missing currency`,
            details: skippedPDs
          });
          console.warn(`[IATI Import] Skipped ${skippedPDs.length} planned disbursements due to missing currency`);
        }
      }
    }
    
    // Handle humanitarian scopes if selected
    if (fields.humanitarian_scopes && iati_data.humanitarianScopes) {
      console.log('[IATI Import] Updating humanitarian scopes');
      
      // Update humanitarian flag on activity
      await supabase
        .from('activities')
        .update({ humanitarian: iati_data.humanitarian || false })
        .eq('id', activityId);
      
      // Clear existing humanitarian scopes
      await supabase
        .from('activity_humanitarian_scope')
        .delete()
        .eq('activity_id', activityId);
      
      // Insert new humanitarian scopes
      if (Array.isArray(iati_data.humanitarianScopes) && iati_data.humanitarianScopes.length > 0) {
        const hsData = iati_data.humanitarianScopes.map((scope: any) => ({
          activity_id: activityId,
          scope_type: scope.type || '1',
          vocabulary: scope.vocabulary || '1-2',
          code: scope.code,
          vocabulary_uri: scope.vocabularyUri,
          narratives: scope.narratives ? JSON.stringify(scope.narratives) : null
        }));
        
        const { error: hsError } = await supabase
          .from('activity_humanitarian_scope')
          .insert(hsData);
        
        if (!hsError) {
          updatedFields.push('humanitarian_scopes');
          console.log(`[IATI Import] ✓ Imported ${hsData.length} humanitarian scopes`);
        } else {
          console.error('[IATI Import] Error inserting humanitarian scopes:', hsError);
        }
      }
    }
    
    // Handle document links if selected
    if (fields.document_links && iati_data.document_links) {
      console.log('[IATI Import] Updating document links');
      
      // Clear existing document links (cascade will delete categories)
      const { data: existingDocs } = await supabase
        .from('activity_documents')
        .select('id')
        .eq('activity_id', activityId);
      
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
        .eq('activity_id', activityId);
      
      // Insert new document links
      if (Array.isArray(iati_data.document_links) && iati_data.document_links.length > 0) {
        for (const doc of iati_data.document_links) {
          // Get category codes - support both new array format and legacy single category
          const categoryCodes = doc.category_codes && Array.isArray(doc.category_codes)
            ? doc.category_codes
            : (doc.category_code ? [doc.category_code] : ['A01']);
          
          const firstCategoryCode = categoryCodes.length > 0 ? categoryCodes[0] : 'A01';
          
          // Ensure title is in the correct format (array of narratives)
          const titleArray = Array.isArray(doc.title) ? doc.title : (doc.title ? [{ text: doc.title, lang: 'en' }] : [{ text: 'Document', lang: 'en' }]);
          const descriptionArray = Array.isArray(doc.description) ? doc.description : (doc.description ? [{ text: doc.description, lang: 'en' }] : []);
          
          const docData = {
            activity_id: activityId,
            format: doc.format || 'application/octet-stream',
            url: doc.url,
            title: titleArray,
            description: descriptionArray,
            category_code: firstCategoryCode, // For backward compatibility
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
            console.error('[IATI Import] Error inserting document link:', docsError);
            continue;
          }
          
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
              console.error('[IATI Import] Error inserting document categories:', categoryError);
            }
          }
        }
        
        updatedFields.push('document_links');
        console.log(`[IATI Import] ✓ Imported ${iati_data.document_links.length} document links`);
      }
    }
    
    // Handle financing terms if selected
    if (fields.financing_terms && iati_data.financingTerms) {
      console.log('[IATI Import] Updating financing terms');

      try {
        // Upsert loan terms if present
        if (iati_data.financingTerms.loanTerms) {
          const loanTermsData: any = {
            activity_id: activityId,
            rate_1: iati_data.financingTerms.loanTerms.rate_1,
            rate_2: iati_data.financingTerms.loanTerms.rate_2,
            repayment_type_code: iati_data.financingTerms.loanTerms.repayment_type_code,
            repayment_plan_code: iati_data.financingTerms.loanTerms.repayment_plan_code,
            commitment_date: iati_data.financingTerms.loanTerms.commitment_date,
            repayment_first_date: iati_data.financingTerms.loanTerms.repayment_first_date,
            repayment_final_date: iati_data.financingTerms.loanTerms.repayment_final_date,
            other_flags: iati_data.financingTerms.other_flags || []
          };
          
          // Add channel code if present
          if (iati_data.financingTerms.channel_code) {
            loanTermsData.channel_code = iati_data.financingTerms.channel_code;
          }

          const { error: loanTermsError } = await supabase
            .from('activity_financing_terms')
            .upsert(loanTermsData, { onConflict: 'activity_id' });

          if (loanTermsError) {
            console.error('[IATI Import] Loan terms error:', loanTermsError);
          }
        }

        // Delete existing loan statuses for this activity before inserting new ones
        if (iati_data.financingTerms.loanStatuses && iati_data.financingTerms.loanStatuses.length > 0) {
          await supabase
            .from('activity_loan_status')
            .delete()
            .eq('activity_id', activityId);

          // Insert new loan statuses
          const loanStatusData = iati_data.financingTerms.loanStatuses.map((status: any) => ({
            activity_id: activityId,
            year: status.year,
            currency: status.currency,
            value_date: status.value_date,
            interest_received: status.interest_received,
            principal_outstanding: status.principal_outstanding,
            principal_arrears: status.principal_arrears,
            interest_arrears: status.interest_arrears
          }));

          const { error: loanStatusError } = await supabase
            .from('activity_loan_status')
            .insert(loanStatusData);

          if (loanStatusError) {
            console.error('[IATI Import] Loan status error:', loanStatusError);
          }
        }

        updatedFields.push('financing_terms');
        console.log('[IATI Import] ✓ Imported financing terms');
      } catch (error) {
        console.error('[IATI Import] Error importing financing terms:', error);
      }
    }

    // Handle tags if selected
    console.log('[IATI Import] Tags check - fields.tags:', fields.tags, 'iati_data.tags:', iati_data.tags ? `${iati_data.tags.length} tags` : 'undefined');
    if (fields.tags && iati_data.tags) {
      console.log('[IATI Import] Updating tags');

      try {
        // Clear existing activity_tags relationships
        await supabase
          .from('activity_tags')
          .delete()
          .eq('activity_id', activityId);

        // Insert new tags
        if (Array.isArray(iati_data.tags) && iati_data.tags.length > 0) {
          for (const tag of iati_data.tags) {
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
                console.error('[IATI Import] Error creating tag:', tagError);
                continue;
              }

              tagId = newTag.id;
            }

            // Create activity-tag relationship
            await supabase
              .from('activity_tags')
              .insert({
                activity_id: activityId,
                tag_id: tagId
              });
          }

          updatedFields.push('tags');
          console.log(`[IATI Import] ✓ Imported ${iati_data.tags.length} tags`);
        }
      } catch (error) {
        console.error('[IATI Import] Error importing tags:', error);
      }
    }

    // Handle country budget items if selected
    if (fields.country_budget && iati_data.countryBudgetItems) {
      console.log('[IATI Import] Updating country budget items');

      try {
        // Clear existing country budget items
        await supabase
          .from('country_budget_items')
          .delete()
          .eq('activity_id', activityId);

        // Insert new country budget items
        if (Array.isArray(iati_data.countryBudgetItems) && iati_data.countryBudgetItems.length > 0) {
          for (const cbi of iati_data.countryBudgetItems) {
            // Insert parent country_budget_items record
            const { data: newCbi, error: cbiError } = await supabase
              .from('country_budget_items')
              .insert({
                activity_id: activityId,
                vocabulary: cbi.vocabulary
              })
              .select('id')
              .single();

            if (cbiError || !newCbi) {
              console.error('[IATI Import] Error inserting country_budget_items:', cbiError);
              continue;
            }

            // Insert child budget_items records
            if (cbi.budgetItems && cbi.budgetItems.length > 0) {
              const budgetItemsToInsert = cbi.budgetItems.map((item: any) => ({
                country_budget_items_id: newCbi.id,
                code: item.code,
                percentage: item.percentage,
                description: item.description || null
              }));

              const { error: itemsError } = await supabase
                .from('budget_items')
                .insert(budgetItemsToInsert);

              if (itemsError) {
                console.error('[IATI Import] Error inserting budget_items:', itemsError);
              }
            }
          }

          updatedFields.push('country_budget_items');
          console.log(`[IATI Import] ✓ Imported ${iati_data.countryBudgetItems.length} country budget items`);
        }
      } catch (error) {
        console.error('[IATI Import] Error importing country budget items:', error);
      }
    }

    // Handle related activities if selected
    if (fields.related_activities && iati_data.relatedActivities) {
      console.log('[IATI Import] Updating related activities');
      console.log('[IATI Import] Related activities data:', JSON.stringify(iati_data.relatedActivities, null, 2));

      try {
        // Clear existing activity relationships
        await supabase
          .from('activity_relationships')
          .delete()
          .eq('activity_id', activityId);

        // Insert new related activities
        if (Array.isArray(iati_data.relatedActivities) && iati_data.relatedActivities.length > 0) {
          let linkedCount = 0;
          let skippedCount = 0;

          for (const relatedActivity of iati_data.relatedActivities) {
            console.log(`[IATI Import] Processing related activity: ${relatedActivity.ref} (type: ${relatedActivity.type})`);

            // Look up the related activity by IATI identifier
            const { data: matchingActivities, error: searchError } = await supabase
              .from('activities')
              .select('id, iati_identifier, title_narrative')
              .eq('iati_identifier', relatedActivity.ref)
              .limit(1);

            console.log(`[IATI Import] Search result for ${relatedActivity.ref}:`, {
              found: matchingActivities?.length || 0,
              error: searchError,
              data: matchingActivities
            });

            if (matchingActivities && matchingActivities.length > 0) {
              const relatedActivityId = matchingActivities[0].id;
              console.log(`[IATI Import] Found matching activity: ${matchingActivities[0].title_narrative} (${relatedActivityId})`);

              // Create the relationship (internal link)
              const { error: linkError } = await supabase
                .from('activity_relationships')
                .insert({
                  activity_id: activityId,
                  related_activity_id: relatedActivityId,
                  relationship_type: relatedActivity.type,
                  narrative: `Imported from IATI XML`
                });

              if (!linkError) {
                linkedCount++;
                console.log(`[IATI Import] ✓ Successfully linked to activity: ${relatedActivity.ref}`);
              } else {
                console.error(`[IATI Import] ❌ Error linking activity ${relatedActivity.ref}:`, linkError);
                skippedCount++;
              }
            } else {
              // Activity not found in database - create an external link
              console.log(`[IATI Import] Activity not found in database: ${relatedActivity.ref} - creating external link`);
              
              const { error: externalLinkError } = await supabase
                .from('activity_relationships')
                .insert({
                  activity_id: activityId,
                  external_iati_identifier: relatedActivity.ref,
                  external_activity_title: `External: ${relatedActivity.ref}`,
                  is_resolved: false,
                  relationship_type: relatedActivity.type,
                  narrative: `Imported from IATI XML (external reference)`
                });

              if (!externalLinkError) {
                linkedCount++;
                console.log(`[IATI Import] ✓ Created external link for activity: ${relatedActivity.ref}`);
              } else {
                console.error(`[IATI Import] ❌ Error creating external link for ${relatedActivity.ref}:`, externalLinkError);
                skippedCount++;
              }
            }
          }

          if (linkedCount > 0) {
            updatedFields.push('related_activities');
            console.log(`[IATI Import] ✓ Imported ${linkedCount} related activities (${skippedCount} errors)`);
          }

          if (skippedCount > 0) {
            importWarnings.push({
              type: 'related_activities_errors',
              message: `${skippedCount} related activit${skippedCount === 1 ? 'y' : 'ies'} could not be imported`,
              details: {
                total_attempted: iati_data.relatedActivities.length,
                successfully_imported: linkedCount,
                error_count: skippedCount
              }
            });
          }
        }
      } catch (error) {
        console.error('[IATI Import] Error importing related activities:', error);
      }
    }

    // Handle other identifiers if selected
    if (fields.importedOtherIdentifiers && Array.isArray(fields.importedOtherIdentifiers) && fields.importedOtherIdentifiers.length > 0) {
      console.log('[IATI Import] Updating other identifiers');

      try {
        // Save to JSONB column
        updateData.other_identifiers = fields.importedOtherIdentifiers.map((identifier: any) => ({
          ref: identifier.ref,
          type: identifier.type,
          ownerOrg: identifier.ownerOrg ? {
            ref: identifier.ownerOrg.ref,
            narrative: identifier.ownerOrg.narrative
          } : undefined
        }));

        updatedFields.push('other_identifiers');
        console.log(`[IATI Import] ✓ Imported ${fields.importedOtherIdentifiers.length} other identifiers`);
      } catch (error) {
        console.error('[IATI Import] Error importing other identifiers:', error);
      }
    }

    // Update sync tracking fields
    const syncUpdate = {
      last_sync_time: new Date().toISOString(),
      sync_status: 'live' as const,
      auto_sync_fields: Object.keys(fields).filter(k => fields[k])
    };
    
    await supabase
      .from('activities')
      .update(syncUpdate)
      .eq('id', activityId);
    
    // Create import log entry
    // For now, we'll use null for user ID since we're not implementing user auth tracking
    const importLog = {
      activity_id: activityId,
      import_type: 'manual' as const,
      result_status: updatedFields.length > 0 ? 'success' as const : 'partial' as const,
      result_summary: {
        fields_requested: Object.keys(fields).filter(k => fields[k]),
        fields_updated: updatedFields.length,
        details: {
          sectors_updated: fields.sectors ? (iati_data.sectors?.length || 0) : null,
          orgs_updated: fields.participating_orgs ? (iati_data.participating_orgs?.length || 0) : null,
          transactions_added: fields.transactions ? newTransactionsCount : null,
          policy_markers_added: fields.policy_markers ? policyMarkersCount : null
        }
      },
      fields_updated: updatedFields,
      previous_values: previousValues,
      imported_by: null, // TODO: Implement user tracking
      iati_version: '2.03', // Could be extracted from IATI data
      source_url: 'IATI Datastore API'
    };
    
    const { error: logError } = await supabase
      .from('iati_import_log')
      .insert(importLog);
    
    if (logError) {
      console.error('[IATI Import] Error creating import log:', logError);
      // Don't throw - import was successful
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      activity_id: activityId,
      fields_updated: updatedFields,
      warnings: importWarnings.length > 0 ? importWarnings : undefined,
      summary: {
        total_fields_requested: Object.keys(fields).filter(k => fields[k]).length,
        total_fields_updated: updatedFields.length,
        sectors_updated: fields.sectors && iati_data.sectors ? iati_data.sectors.length : 0,
        organizations_updated: fields.participating_orgs && iati_data.participating_orgs ?
          iati_data.participating_orgs.length : 0,
        transactions_added: fields.transactions ? newTransactionsCount : 0,
        planned_disbursements_added: fields.planned_disbursements ? plannedDisbursementsCount : 0,
        policy_markers_added: fields.policy_markers ? policyMarkersCount : 0,
        organizations_created: orgStats.created,
        organizations_linked: orgStats.linked,
        last_sync_time: syncUpdate.last_sync_time,
        sync_status: syncUpdate.sync_status,
        has_warnings: importWarnings.length > 0
      }
    });
    
  } catch (error) {
    console.error('[IATI Import] ❌ CRITICAL ERROR:', error);

    // Log detailed error information
    if (error instanceof Error) {
      console.error('[IATI Import] Error name:', error.name);
      console.error('[IATI Import] Error message:', error.message);
      console.error('[IATI Import] Error stack:', error.stack);
    } else {
      console.error('[IATI Import] Non-Error object thrown:', JSON.stringify(error, null, 2));
    }

    // Get activityId for logging (it may not be available if params resolution failed)
    let activityId: string | undefined;
    try {
      const resolvedParams = await Promise.resolve(params);
      activityId = resolvedParams.id;
    } catch (e) {
      console.error('[IATI Import] Failed to resolve params:', e);
    }

    // Try to log the error
    if (activityId) {
      try {
        await getSupabaseAdmin()
          .from('iati_import_log')
          .insert({
            activity_id: activityId,
            import_type: 'manual',
            result_status: 'failed',
            result_summary: { error: error instanceof Error ? error.message : 'Unknown error' },
            fields_updated: [],
            error_details: error instanceof Error ? error.stack : String(error),
            imported_by: null // TODO: Implement user tracking
          });
      } catch (logError) {
        console.error('[IATI Import] Failed to log error:', logError);
      }
    }

    // Return detailed error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error && error.stack ? error.stack : JSON.stringify(error, null, 2);
    
    console.error('[IATI Import] Returning error to client:', errorMessage);
    
    return NextResponse.json(
      {
        error: 'Failed to import IATI data',
        details: errorMessage,
        debug: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';

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
  role?: string;
  type?: string;
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
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id;
    const body: ImportRequest = await request.json();
    const { fields, iati_data } = body;
    
    if (!fields || !iati_data) {
      return NextResponse.json(
        { error: 'Missing required fields: fields and iati_data' },
        { status: 400 }
      );
    }
    
    console.log('[IATI Import] Starting import for activity:', activityId);
    console.log('[IATI Import] Fields to import:', Object.keys(fields).filter(k => fields[k]));
    
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
    
    // Simple field mappings
    const fieldMappings: Record<string, string> = {
      title_narrative: 'title',
      description_narrative: 'description',
      activity_status: 'activity_status',
      activity_date_start_planned: 'planned_start_date',
      activity_date_start_actual: 'actual_start_date',
      activity_date_end_planned: 'planned_end_date',
      activity_date_end_actual: 'actual_end_date',
      default_aid_type: 'default_aid_type',
      flow_type: 'flow_type',
      collaboration_type: 'collaboration_type',
      default_finance_type: 'default_finance_type',
      capital_spend_percentage: 'capital_spend_percentage'
    };
    
    // Process simple fields
    Object.entries(fieldMappings).forEach(([iatiField, dbField]) => {
      if (fields[iatiField] && iati_data[iatiField] !== undefined) {
        previousValues[dbField] = currentActivity[dbField];
        updateData[dbField] = iati_data[iatiField];
        updatedFields.push(iatiField);
      }
    });
    
    // Update activity with simple fields
    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();
      
      const { error: updateError } = await supabase
        .from('activities')
        .update(updateData)
        .eq('id', activityId);
      
      if (updateError) {
        console.error('[IATI Import] Error updating activity:', updateError);
        throw updateError;
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
      
      // Map organization references/names to IDs
      const orgRefs = iati_data.participating_orgs.map((o: IATIOrganization) => o.ref).filter(Boolean);
      const orgNames = iati_data.participating_orgs.map((o: IATIOrganization) => o.name).filter(Boolean);
      
      const { data: organizations } = await supabase
        .from('organizations')
        .select('id, iati_org_id, name')
        .or(`iati_org_id.in.(${orgRefs.join(',')}),name.in.(${orgNames.join(',')})`);
      
      const orgMap = new Map<string, string>();
      (organizations || []).forEach((org: DBOrganization) => {
        if (org.iati_org_id) orgMap.set(org.iati_org_id, org.id);
        orgMap.set(org.name, org.id);
      });
      
      console.log(`[IATI Import] Found ${organizations?.length || 0} matching organizations in database`);
      
      // Clear existing participating organizations
      await supabase
        .from('activity_participating_organizations')
        .delete()
        .eq('activity_id', activityId);
      
      // Track unmatched organizations for logging
      const unmatchedOrgs: Array<{ref?: string; name?: string; role?: string}> = [];
      
      // Insert new participating organizations
      const participatingOrgs = iati_data.participating_orgs
        .map((org: IATIOrganization, index: number) => {
          const orgId = orgMap.get(org.ref || '') || orgMap.get(org.name || '');
          if (!orgId) {
            // Log detailed warning about unmatched organization
            const orgIdentifier = org.ref || org.name || 'Unknown';
            console.warn(`[IATI Import] ⚠️  Organization not found in database: ${orgIdentifier}`);
            console.warn(`[IATI Import]     - IATI Ref: ${org.ref || 'N/A'}`);
            console.warn(`[IATI Import]     - Name: ${org.name || 'N/A'}`);
            console.warn(`[IATI Import]     - Role: ${org.role || 'N/A'}`);
            console.warn(`[IATI Import]     - Type: ${org.type || 'N/A'}`);
            
            unmatchedOrgs.push({
              ref: org.ref,
              name: org.name,
              role: org.role
            });
            
            return null;
          }
          
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
          
          return {
            activity_id: activityId,
            organization_id: orgId,
            role_type: roleType,
            display_order: index
          };
        })
        .filter(Boolean);
      
      if (participatingOrgs.length > 0) {
        await supabase
          .from('activity_participating_organizations')
          .insert(participatingOrgs);
        console.log(`[IATI Import] ✅ Successfully imported ${participatingOrgs.length} participating organizations`);
      }
      
      // Log summary of unmatched organizations
      if (unmatchedOrgs.length > 0) {
        console.error(`[IATI Import] ❌ Failed to match ${unmatchedOrgs.length} organizations:`);
        unmatchedOrgs.forEach((org, idx) => {
          console.error(`[IATI Import]    ${idx + 1}. ${org.ref || org.name || 'Unknown'} (${org.ref ? 'ref' : 'name'}-based lookup)`);
        });
        console.error('[IATI Import] 💡 Tip: Ensure these organizations exist in the organizations table with matching iati_org_id or name values');
        
        // Add to import warnings
        importWarnings.push({
          type: 'organization_matching',
          message: `${unmatchedOrgs.length} organization(s) could not be matched and were skipped`,
          details: {
            total_attempted: iati_data.participating_orgs.length,
            successfully_matched: participatingOrgs.length,
            unmatched_count: unmatchedOrgs.length,
            unmatched_organizations: unmatchedOrgs.map(org => ({
              identifier: org.ref || org.name || 'Unknown',
              ref: org.ref,
              name: org.name,
              role: org.role,
              lookup_method: org.ref ? 'iati_org_id' : 'name'
            }))
          }
        });
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
      const existingSignatures = new Set(
        (existingTransactions || []).map((t: ExistingTransaction) => 
          `${t.transaction_type}-${t.transaction_date}-${t.value}-${t.currency}`
        )
      );
      
      // Filter out duplicate transactions
      const newTransactions = (iati_data.transactions || []).filter((t: IATITransaction) => {
        const signature = `${t.type}-${t.date}-${t.value}-${t.currency || 'USD'}`;
        return !existingSignatures.has(signature);
      });
      
      newTransactionsCount = newTransactions.length;
      console.log(`[IATI Import] Found ${newTransactionsCount} new transactions out of ${iati_data.transactions.length} total`);
      
      // Initialize organization stats
      let orgStats = { created: 0, linked: 0 };
      
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
        
        // AUTO-CREATE MISSING ORGANIZATIONS
        const createMissingOrganizations = async (transactions: IATITransaction[]) => {
          const orgRefsToCheck = new Set<string>();
          const orgData = new Map<string, { name: string, ref: string }>();
          
          // Collect all unique organization references from transactions
          transactions.forEach(t => {
            if (t.providerOrg?.ref) {
              orgRefsToCheck.add(t.providerOrg.ref);
              orgData.set(t.providerOrg.ref, {
                name: t.providerOrg.name || t.providerOrg.ref,
                ref: t.providerOrg.ref
              });
            }
            if (t.receiverOrg?.ref) {
              orgRefsToCheck.add(t.receiverOrg.ref);
              orgData.set(t.receiverOrg.ref, {
                name: t.receiverOrg.name || t.receiverOrg.ref,
                ref: t.receiverOrg.ref
              });
            }
          });

          if (orgRefsToCheck.size === 0) return { created: 0, linked: 0 };

          // Check which organizations already exist in database
          const { data: existingOrgs, error: fetchError } = await supabase
            .from('organizations')
            .select('id, name, iati_org_id')
            .in('iati_org_id', Array.from(orgRefsToCheck));

          if (fetchError) {
            console.error('Error fetching existing organizations:', fetchError);
            throw new Error(`Failed to check existing organizations: ${fetchError.message}`);
          }

          const existingOrgRefs = new Set(existingOrgs?.map(o => o.iati_org_id) || []);
          let linkedCount = 0;
          
          // Update orgNameMap with existing organizations
          existingOrgs?.forEach(org => {
            if (org.iati_org_id) {
              orgNameMap.set(org.iati_org_id, org.id);
              linkedCount++;
            }
          });

          // Determine which organizations need to be created
          const orgsToCreate = Array.from(orgRefsToCheck)
            .filter(ref => !existingOrgRefs.has(ref))
            .map(ref => {
              const data = orgData.get(ref)!;
              return {
                name: data.name,
                iati_org_id: ref,
                organization_type: 'other', // Default type for auto-created orgs
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
            });

          let createdCount = 0;

          // Create missing organizations
          if (orgsToCreate.length > 0) {
            console.log(`[IATI Import] Creating ${orgsToCreate.length} missing organizations:`, orgsToCreate);
            
            const { data: newOrgs, error: createError } = await supabase
              .from('organizations')
              .insert(orgsToCreate)
              .select('id, name, iati_org_id');

            if (createError) {
              console.error('[IATI Import] Error creating organizations:', createError);
              throw new Error(`Failed to create organizations: ${createError.message}`);
            }

            createdCount = newOrgs?.length || 0;
            
            // Update orgNameMap with newly created organizations
            newOrgs?.forEach(org => {
              if (org.iati_org_id) {
                orgNameMap.set(org.iati_org_id, org.id);
              }
            });

            console.log(`[IATI Import] Successfully created ${createdCount} organizations`);
          }

          return { created: createdCount, linked: linkedCount };
        };
        
        // Auto-create missing organizations and get creation stats
        console.log('[IATI Import] Processing organizations for', newTransactions.length, 'transactions...');
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
          
          validTransactions.push({
            activity_id: activityId,
            transaction_type: t.type,
            transaction_date: t.date,
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
            aid_type: t.aidType,
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
        const conditionData = iati_data.conditions.conditions.map((condition: any, index: number) => ({
          activity_id: activityId,
          condition_type: condition.type || '1',
          condition_text: condition.narrative,
          language: condition.narrativeLang || 'en',
          display_order: index
        }));
        
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
    if (fields.planned_disbursements && iati_data.plannedDisbursements) {
      console.log('[IATI Import] Updating planned disbursements');
      
      // Clear existing planned disbursements
      await supabase
        .from('planned_disbursements')
        .delete()
        .eq('activity_id', activityId);
      
      // Insert new planned disbursements with IATI-compliant currency resolution
      if (Array.isArray(iati_data.plannedDisbursements) && iati_data.plannedDisbursements.length > 0) {
        const validPDs: any[] = [];
        const skippedPDs: any[] = [];
        
        for (const pd of iati_data.plannedDisbursements) {
          // Resolve currency following IATI Standard §4.2
          const resolvedCurrency = resolveCurrency(
            pd.currency,
            currentActivity?.default_currency,
            organizationDefaultCurrency
          );
          
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
          
          validPDs.push({
            activity_id: activityId,
            disbursement_type: pd.type || '1',
            period_start: pd.period?.start,
            period_end: pd.period?.end,
            amount: pd.value,
            currency: resolvedCurrency,
            value_date: pd.valueDate,
            provider_org_ref: pd.providerOrg?.ref,
            provider_org_name: pd.providerOrg?.name,
            provider_org_activity_id: pd.providerOrg?.providerActivityId,
            receiver_org_ref: pd.receiverOrg?.ref,
            receiver_org_name: pd.receiverOrg?.name,
            receiver_org_activity_id: pd.receiverOrg?.receiverActivityId
          });
        }
        
        // Insert only valid planned disbursements
        if (validPDs.length > 0) {
          const { error: pdError } = await supabase
            .from('planned_disbursements')
            .insert(validPDs);
          
          if (!pdError) {
            updatedFields.push('planned_disbursements');
            console.log(`[IATI Import] ✓ Imported ${validPDs.length} planned disbursements`);
          } else {
            console.error('[IATI Import] Error inserting planned disbursements:', pdError);
          }
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
        // First, create or get the financing_terms record
        const { data: existingFT, error: ftCheckError } = await supabase
          .from('financing_terms')
          .select('id')
          .eq('activity_id', activityId)
          .single();
        
        let financingTermsId: string;
        
        if (existingFT) {
          financingTermsId = existingFT.id;
          // Clear existing related data
          await supabase.from('loan_terms').delete().eq('financing_terms_id', financingTermsId);
          await supabase.from('loan_statuses').delete().eq('financing_terms_id', financingTermsId);
          await supabase.from('financing_other_flags').delete().eq('financing_terms_id', financingTermsId);
        } else {
          // Create new financing_terms record
          const { data: newFT, error: ftInsertError } = await supabase
            .from('financing_terms')
            .insert({
              activity_id: activityId,
              channel_code: iati_data.financingTerms.channelCode
            })
            .select('id')
            .single();
          
          if (ftInsertError || !newFT) {
            throw new Error('Failed to create financing_terms record');
          }
          financingTermsId = newFT.id;
        }
        
        // Insert loan terms if present
        if (iati_data.financingTerms.loanTerms) {
          const loanTermsData = {
            financing_terms_id: financingTermsId,
            rate_1: iati_data.financingTerms.loanTerms.rate_1,
            rate_2: iati_data.financingTerms.loanTerms.rate_2,
            repayment_type_code: iati_data.financingTerms.loanTerms.repayment_type_code,
            repayment_plan_code: iati_data.financingTerms.loanTerms.repayment_plan_code,
            commitment_date: iati_data.financingTerms.loanTerms.commitment_date,
            repayment_first_date: iati_data.financingTerms.loanTerms.repayment_first_date,
            repayment_final_date: iati_data.financingTerms.loanTerms.repayment_final_date
          };
          
          await supabase.from('loan_terms').insert(loanTermsData);
        }
        
        // Insert loan statuses if present
        if (iati_data.financingTerms.loanStatuses && iati_data.financingTerms.loanStatuses.length > 0) {
          const loanStatusData = iati_data.financingTerms.loanStatuses.map((status: any) => ({
            financing_terms_id: financingTermsId,
            year: status.year,
            currency: status.currency,
            value_date: status.value_date,
            interest_received: status.interest_received,
            principal_outstanding: status.principal_outstanding,
            principal_arrears: status.principal_arrears,
            interest_arrears: status.interest_arrears
          }));
          
          await supabase.from('loan_statuses').insert(loanStatusData);
        }
        
        // Insert other flags if present
        if (iati_data.financingTerms.otherFlags && iati_data.financingTerms.otherFlags.length > 0) {
          const otherFlagsData = iati_data.financingTerms.otherFlags.map((flag: any) => ({
            financing_terms_id: financingTermsId,
            code: flag.code,
            significance: flag.significance
          }));
          
          await supabase.from('financing_other_flags').insert(otherFlagsData);
        }
        
        updatedFields.push('financing_terms');
        console.log('[IATI Import] ✓ Imported financing terms');
      } catch (error) {
        console.error('[IATI Import] Error importing financing terms:', error);
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
          transactions_added: fields.transactions ? newTransactionsCount : null
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
        organizations_created: orgStats.created,
        organizations_linked: orgStats.linked,
        last_sync_time: syncUpdate.last_sync_time,
        sync_status: syncUpdate.sync_status,
        has_warnings: importWarnings.length > 0
      }
    });
    
  } catch (error) {
    console.error('[IATI Import] Error:', error);
    
    // Try to log the error
    try {
      await getSupabaseAdmin()
        .from('iati_import_log')
        .insert({
          activity_id: params.id,
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
    
    return NextResponse.json(
      { 
        error: 'Failed to import IATI data', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 
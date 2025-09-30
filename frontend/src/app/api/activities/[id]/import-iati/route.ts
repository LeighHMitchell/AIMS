import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

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
  };
  receiverOrg?: {
    ref?: string;
    name?: string;
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
    
    // Store previous values for audit log
    const previousValues: Record<string, any> = {};
    const updatedFields: string[] = [];
    
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
      default_finance_type: 'default_finance_type'
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
      
      // Clear existing participating organizations
      await supabase
        .from('activity_participating_organizations')
        .delete()
        .eq('activity_id', activityId);
      
      // Insert new participating organizations
      const participatingOrgs = iati_data.participating_orgs
        .map((org: IATIOrganization, index: number) => {
          const orgId = orgMap.get(org.ref || '') || orgMap.get(org.name || '');
          if (!orgId) return null;
          
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
        const locationData = iati_data.locations.map((loc: any) => {
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
          
          return {
            activity_id: activityId,
            location_type: locationType,
            location_name: loc.name || 'Unnamed Location',
            description: loc.description,
            location_description: loc.description,
            activity_location_description: loc.activityDescription,
            
            // Coordinates (if site)
            latitude,
            longitude,
            srs_name: loc.point?.srsName || 'http://www.opengis.net/def/crs/EPSG/0/4326',
            
            // IATI fields
            location_reach: loc.locationReach ? parseInt(loc.locationReach) : null,
            exactness: loc.exactness ? parseInt(loc.exactness) : null,
            location_class: loc.locationClass ? parseInt(loc.locationClass) : null,
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
        });
        
        const { error: locationsError } = await supabase
          .from('activity_locations')
          .insert(locationData);
        
        if (locationsError) {
          console.error('[IATI Import] Error inserting locations:', locationsError);
          // Don't throw - continue with other updates
        } else {
          updatedFields.push('locations');
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
        
        // Prepare transaction data
        const transactionData = newTransactions.map((t: IATITransaction) => ({
          activity_id: activityId,
          transaction_type: t.type,
          transaction_date: t.date,
          value: t.value,
          currency: t.currency || 'USD',
          status: 'actual', // IATI transactions are actual
          description: t.description,
          
          // Provider organization
          provider_org_id: t.providerOrg?.ref ? 
            (orgNameMap.get(t.providerOrg.ref) || orgNameMap.get(t.providerOrg.name || '')) : null,
          provider_org_ref: t.providerOrg?.ref,
          provider_org_name: t.providerOrg?.name,
          
          // Receiver organization
          receiver_org_id: t.receiverOrg?.ref ? 
            (orgNameMap.get(t.receiverOrg.ref) || orgNameMap.get(t.receiverOrg.name || '')) : null,
          receiver_org_ref: t.receiverOrg?.ref,
          receiver_org_name: t.receiverOrg?.name,
          
          // IATI fields
          aid_type: t.aidType,
          finance_type: t.financeType,
          tied_status: t.tiedStatus,
          flow_type: t.flowType,
          disbursement_channel: t.disbursementChannel,
          
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert(transactionData);
        
        if (transactionError) {
          console.error('[IATI Import] Error inserting transactions:', transactionError);
          // Don't throw - continue with other updates
        } else {
          updatedFields.push('transactions');
        }
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
      summary: {
        total_fields_requested: Object.keys(fields).filter(k => fields[k]).length,
        total_fields_updated: updatedFields.length,
        sectors_updated: fields.sectors && iati_data.sectors ? iati_data.sectors.length : 0,
        organizations_updated: fields.participating_orgs && iati_data.participating_orgs ? 
          iati_data.participating_orgs.length : 0,
        transactions_added: fields.transactions ? newTransactionsCount : 0,
        last_sync_time: syncUpdate.last_sync_time,
        sync_status: syncUpdate.sync_status
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
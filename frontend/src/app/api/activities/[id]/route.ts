import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { resolveCurrencySync, resolveValueDate } from '@/lib/currency-helpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper function to clean date values (convert empty strings to null)
function cleanDateValue(value: any): string | null {
  if (!value || value === '' || value === 'null') {
    return null;
  }
  return value;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    // Handle both sync and async params (Next.js 14/15 compatibility)
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }
    
    console.log('[AIMS API] ===== PATCH /api/activities/[id] START =====');
    console.log('[AIMS API] Activity ID:', id);
    console.log('[AIMS API] Request body keys:', Object.keys(body));
    console.log('[AIMS API] publicationStatus:', body.publicationStatus);
    console.log('[AIMS API] Update data:', JSON.stringify(body, null, 2));

    // Handle reporting organization fields from IATI import
    let reportingOrgId: string | null = null;
    let reportingOrgAcronym: string | null = null;

    if (body.reporting_org_name || body.reportingOrgName) {
      const reportingOrgName = body.reporting_org_name || body.reportingOrgName;
      const reportingOrgRef = body.reporting_org_ref || body.reportingOrgRef;
      const reportingOrgType = body.reporting_org_type || body.reportingOrgType || '10'; // Default to 10 (Government) if not provided

      console.log(`[AIMS API] Processing reporting organization: ${reportingOrgName}${reportingOrgRef ? ` (${reportingOrgRef})` : ' (no ref)'}, Type: ${reportingOrgType}`);

      // Build query - if we have a ref, search by ref/name, otherwise just by name
      let query = getSupabaseAdmin()
        .from('organizations')
        .select('id, name, iati_org_id, alias_refs, acronym');

      if (reportingOrgRef) {
        query = query.or(`iati_org_id.eq.${reportingOrgRef},name.ilike.${reportingOrgName},alias_refs.cs.{${reportingOrgRef}}`);
      } else {
        query = query.ilike('name', reportingOrgName);
      }

      const { data: existingOrgs } = await query;

      // Check if any of the found orgs match
      const matchingOrg = existingOrgs?.find(org => {
        // If we have a ref, match by ref first
        if (reportingOrgRef) {
          return org.iati_org_id === reportingOrgRef ||
                 org.alias_refs?.includes(reportingOrgRef) ||
                 org.name?.toLowerCase() === reportingOrgName?.toLowerCase();
        }
        // Otherwise just match by name
        return org.name?.toLowerCase() === reportingOrgName?.toLowerCase();
      });

      if (matchingOrg) {
        reportingOrgId = matchingOrg.id;
        reportingOrgAcronym = matchingOrg.acronym;
        console.log(`[AIMS API] Found existing organization: ${matchingOrg.name} (ID: ${reportingOrgId})`);
      } else {
        // Don't create organization for reporting-org - it should be created via transactions/participating orgs
        console.log(`[AIMS API] Reporting organization not found: ${reportingOrgName}${reportingOrgRef ? ` (${reportingOrgRef})` : ' (no ref)'} - will be created via transactions or participating orgs`);
        // Store the ref and name for later use, but don't create the org here
      }
    }

    // Handle basic activity field updates (title, description, dates, etc.)
    const activityFields: any = {};
    const fieldsToUpdate = [
      'title_narrative', 'description_narrative', 'description_objectives', 'description_target_groups', 'description_other',
      'planned_start_date', 'planned_end_date', 'actual_start_date', 'actual_end_date', 'activity_status', 'collaboration_type',
      'iati_identifier', 'default_currency', 'default_aid_type', 'default_finance_type',
      'default_flow_type', 'default_tied_status', 'activity_scope', 'language',
      'recipient_countries', 'recipient_regions', 'custom_geographies', 'capital_spend_percentage',
      'banner', 'icon'
    ];
    
    // Normalize activity_scope value (string '1'-'8') if provided using a helper
    const normalizeScope = (val: any): string | null => {
      if (val == null) return null;
      const str = String(val).trim();
      const map: Record<string, string> = {
        global: '1',
        regional: '2',
        'multi-national': '3',
        national: '4',
        'sub-national multi first level': '5',
        'sub-national single first level': '6',
        'sub-national single second level': '7',
        'single location': '8',
      };
      if (map[str.toLowerCase()]) return map[str.toLowerCase()];
      if (/^[1-8]$/.test(str)) return str;
      return null;
    };

    // Accept camelCase fields and map to DB column names
    if (body.title !== undefined) activityFields.title_narrative = body.title;
    if (body.description !== undefined) activityFields.description_narrative = body.description;
    if (body.descriptionObjectives !== undefined) activityFields.description_objectives = body.descriptionObjectives;
    if (body.descriptionTargetGroups !== undefined) activityFields.description_target_groups = body.descriptionTargetGroups;
    if (body.descriptionOther !== undefined) activityFields.description_other = body.descriptionOther;
    if (body.plannedStartDate !== undefined) activityFields.planned_start_date = cleanDateValue(body.plannedStartDate);
    if (body.plannedEndDate !== undefined) activityFields.planned_end_date = cleanDateValue(body.plannedEndDate);
    if (body.actualStartDate !== undefined) activityFields.actual_start_date = cleanDateValue(body.actualStartDate);
    if (body.actualEndDate !== undefined) activityFields.actual_end_date = cleanDateValue(body.actualEndDate);
    if (body.activityStatus !== undefined) activityFields.activity_status = body.activityStatus;
    if (body.collaborationType !== undefined) activityFields.collaboration_type = body.collaborationType;
    if (body.iatiIdentifier !== undefined) activityFields.iati_identifier = body.iatiIdentifier;
    // Explicitly convert empty strings to null for default fields to prevent constraint violations
    if (body.defaultCurrency !== undefined) activityFields.default_currency = (!body.defaultCurrency || body.defaultCurrency.trim() === '') ? null : body.defaultCurrency;
    if (body.defaultAidType !== undefined) activityFields.default_aid_type = (!body.defaultAidType || body.defaultAidType.trim() === '') ? null : body.defaultAidType;
    if (body.defaultFinanceType !== undefined) activityFields.default_finance_type = (!body.defaultFinanceType || body.defaultFinanceType.trim() === '') ? null : body.defaultFinanceType;
    if (body.defaultFlowType !== undefined) activityFields.default_flow_type = (!body.defaultFlowType || body.defaultFlowType.trim() === '') ? null : body.defaultFlowType;
    if (body.defaultTiedStatus !== undefined) activityFields.default_tied_status = (!body.defaultTiedStatus || body.defaultTiedStatus.trim() === '') ? null : body.defaultTiedStatus;
    if (body.language !== undefined) activityFields.language = body.language;
    if (body.acronym !== undefined) activityFields.acronym = body.acronym;
    if (body.activityScope !== undefined) activityFields.activity_scope = normalizeScope(body.activityScope);
    if (body.publicationStatus !== undefined) activityFields.publication_status = body.publicationStatus;

    // Add reporting organization fields if they were processed
    if (reportingOrgId) {
      activityFields.reporting_org_id = reportingOrgId;
      activityFields.created_by_org_name = body.reporting_org_name || body.reportingOrgName;
      activityFields.created_by_org_acronym = reportingOrgAcronym;
      activityFields.reporting_org_ref = body.reporting_org_ref || body.reportingOrgRef;
      activityFields.reporting_org_name = body.reporting_org_name || body.reportingOrgName;
      console.log(`[AIMS API] Setting reporting org fields:`, {
        reporting_org_id: reportingOrgId,
        created_by_org_name: activityFields.created_by_org_name,
        created_by_org_acronym: reportingOrgAcronym
      });
    }

    fieldsToUpdate.forEach(field => {
      if (body[field] !== undefined) {
        if (field === 'activity_scope') {
          const normalized = normalizeScope(body[field]);
          if (normalized !== null) activityFields[field] = normalized;
        } else if (field === 'planned_start_date' || field === 'planned_end_date' || field === 'actual_start_date' || field === 'actual_end_date') {
          activityFields[field] = cleanDateValue(body[field]);
        } else {
          activityFields[field] = body[field];
        }
      }
    });
    
    // Update basic activity fields if any were provided
    if (Object.keys(activityFields).length > 0) {
      activityFields.updated_at = new Date().toISOString();
      
      console.log('[AIMS API] Updating basic activity fields:', JSON.stringify(activityFields, null, 2));
      
      const { error: activityUpdateError } = await getSupabaseAdmin()
        .from('activities')
        .update(activityFields)
        .eq('id', id);
      
      if (activityUpdateError) {
        console.error('[AIMS API] Error updating activity fields:', activityUpdateError);
        throw activityUpdateError;
      }
      
      console.log('[AIMS API] Basic activity fields updated successfully');
    }
    
    // Handle SDG mappings update
    if (body.sdgMappings !== undefined) {
      // First, delete existing SDG mappings
      const { error: deleteError } = await getSupabaseAdmin()
        .from('activity_sdg_mappings')
        .delete()
        .eq('activity_id', id);
      
      if (deleteError) {
        console.error('[AIMS API] Error deleting existing SDG mappings:', deleteError);
        throw deleteError;
      }
      
      // Then insert new mappings if any (include mappings without targets since we're not using targets)
      const validMappings = body.sdgMappings.filter((mapping: any) => mapping.sdgGoal);
      
      if (validMappings.length > 0) {
        const sdgMappingsData = validMappings.map((mapping: any) => ({
          activity_id: id,
          sdg_goal: mapping.sdgGoal,
          sdg_target: mapping.sdgTarget && mapping.sdgTarget !== '' ? mapping.sdgTarget : `${mapping.sdgGoal}.1`,
          contribution_percent: mapping.contributionPercent || null,
          notes: mapping.notes || null
        }));
        
        console.log('[AIMS API] Inserting SDG mappings:', JSON.stringify(sdgMappingsData, null, 2));
        
        const { error: insertError } = await getSupabaseAdmin()
          .from('activity_sdg_mappings')
          .insert(sdgMappingsData);
        
        if (insertError) {
          console.error('[AIMS API] Error inserting SDG mappings:', insertError);
          throw insertError;
        }
      }
      
      console.log('[AIMS API] SDG mappings updated successfully');
    }

    // Handle working groups update
    if (body.workingGroups !== undefined) {
      console.log('[AIMS API] Updating working groups for activity:', id);
      
      // First, delete existing working groups
      const { error: deleteError } = await getSupabaseAdmin()
        .from('activity_working_groups')
        .delete()
        .eq('activity_id', id);
      
      if (deleteError) {
        console.error('[AIMS API] Error deleting existing working groups:', deleteError);
        throw deleteError;
      }
      
      // Then insert new working groups if any
      if (body.workingGroups.length > 0) {
        // Fetch working group IDs from database
        const codes = body.workingGroups.map((wg: any) => wg.code);
        const { data: dbWorkingGroups, error: wgFetchError } = await getSupabaseAdmin()
          .from('working_groups')
          .select('id, code')
          .in('code', codes);

        if (wgFetchError) {
          console.error('[AIMS API] Error fetching working groups:', wgFetchError);
          throw wgFetchError;
        }
        
        if (dbWorkingGroups && dbWorkingGroups.length > 0) {
          const workingGroupsData = dbWorkingGroups.map((dbWg: any) => ({
            activity_id: id,
            working_group_id: dbWg.id,
            vocabulary: '99' // IATI custom vocabulary
          }));

          console.log('[AIMS API] Inserting working groups:', JSON.stringify(workingGroupsData, null, 2));

          const { error: wgError } = await getSupabaseAdmin()
            .from('activity_working_groups')
            .insert(workingGroupsData);
            
          if (wgError) {
            console.error('[AIMS API] Error inserting working groups:', wgError);
            throw wgError;
          }
        }
      }
      
      console.log('[AIMS API] Working groups updated successfully');
    }

    // Handle imported participating organizations
    if (body.importedParticipatingOrgs !== undefined) {
      console.log('[AIMS API] Processing imported participating organizations for activity:', id);
      console.log('[AIMS API] Imported participating orgs:', body.importedParticipatingOrgs);
      
      // First, delete existing participating organizations
      const { error: deleteError } = await getSupabaseAdmin()
        .from('activity_participating_organizations')
        .delete()
        .eq('activity_id', id);
      
      if (deleteError) {
        console.error('[AIMS API] Error deleting existing participating organizations:', deleteError);
        throw deleteError;
      }
      
      // Then insert new participating organizations if any
      if (body.importedParticipatingOrgs.length > 0) {
        // Get organization IDs from refs or names
        const orgRefs = body.importedParticipatingOrgs.map((org: any) => org.ref).filter(Boolean);
        const orgNames = body.importedParticipatingOrgs.map((org: any) => org.name).filter(Boolean);
        
        const { data: organizations, error: orgFetchError } = await getSupabaseAdmin()
          .from('organizations')
          .select('id, iati_org_id, name')
          .in('iati_org_id', orgRefs);
        
        if (orgFetchError) {
          console.error('[AIMS API] Error fetching organizations:', orgFetchError);
          throw orgFetchError;
        }
        
        // Create organization mapping
        const orgMap = new Map<string, string>();
        (organizations || []).forEach((org: any) => {
          if (org.iati_org_id) orgMap.set(org.iati_org_id, org.id);
          orgMap.set(org.name, org.id);
        });
        
        // Map participating organizations to database format
        const participatingOrgsData = body.importedParticipatingOrgs
          .map((org: any, index: number) => {
            const orgId = orgMap.get(org.ref || '') || orgMap.get(org.name || '');
            if (!orgId) {
              console.warn(`[AIMS API] Organization not found for ref: ${org.ref}, name: ${org.name}`);
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
              activity_id: id,
              organization_id: orgId,
              role_type: roleType,
              display_order: index
            };
          })
          .filter(Boolean);
        
        if (participatingOrgsData.length > 0) {
          console.log('[AIMS API] Inserting participating organizations:', JSON.stringify(participatingOrgsData, null, 2));
          
          const { error: insertError } = await getSupabaseAdmin()
            .from('activity_participating_organizations')
            .insert(participatingOrgsData);
          
          if (insertError) {
            console.error('[AIMS API] Error inserting participating organizations:', insertError);
            throw insertError;
          }
        }
      }
      
      console.log('[AIMS API] Participating organizations updated successfully');
    }

    // Handle imported budgets
    const budgetImportResult: any = {};
    if (body.importedBudgets !== undefined && Array.isArray(body.importedBudgets)) {
      console.log('[AIMS API] Processing imported budgets for activity:', id);
      console.log('[AIMS API] Imported budgets:', body.importedBudgets);
      
      // Validation: Check for required fields and IATI compliance
      const validBudgets = [];
      const invalidBudgets: Array<{ index: number; budget: any; errors: string[] }> = [];
      
      body.importedBudgets.forEach((budget, index) => {
        const errors = [];
        
        // Required field validation
        if (!budget.period?.start) errors.push('Missing period-start');
        if (!budget.period?.end) errors.push('Missing period-end');
        if (budget.value === undefined || budget.value === null) errors.push('Missing value');
        if (!budget.valueDate) errors.push('Missing value-date');
        
        // Type validation (1 or 2)
        const type = parseInt(budget.type || '1');
        if (![1, 2].includes(type)) errors.push(`Invalid type: ${type} (must be 1 or 2)`);
        
        // Status validation (1 or 2)
        const status = parseInt(budget.status || '1');
        if (![1, 2].includes(status)) errors.push(`Invalid status: ${status} (must be 1 or 2)`);
        
        // Value validation (must be >= 0)
        if (budget.value !== undefined && budget.value !== null && budget.value < 0) {
          errors.push('Value must be >= 0');
        }
        
        // Period validation (start < end, max 1 year)
        if (budget.period?.start && budget.period?.end) {
          const start = new Date(budget.period.start);
          const end = new Date(budget.period.end);
          
          if (start >= end) {
            errors.push('Period start must be before period end');
          }
          
          const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
          if (daysDiff > 366) {
            errors.push('Period cannot exceed 1 year (IATI non-compliant)');
          }
        }
        
        if (errors.length > 0) {
          invalidBudgets.push({ index: index + 1, budget, errors });
          console.warn('[AIMS API] Invalid budget at index', index + 1, ':', { budget, errors });
        } else {
          validBudgets.push(budget);
        }
      });
      
      budgetImportResult.total = body.importedBudgets.length;
      budgetImportResult.imported = validBudgets.length;
      budgetImportResult.skipped = invalidBudgets.length;
      budgetImportResult.errors = invalidBudgets.map(item => ({
        index: item.index,
        errors: item.errors
      }));
      
      if (invalidBudgets.length > 0) {
        console.warn('[AIMS API] Some budgets failed validation:', invalidBudgets);
      }
      
      // Delete existing budgets for this activity (import replaces)
      const { error: deleteError } = await getSupabaseAdmin()
        .from('activity_budgets')
        .delete()
        .eq('activity_id', id);
      
      if (deleteError) {
        console.error('[AIMS API] Error deleting existing budgets:', deleteError);
        throw deleteError;
      }
      
      // Insert new budgets
      if (validBudgets.length > 0) {
        const budgetsToInsert = validBudgets.map((budget: any) => {
          // Resolve currency: budget.currency → activity.default_currency → 'USD'
          const resolvedCurrency = resolveCurrencySync(
            budget.currency,
            body.defaultCurrency
          );
          
          // Resolve value_date: provided → period_start
          const resolvedValueDate = resolveValueDate(
            budget.valueDate,
            budget.period.start
          );
          
          return {
            activity_id: id,
            type: parseInt(budget.type || '1'),
            status: parseInt(budget.status || '1'),
            period_start: budget.period.start,
            period_end: budget.period.end,
            value: parseFloat(budget.value),
            currency: resolvedCurrency,
            value_date: resolvedValueDate
          };
        });
        
        console.log('[AIMS API] Inserting budgets:', JSON.stringify(budgetsToInsert, null, 2));
        
        const { error: insertError } = await getSupabaseAdmin()
          .from('activity_budgets')
          .insert(budgetsToInsert);
        
        if (insertError) {
          console.error('[AIMS API] Error inserting budgets:', insertError);
          throw insertError;
        }
        
        console.log('[AIMS API] Successfully imported', validBudgets.length, 'budgets');
      }
      
      console.log('[AIMS API] Budgets import complete:', budgetImportResult);
    }

    // Handle imported planned disbursements
    const disbursementImportResult: any = {};
    if (body.importedPlannedDisbursements !== undefined && Array.isArray(body.importedPlannedDisbursements)) {
      console.log('[AIMS API] Processing imported planned disbursements for activity:', id);
      console.log('[AIMS API] Imported planned disbursements:', body.importedPlannedDisbursements);
      
      // Validation: Check for required fields and IATI compliance
      const validDisbursements = [];
      const invalidDisbursements: Array<{ index: number; disbursement: any; errors: string[] }> = [];
      
      body.importedPlannedDisbursements.forEach((disbursement, index) => {
        const errors = [];
        
        // Required field validation
        if (!disbursement.period?.start) errors.push('Missing period-start');
        if (!disbursement.period?.end) errors.push('Missing period-end');
        if (disbursement.value === undefined || disbursement.value === null) errors.push('Missing value');
        if (!disbursement.valueDate) errors.push('Missing value-date');
        
        // Type validation (1 or 2)
        if (disbursement.type) {
          const type = String(disbursement.type);
          if (!['1', '2'].includes(type)) errors.push(`Invalid type: ${type} (must be 1 or 2)`);
        }
        
        // Value validation (must be >= 0)
        if (disbursement.value !== undefined && disbursement.value !== null && disbursement.value < 0) {
          errors.push('Value must be >= 0');
        }
        
        // Period validation (start < end)
        if (disbursement.period?.start && disbursement.period?.end) {
          const start = new Date(disbursement.period.start);
          const end = new Date(disbursement.period.end);
          
          if (start >= end) {
            errors.push('Period start must be before period end');
          }
        }
        
        if (errors.length > 0) {
          invalidDisbursements.push({ index: index + 1, disbursement, errors });
          console.warn('[AIMS API] Invalid planned disbursement at index', index + 1, ':', { disbursement, errors });
        } else {
          validDisbursements.push(disbursement);
        }
      });
      
      disbursementImportResult.total = body.importedPlannedDisbursements.length;
      disbursementImportResult.imported = validDisbursements.length;
      disbursementImportResult.skipped = invalidDisbursements.length;
      disbursementImportResult.errors = invalidDisbursements.map(item => ({
        index: item.index,
        errors: item.errors
      }));
      
      if (invalidDisbursements.length > 0) {
        console.warn('[AIMS API] Some planned disbursements failed validation:', invalidDisbursements);
      }
      
      // Delete existing planned disbursements for this activity (import replaces)
      const { error: deleteError } = await getSupabaseAdmin()
        .from('planned_disbursements')
        .delete()
        .eq('activity_id', id);
      
      if (deleteError) {
        console.error('[AIMS API] Error deleting existing planned disbursements:', deleteError);
        throw deleteError;
      }
      
      // Insert new planned disbursements
      if (validDisbursements.length > 0) {
        // Helper function to find or create organization
        const findOrCreateOrganization = async (orgData: any) => {
          if (!orgData || !orgData.name) return null;
          
          let organizationId = null;
          
          // Step 1: Try to match by IATI ref (if provided)
          if (orgData.ref) {
            console.log(`[Planned Disbursement] Searching for org by IATI ref: "${orgData.ref}"`);
            
            const { data: orgsByRef } = await getSupabaseAdmin()
              .from('organizations')
              .select('id, name, iati_org_id');
            
            // Find exact match in comma-separated IATI IDs
            const exactRefMatch = orgsByRef?.find((org: any) => {
              if (!org.iati_org_id) return false;
              const refs = org.iati_org_id.split(',').map((r: string) => r.trim());
              return refs.some((r: string) => r.toLowerCase() === orgData.ref.toLowerCase());
            });
            
            if (exactRefMatch) {
              organizationId = exactRefMatch.id;
              console.log(`[Planned Disbursement] ✓ Matched org by IATI ref "${orgData.ref}":`, exactRefMatch.name);
            } else {
              console.log(`[Planned Disbursement] No IATI ref match found for "${orgData.ref}"`);
            }
          }
          
          // Step 2: If not found by ref, try exact name match
          if (!organizationId && orgData.name) {
            console.log(`[Planned Disbursement] Searching for org by name: "${orgData.name}"`);
            
            const { data: orgsByName } = await getSupabaseAdmin()
              .from('organizations')
              .select('id, name, acronym');
            
            const exactNameMatch = orgsByName?.find((org: any) => 
              org.name?.toLowerCase().trim() === orgData.name.toLowerCase().trim() ||
              org.acronym?.toLowerCase().trim() === orgData.name.toLowerCase().trim()
            );
            
            if (exactNameMatch) {
              organizationId = exactNameMatch.id;
              console.log(`[Planned Disbursement] ✓ Matched org by name "${orgData.name}":`, exactNameMatch.name);
            } else {
              console.log(`[Planned Disbursement] No exact name match found for "${orgData.name}"`);
            }
          }
          
          // Step 3: If still not found, create new organization
          if (!organizationId) {
            console.log(`[Planned Disbursement] Creating new org: "${orgData.name}"`);
            
            const { data: newOrg, error: createError } = await getSupabaseAdmin()
              .from('organizations')
              .insert({
                name: orgData.name,
                iati_org_id: orgData.ref || null,
                Organisation_Type_Code: orgData.type || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();
            
            if (createError) {
              // Organization might have been created by another concurrent request
              console.log(`[Planned Disbursement] Org creation failed (possibly duplicate), retrying search:`, createError.message);
              
              // Retry search by name
              const { data: retryOrgs } = await getSupabaseAdmin()
                .from('organizations')
                .select('id, name')
                .ilike('name', orgData.name)
                .limit(1);
              
              if (retryOrgs && retryOrgs.length > 0) {
                organizationId = retryOrgs[0].id;
                console.log(`[Planned Disbursement] ✓ Found org on retry:`, retryOrgs[0].name);
              } else {
                console.error(`[Planned Disbursement] ✗ Failed to create or find org:`, orgData.name);
                return null;
              }
            } else {
              organizationId = newOrg.id;
              console.log(`[Planned Disbursement] ✓ Created new org successfully:`, newOrg.name);
            }
          }
          
          return organizationId;
        };
        
        // Helper function to find activity by IATI identifier
        const findActivityByIatiId = async (iatiId: string | null) => {
          if (!iatiId) return null;
          
          console.log(`[Planned Disbursement] Searching for activity by IATI ID: "${iatiId}"`);
          
          const { data: activities } = await getSupabaseAdmin()
            .from('activities')
            .select('id, iati_identifier, title_narrative')
            .eq('iati_identifier', iatiId)
            .limit(1);
          
          if (activities && activities.length > 0) {
            console.log(`[Planned Disbursement] ✓ Found activity: ${activities[0].title_narrative || 'Untitled'}`);
            return activities[0].id;
          }
          
          console.log(`[Planned Disbursement] No activity found with IATI ID "${iatiId}"`);
          return null;
        };
        
        // Process each disbursement to find/create organizations and link activities
        const disbursementsToInsert = await Promise.all(
          validDisbursements.map(async (disbursement: any) => {
            // Find or create provider organization
            const providerOrgId = await findOrCreateOrganization({
              name: disbursement.providerOrg?.name,
              ref: disbursement.providerOrg?.ref,
              type: disbursement.providerOrg?.type
            });
            
            // Find or create receiver organization
            const receiverOrgId = await findOrCreateOrganization({
              name: disbursement.receiverOrg?.name,
              ref: disbursement.receiverOrg?.ref,
              type: disbursement.receiverOrg?.type
            });
            
            // Find activities by IATI identifier
            const providerActivityUuid = await findActivityByIatiId(
              disbursement.providerOrg?.providerActivityId
            );
            const receiverActivityUuid = await findActivityByIatiId(
              disbursement.receiverOrg?.receiverActivityId
            );
            
            // Resolve currency: disbursement.currency → activity.default_currency → 'USD'
            const resolvedCurrency = resolveCurrencySync(
              disbursement.currency,
              body.defaultCurrency
            );
            
            // Resolve value_date: provided → period_start
            const resolvedValueDate = resolveValueDate(
              disbursement.valueDate,
              disbursement.period.start
            );
            
            return {
              activity_id: id,
              type: disbursement.type ? String(disbursement.type) : null,
              period_start: disbursement.period.start,
              period_end: disbursement.period.end,
              amount: parseFloat(disbursement.value),
              currency: resolvedCurrency,
              value_date: resolvedValueDate,
              // Link to organization records via foreign keys
              provider_org_id: providerOrgId,
              provider_org_name: disbursement.providerOrg?.name || null,
              provider_org_ref: disbursement.providerOrg?.ref || null,
              provider_org_type: disbursement.providerOrg?.type || null,
              provider_activity_id: disbursement.providerOrg?.providerActivityId || null,
              provider_activity_uuid: providerActivityUuid,  // NEW - Activity link
              receiver_org_id: receiverOrgId,
              receiver_org_name: disbursement.receiverOrg?.name || null,
              receiver_org_ref: disbursement.receiverOrg?.ref || null,
              receiver_org_type: disbursement.receiverOrg?.type || null,
              receiver_activity_id: disbursement.receiverOrg?.receiverActivityId || null,
              receiver_activity_uuid: receiverActivityUuid,  // NEW - Activity link
              status: disbursement.type === '2' ? 'revised' : 'original',
              notes: disbursement.description || null
            };
          })
        );
        
        console.log('[AIMS API] Inserting planned disbursements with linked organizations:', JSON.stringify(disbursementsToInsert, null, 2));
        
        const { error: insertError } = await getSupabaseAdmin()
          .from('planned_disbursements')
          .insert(disbursementsToInsert);
        
        if (insertError) {
          console.error('[AIMS API] Error inserting planned disbursements:', insertError);
          throw insertError;
        }
        
        console.log('[AIMS API] Successfully imported', validDisbursements.length, 'planned disbursements');
      }
      
      console.log('[AIMS API] Planned disbursements import complete:', disbursementImportResult);
    }

    // Handle imported budget mappings
    const countryBudgetImportResult: any = {};
    if (body.importedCountryBudgetItems !== undefined && Array.isArray(body.importedCountryBudgetItems)) {
      console.log('[AIMS API] 🎯 Processing imported budget mappings for activity:', id);
      console.log('[AIMS API] 🎯 Imported budget mappings count:', body.importedCountryBudgetItems.length);
      console.log('[AIMS API] 🎯 Imported budget mappings data:', JSON.stringify(body.importedCountryBudgetItems, null, 2));
      
      const validCountryBudgetItems = [];
      const invalidCountryBudgetItems: Array<{ index: number; cbi: any; errors: string[] }> = [];
      
      body.importedCountryBudgetItems.forEach((cbi, index) => {
        const errors = [];
        
        // Vocabulary validation
        const validVocabularies = ['1', '2', '3', '4', '5'];
        if (!cbi.vocabulary) {
          errors.push('Missing vocabulary');
        } else if (!validVocabularies.includes(cbi.vocabulary)) {
          errors.push(`Invalid vocabulary: ${cbi.vocabulary}`);
        }
        
        // Budget items validation
        if (!cbi.budgetItems || cbi.budgetItems.length === 0) {
          errors.push('No budget items provided');
        } else {
          cbi.budgetItems.forEach((item: any, itemIndex: number) => {
            if (!item.code) {
              errors.push(`Budget item ${itemIndex + 1}: Missing code`);
            }
            if (item.percentage === undefined || item.percentage === null) {
              errors.push(`Budget item ${itemIndex + 1}: Missing percentage`);
            } else {
              if (item.percentage < 0 || item.percentage > 100) {
                errors.push(`Budget item ${itemIndex + 1}: Invalid percentage (${item.percentage})`);
              }
            }
          });
        }
        
        if (errors.length > 0) {
          invalidCountryBudgetItems.push({ index, cbi, errors });
        } else {
          validCountryBudgetItems.push(cbi);
        }
      });
      
      countryBudgetImportResult.total = body.importedCountryBudgetItems.length;
      countryBudgetImportResult.imported = validCountryBudgetItems.length;
      countryBudgetImportResult.skipped = invalidCountryBudgetItems.length;
      countryBudgetImportResult.errors = invalidCountryBudgetItems.map(item => ({
        index: item.index,
        errors: item.errors
      }));
      
      if (invalidCountryBudgetItems.length > 0) {
        console.warn('[AIMS API] Some budget mappings failed validation:', invalidCountryBudgetItems);
      }
      
      // Delete existing budget mappings for this activity (import replaces)
      const { error: deleteError } = await getSupabaseAdmin()
        .from('country_budget_items')
        .delete()
        .eq('activity_id', id);
      
      if (deleteError) {
        console.error('[AIMS API] Error deleting existing budget mappings:', deleteError);
        throw deleteError;
      }
      
      // Insert new budget mappings
      for (const cbi of validCountryBudgetItems) {
        // Insert parent country_budget_items record
        const { data: newCbi, error: cbiError } = await getSupabaseAdmin()
          .from('country_budget_items')
          .insert({
            activity_id: id,
            vocabulary: cbi.vocabulary
          })
          .select()
          .single();
        
        if (cbiError || !newCbi) {
          console.error('[AIMS API] ❌ Error inserting country_budget_items:', cbiError);
          continue; // Skip to next
        }
        
        console.log('[AIMS API] ✅ Successfully inserted country_budget_items:', newCbi.id);
        
        // Insert child budget_items records
        if (cbi.budgetItems && cbi.budgetItems.length > 0) {
          const budgetItemsToInsert = cbi.budgetItems.map((item: any) => ({
            country_budget_items_id: newCbi.id,
            code: item.code,
            percentage: item.percentage,
            description: item.description || null
          }));
          
          console.log('[AIMS API] 📝 Inserting budget items:', budgetItemsToInsert);
          
          const { error: itemsError } = await getSupabaseAdmin()
            .from('budget_items')
            .insert(budgetItemsToInsert);
          
          if (itemsError) {
            console.error('[AIMS API] ❌ Error inserting budget_items:', itemsError);
          } else {
            console.log('[AIMS API] ✅ Successfully inserted', budgetItemsToInsert.length, 'budget items');
          }
        }
      }
      
      console.log('[AIMS API] 🎉 Budget mappings import complete:', countryBudgetImportResult);
    }

    // Handle imported contacts
    if (body.importedContacts !== undefined && Array.isArray(body.importedContacts)) {
      console.log('[AIMS API] Processing imported contacts for activity:', id);
      console.log('[AIMS API] Imported contacts count:', body.importedContacts.length);
      
      // Delete existing contacts for this activity (import replaces)
      const { error: deleteError } = await getSupabaseAdmin()
        .from('activity_contacts')
        .delete()
        .eq('activity_id', id);
      
      if (deleteError) {
        console.error('[AIMS API] Error deleting existing contacts:', deleteError);
        throw deleteError;
      }
      
      // Insert new contacts
      if (body.importedContacts.length > 0) {
        const contactsToInsert = body.importedContacts.map((contact: any) => {
          // Split personName into first and last name
          // IATI person-name is a single field, but our DB has first_name/last_name
          let firstName = '';
          let lastName = '';
          
          if (contact.personName && contact.personName.trim()) {
            const nameParts = contact.personName.trim().split(/\s+/);
            if (nameParts.length === 1) {
              // Single name - use as last name
              firstName = '';
              lastName = nameParts[0];
            } else if (nameParts.length === 2) {
              // First and last name
              firstName = nameParts[0];
              lastName = nameParts[1];
            } else {
              // Multiple parts - first is firstName, rest is lastName
              firstName = nameParts[0];
              lastName = nameParts.slice(1).join(' ');
            }
          }
          
          // Database requires first_name and last_name to be non-null
          // If no person name provided, use organization name or defaults
          if (!firstName && !lastName) {
            if (contact.organization) {
              // Use organization name as contact identifier
              firstName = '';
              lastName = contact.organization;
            } else {
              // Last resort: use contact type as identifier
              const typeLabels: Record<string, string> = {
                '1': 'General Enquiries',
                '2': 'Project Management',
                '3': 'Financial Management',
                '4': 'Communications'
              };
              firstName = '';
              lastName = typeLabels[contact.type || '1'] || 'Contact';
            }
          }
          
          return {
            activity_id: id,
            type: contact.type || '1',
            first_name: firstName,
            last_name: lastName,
            organisation: contact.organization || null, // Note: British spelling
            department: contact.department || null,
            job_title: contact.jobTitle || null,
            position: contact.jobTitle || null, // Also populate position for backward compatibility
            phone: contact.telephone || null,
            email: contact.email || null,
            website: contact.website || null,
            mailing_address: contact.mailingAddress || null,
            imported_from_iati: true
          };
        });
        
        console.log('[AIMS API] Inserting contacts:', JSON.stringify(contactsToInsert, null, 2));
        
        const { error: insertError } = await getSupabaseAdmin()
          .from('activity_contacts')
          .insert(contactsToInsert);
        
        if (insertError) {
          console.error('[AIMS API] Error inserting contacts:', insertError);
          throw insertError;
        }
        
        console.log('[AIMS API] Successfully imported', body.importedContacts.length, 'contacts');
      }
    }
    
    // Update activity updated_at timestamp only if no basic fields were updated
    if (Object.keys(activityFields).length === 0) {
      const { error: updateError } = await getSupabaseAdmin()
        .from('activities')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (updateError) {
        console.error('[AIMS API] Error updating activity timestamp:', updateError);
      }
    }
    
    // Return success with import statistics
    const response: any = { success: true };
    if (Object.keys(budgetImportResult).length > 0) {
      response.budgets = budgetImportResult;
    }
    if (Object.keys(disbursementImportResult).length > 0) {
      response.plannedDisbursements = disbursementImportResult;
    }
    if (Object.keys(countryBudgetImportResult).length > 0) {
      response.countryBudgetItems = countryBudgetImportResult;
    }
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[AIMS API] Error in PATCH /api/activities/[id]:', error);
    console.error('[AIMS API] Error message:', error?.message);
    console.error('[AIMS API] Error details:', error?.details);
    console.error('[AIMS API] Error hint:', error?.hint);
    console.error('[AIMS API] Error stack:', error?.stack);
    
    // Return more detailed error information
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
        details: error?.details || error?.hint || null
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  // Log immediately - should appear in terminal
  console.error('[AIMS API ERROR LOG] ===== ROUTE CALLED =====');
  console.log('[AIMS API] ===== GET /api/activities/[id] START =====');
  console.log('[AIMS API] Request URL:', request.url);
  
  try {
    // Handle both sync and async params (Next.js 14/15 compatibility)
    const resolvedParams = await Promise.resolve(params);
    console.log('[AIMS API] Full params object:', JSON.stringify(resolvedParams, null, 2));
    
    const { id } = resolvedParams;
    
    console.log('[AIMS API] Extracted ID:', id);
    console.log('[AIMS API] ID type:', typeof id);
    console.log('[AIMS API] ID length:', id?.length);
    
    if (!id) {
      console.error('[AIMS API] ERROR: Activity ID is missing!');
      return NextResponse.json(
        { 
          error: 'Activity ID is required',
          debug: { params: resolvedParams }
        },
        { status: 400 }
      );
    }
    
    console.log('[AIMS API] GET /api/activities/[id] - Fetching activity:', id);
    
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      console.error('[AIMS API] Supabase client is null');
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 503 }
      );
    }
    
    // First, check if the activity exists at all (simple query without joins)
    console.log('[AIMS API] Step 1: Checking if activity exists...');
    const { data: basicActivity, error: basicError } = await supabase
      .from('activities')
      .select('id, title_narrative')
      .eq('id', id)
      .single();
    
    if (basicError || !basicActivity) {
      console.error('[AIMS API] Activity not found (basic check):', basicError);
      console.error('[AIMS API] Error details:', JSON.stringify(basicError, null, 2));
      return NextResponse.json(
        { 
          error: 'Activity not found', 
          details: basicError?.message,
          id: id,
          debug: {
            errorCode: basicError?.code,
            errorMessage: basicError?.message,
            errorDetails: basicError?.details
          }
        },
        { status: 404 }
      );
    }
    
    console.log('[AIMS API] Activity found:', basicActivity.title_narrative);
    
    // OPTIMIZED: Fetch activity with all related data in a single query
    console.log('[AIMS API] Step 2: Fetching full activity data with relations...');
    
    const { data: activityWithRelations, error } = await supabase
      .from('activities')
      .select(`
        *,
        activity_sectors (
          id, activity_id, sector_code, sector_name, percentage, level, 
          category_code, category_name, type, created_at, updated_at
        ),
        transactions!activity_id (*),
        activity_contacts (*),
        activity_locations (*),
        activity_sdg_mappings (*),
        activity_tags (
          tag_id,
          tags (id, name, vocabulary, code, vocabulary_uri, created_by, created_at, updated_at)
        ),
        activity_working_groups (
          working_group_id,
          vocabulary,
          working_groups (id, code, label, description)
        ),
        activity_policy_markers (
          id, activity_id, policy_marker_id, significance, rationale, created_at, updated_at,
          policy_markers (
            id, uuid, code, name, description, marker_type, vocabulary, vocabulary_uri, iati_code, is_iati_standard
          )
        )
      `)
      .eq('id', id)
      .single();
    
    if (error || !activityWithRelations) {
      console.error('[AIMS API] Error fetching full activity data:', error);
      console.error('[AIMS API] Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { 
          error: 'Activity not found',
          details: error?.message,
          id: id 
        },
        { status: 404 }
      );
    }

    console.log('[AIMS API] Single query completed successfully');
    
    // Extract related data from the consolidated result
    const activity = activityWithRelations;
    const sectors = activity.activity_sectors || [];
    const transactions = activity.transactions || [];
    const contacts = activity.activity_contacts || [];
    const locations = activity.activity_locations || [];
    const sdgMappings = activity.activity_sdg_mappings || [];
    const activityTags = activity.activity_tags || [];
    const activityWorkingGroups = activity.activity_working_groups || [];
    const activityPolicyMarkers = activity.activity_policy_markers || [];
    
    console.log('[AIMS API] Extracted data counts:', {
      sectors: sectors.length,
      transactions: transactions.length,
      contacts: contacts.length,
      locations: locations.length,
      sdgMappings: sdgMappings.length,
      tags: activityTags.length,
      workingGroups: activityWorkingGroups.length,
      policyMarkers: activityPolicyMarkers.length
    });
    
    // Transform to match frontend format
    const transformedActivity = {
      ...activity,
      // Explicitly map the UUID field
      uuid: activity.id,
      // Map database fields to frontend fields
      title: activity.title_narrative,
      description: activity.description_narrative,
      // Map IATI description types
      descriptionObjectives: activity.description_objectives,
      descriptionTargetGroups: activity.description_target_groups,
      descriptionOther: activity.description_other,
      partnerId: activity.other_identifier,
      iatiId: activity.iati_identifier,
      iatiIdentifier: activity.iati_identifier,
      created_by_org_name: activity.created_by_org_name,
      created_by_org_acronym: activity.created_by_org_acronym,
      collaborationType: activity.collaboration_type,
      activityStatus: activity.activity_status,
      publicationStatus: activity.publication_status,
      submissionStatus: activity.submission_status,
      reportingOrgId: activity.reporting_org_id,
      plannedStartDate: activity.planned_start_date,
      plannedEndDate: activity.planned_end_date,
      actualStartDate: activity.actual_start_date,
      actualEndDate: activity.actual_end_date,
      defaultAidType: activity.default_aid_type,
      defaultFinanceType: activity.default_finance_type,
      defaultCurrency: activity.default_currency,
      defaultTiedStatus: activity.default_tied_status,
      defaultFlowType: activity.default_flow_type, // <-- Add this line
      flowType: activity.default_flow_type, // (optional: keep for backward compatibility)
      activityScope: activity.activity_scope,
      language: activity.language,
      defaultAidModality: activity.default_aid_modality,
      default_aid_modality: activity.default_aid_modality,
      defaultAidModalityOverride: activity.default_aid_modality_override,
      defaultDisbursementChannel: activity.default_disbursement_channel,
      banner: activity.banner,
      icon: activity.icon,
      hierarchy: activity.hierarchy,
      linkedDataUri: activity.linked_data_uri,
      createdBy: activity.created_by ? { id: activity.created_by } : undefined,
      createdByOrg: activity.reporting_org_id, // For backward compatibility
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
      submittedBy: activity.submitted_by,
      submittedByName: activity.submitted_by_name,
      submittedAt: activity.submitted_at,
      validatedBy: activity.validated_by,
      validatedByName: activity.validated_by_name,
      validatedAt: activity.validated_at,
      rejectedBy: activity.rejected_by,
      rejectedByName: activity.rejected_by_name,
      rejectedAt: activity.rejected_at,
      rejectionReason: activity.rejection_reason,
      publishedBy: activity.published_by,
      publishedAt: activity.published_at,
      // IATI sync fields (defaults if not in DB)
      autoSync: activity.auto_sync || false,
      lastSyncTime: activity.last_sync_time || null,
      syncStatus: activity.sync_status || 'not_synced',
      autoSyncFields: activity.auto_sync_fields || [],
      // Include general_info data
      general_info: activity.general_info || {},
      // Include related data
      sectors: sectors?.map((sector: any) => ({
        id: sector.id,
        code: sector.sector_code,
        name: sector.sector_name,
        percentage: sector.percentage ?? 0,
        level: sector.level,
        categoryCode: sector.category_code || sector.sector_code?.substring(0, 3),
        categoryName: sector.category_name,
        type: sector.type || 'secondary'
      })) || [],
      transactions: transactions || [],
      contacts: contacts?.map((contact: any) => ({
        id: contact.id,
        type: contact.type,
        title: contact.title,
        firstName: contact.first_name,
        middleName: contact.middle_name,
        lastName: contact.last_name,
        position: contact.position,
        organisation: contact.organisation,
        phone: contact.phone,
        fax: contact.fax,
        email: contact.email,
        secondaryEmail: contact.secondary_email,
        profilePhoto: contact.profile_photo,
        notes: contact.notes
      })) || [],
      sdgMappings: sdgMappings?.map((mapping: any) => ({
        id: mapping.id,
        sdgGoal: mapping.sdg_goal,
        sdgTarget: mapping.sdg_target, // Keep as is - should never be null from DB
        contributionPercent: mapping.contribution_percent,
        notes: mapping.notes
      })) || [],
      tags: activityTags?.map((tagRelation: any) => tagRelation.tags) || [],
      workingGroups: activityWorkingGroups?.map((wgRelation: any) => ({
        code: wgRelation.working_groups.code,
        label: wgRelation.working_groups.label,
        vocabulary: wgRelation.vocabulary
      })) || [],
      policyMarkers: activityPolicyMarkers?.map((marker: any) => ({
        policy_marker_id: marker.policy_marker_id,
        significance: marker.significance, // Use the correct significance column
        rationale: marker.rationale,
        policy_marker_details: marker.policy_markers
      })) || [],
      locations: (() => {
        console.log('[AIMS API] Raw locations from DB:', locations);
        const specificLocations: any[] = [];
        const coverageAreas: any[] = [];
        
        locations?.forEach((loc: any) => {
          if (loc.location_type === 'site') {
            specificLocations.push({
              id: loc.id,
              name: loc.location_name,
              type: loc.site_type || 'project_site',
              latitude: loc.latitude ? parseFloat(loc.latitude) : null,
              longitude: loc.longitude ? parseFloat(loc.longitude) : null,
              address: loc.address,
              notes: loc.description,
              // Include administrative data
              stateRegionCode: loc.state_region_code,
              stateRegionName: loc.state_region_name,
              townshipCode: loc.township_code,
              townshipName: loc.township_name
            });
          } else if (loc.location_type === 'coverage') {
            const coverageArea: any = {
              id: loc.id,
              scope: loc.coverage_scope || 'subnational',
              description: loc.description || loc.location_name
            };
            
            // Add regions data if available
            if (loc.state_region_name) {
              coverageArea.regions = [{
                id: loc.state_region_code || loc.id,
                name: loc.state_region_name,
                code: loc.state_region_code || '',
                townships: loc.township_name ? [{
                  id: loc.township_code || loc.id,
                  name: loc.township_name,
                  code: loc.township_code || ''
                }] : []
              }];
            }
            
            coverageAreas.push(coverageArea);
          }
        });
        
        const result = {
          specificLocations,
          coverageAreas
        };
        console.log('[AIMS API] Transformed locations result:', result);
        return result;
      })()
    };
    
    console.log('[AIMS API] Activity found:', transformedActivity.title);
    console.log('[AIMS API] Activity ID (UUID):', transformedActivity.id);
    console.log('[AIMS API] Transformed sectors being sent to frontend:', JSON.stringify(transformedActivity.sectors, null, 2));
    console.log('[AIMS API] Policy markers being sent to frontend:', JSON.stringify(transformedActivity.policyMarkers, null, 2));
    
    return NextResponse.json(transformedActivity);
  } catch (error) {
    console.error('[AIMS API] Error fetching activity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
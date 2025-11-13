import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { extractIatiMeta, IatiParseError } from '@/lib/iati/parseMeta';
import { XMLParser } from 'fast-xml-parser';
import { iatiAnalytics } from '@/lib/analytics';
import { USER_ROLES } from '@/types/user';
import { getOrCreateOrganization } from '@/lib/organization-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { xmlContent, userId, userRole, replaceActivityIds, fields, iati_data } = await request.json();

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

    const supabase = getSupabaseAdmin();

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

        // Extract activity dates
        const activityDates = ensureArray(xmlActivity['activity-date'] || []);
        const plannedStartDate = activityDates.find((d: any) => d['@_type'] === '1')?.['@_iso-date'];
        const plannedEndDate = activityDates.find((d: any) => d['@_type'] === '3')?.['@_iso-date'];

        // Extract default currency
        const defaultCurrency = xmlActivity['default-currency']?.['@_code'] || 'USD';

        activities.push({
          iatiIdentifier,
          activityData: {
            iatiIdentifier,
            title: extractNarrative(xmlActivity.title) || `Imported Activity: ${iatiIdentifier}`,
            description: extractNarrative(xmlActivity.description),
            activityStatus: xmlActivity['activity-status']?.['@_code'] || 'implementation',
            plannedStartDate,
            plannedEndDate,
            defaultCurrency
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
    const reportingOrgName = meta.reportingOrgName || reportingOrgRef;

    console.log(`[Import as Reporting Org] Checking for reporting organization: ${reportingOrgName} (${reportingOrgRef})`);

    // Try to find the org by IATI org ID, name, or alias
    const { data: existingOrgs } = await supabase
      .from('organizations')
      .select('id, name, iati_org_id, alias_refs, acronym')
      .or(`iati_org_id.eq.${reportingOrgRef},name.ilike.${reportingOrgName},alias_refs.cs.{${reportingOrgRef}}`);

    // Check if any of the found orgs match
    const matchingOrg = existingOrgs?.find(org =>
      org.iati_org_id === reportingOrgRef ||
      org.name?.toLowerCase() === reportingOrgName?.toLowerCase() ||
      org.alias_refs?.includes(reportingOrgRef)
    );

    if (matchingOrg) {
      reportingOrgId = matchingOrg.id;
      reportingOrgAcronym = matchingOrg.acronym;
      console.log(`[Import as Reporting Org] Found existing organization: ${matchingOrg.name} (ID: ${reportingOrgId}, Acronym: ${reportingOrgAcronym})`);
    } else {
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
        console.log(`[Import as Reporting Org] Created new organization: ${newOrg.name} (ID: ${reportingOrgId})`);
      }
    }

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
        const { data: existingCheck } = await supabase
          .from('activities')
          .select('id, iati_identifier')
          .eq('iati_identifier', iatiIdentifier)
          .single();

        // Build activity insert object
        // If fields and iati_data are provided, use them; otherwise use basic activityData
        let activityInsert: any = {
          iati_identifier: iatiIdentifier,
          reporting_org_ref: reportingOrgRef,
          reporting_org_name: meta.reportingOrgName || null,
          created_by_org_name: meta.reportingOrgName || null, // Set for "Reported by" display
          created_by_org_acronym: reportingOrgAcronym || null, // Extract acronym if available
          reporting_org_id: reportingOrgId, // Set reporting_org_id for consistency
          source_type: 'external',
          import_mode: 'reporting_org',
          created_by: userId,
          last_edited_by: userId,
          publication_status: 'draft',
          submission_status: 'not_submitted'
        };

        console.log(`[Import as Reporting Org] 🔍 Activity insert object:`, {
          iatiIdentifier,
          reportingOrgId,
          reportingOrgName: meta.reportingOrgName,
          reportingOrgAcronym,
          reporting_org_id: activityInsert.reporting_org_id,
          created_by_org_name: activityInsert.created_by_org_name,
          created_by_org_acronym: activityInsert.created_by_org_acronym
        });

        // If fields and iati_data are provided, use field selection
        if (fields && iati_data && typeof fields === 'object') {
          // Map IATI field paths to database fields
          const fieldMappings: Record<string, string> = {
            'iati-activity/title/narrative': 'title_narrative',
            'iati-activity/description[@type="1"]/narrative': 'description_narrative',
            'iati-activity/activity-status': 'activity_status',
            'iati-activity/activity-date[@type="1"]': 'planned_start_date',
            'iati-activity/activity-date[@type="2"]': 'actual_start_date',
            'iati-activity/activity-date[@type="3"]': 'planned_end_date',
            'iati-activity/activity-date[@type="4"]': 'actual_end_date',
            'iati-activity/default-currency': 'default_currency',
            'iati-activity/collaboration-type': 'collaboration_type',
            'iati-activity/activity-scope': 'activity_scope',
            'iati-activity[@xml:lang]': 'language',
            'iati-activity/default-aid-type': 'default_aid_type',
            'iati-activity/default-flow-type': 'default_flow_type',
            'iati-activity/default-finance-type': 'default_finance_type',
            'iati-activity/default-tied-status': 'default_tied_status',
            'iati-activity/capital-spend-percentage': 'capital_spend_percentage',
            'iati-activity[@humanitarian]': 'humanitarian'
          };

          // Apply selected fields
          Object.entries(fieldMappings).forEach(([iatiPath, dbField]) => {
            if (fields[iatiPath] && iati_data[iatiPath] !== undefined) {
              activityInsert[dbField] = iati_data[iatiPath];
            }
          });

          // Handle parsed activity data for complex fields
          const parsedActivity = iati_data._parsedActivity;
          if (parsedActivity) {
            // Use parsed activity data to fill in any missing basic fields
            if (!activityInsert.title_narrative && parsedActivity.title) {
              activityInsert.title_narrative = parsedActivity.title;
            }
            if (!activityInsert.description_narrative && parsedActivity.description) {
              activityInsert.description_narrative = parsedActivity.description;
            }
            if (!activityInsert.activity_status && parsedActivity.activityStatus) {
              activityInsert.activity_status = parsedActivity.activityStatus;
            }
            if (!activityInsert.planned_start_date && parsedActivity.plannedStartDate) {
              activityInsert.planned_start_date = parsedActivity.plannedStartDate;
            }
            if (!activityInsert.planned_end_date && parsedActivity.plannedEndDate) {
              activityInsert.planned_end_date = parsedActivity.plannedEndDate;
            }
            if (!activityInsert.actual_start_date && parsedActivity.actualStartDate) {
              activityInsert.actual_start_date = parsedActivity.actualStartDate;
            }
            if (!activityInsert.actual_end_date && parsedActivity.actualEndDate) {
              activityInsert.actual_end_date = parsedActivity.actualEndDate;
            }
            if (!activityInsert.default_currency && parsedActivity.defaultCurrency) {
              activityInsert.default_currency = parsedActivity.defaultCurrency;
            }
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
          // Use basic activityData (backward compatibility)
          activityInsert = {
            ...activityInsert,
            title_narrative: activityData.title || `Imported Activity: ${iatiIdentifier}`,
            description_narrative: activityData.description || null,
            activity_status: activityData.activityStatus || 'implementation',
            planned_start_date: activityData.plannedStartDate || null,
            planned_end_date: activityData.plannedEndDate || null,
            default_currency: activityData.defaultCurrency || 'USD'
          };
        }

        console.log(`[Import as Reporting Org] Activity ${iatiIdentifier} exists check:`, existingCheck ? `Found (ID: ${existingCheck.id})` : 'Not found');

        // Declare variables outside the if/else blocks
        let finalActivityId: string | null = null;
        let activityResult: any = null;

        // If activity exists, update it; otherwise insert
        if (existingCheck) {
          console.log(`[Import as Reporting Org] Activity exists, updating instead of inserting: ${iatiIdentifier}`);
          const { data: updated, error: updateError } = await supabase
            .from('activities')
            .update(activityInsert)
            .eq('iati_identifier', iatiIdentifier)
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
              const { data: updated, error: updateError } = await supabase
                .from('activities')
                .update(activityInsert)
                .eq('iati_identifier', iatiIdentifier)
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
          const { data: verifyActivity } = await supabase
            .from('activities')
            .select('id, iati_identifier, created_by_org, reporting_org_id, created_by_org_name, created_by_org_acronym')
            .eq('id', finalActivityId)
            .single();

          console.log(`[Import as Reporting Org] ✅ Verified saved activity data:`, verifyActivity);
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
                  budget_type: budget.type || '1',
                  budget_status: budget.status || '1',
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
            
            // Filter out duplicates and prepare transactions
            const validTransactions = parsedActivity.transactions
              .filter((t: any) => {
                if (!t || t.value === undefined) return false;
                const signature = `${t.type}-${t.date}-${t.value}-${t.currency || 'USD'}`;
                return !existingSignatures.has(signature);
              })
              .map((t: any) => ({
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
                aid_type: t.aidType || null,
                finance_type: t.financeType || null,
                tied_status: t.tiedStatus || null,
                flow_type: t.flowType || null,
                disbursement_channel: t.disbursementChannel || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }));
            
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


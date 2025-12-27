import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface MergeRequest {
  sourceOrgId: string;  // The duplicate to remove
  targetOrgId: string;  // The org to keep
  mergeNameAliases?: boolean;  // Whether to also merge name_aliases
}

interface MergeResult {
  success: boolean;
  summary: {
    activitiesUpdated: number;
    activityContributorsUpdated: number;
    participatingOrgsUpdated: number;
    transactionsProviderUpdated: number;
    transactionsReceiverUpdated: number;
    plannedDisbursementsProviderUpdated: number;
    plannedDisbursementsReceiverUpdated: number;
    usersUpdated: number;
    userOrganizationsUpdated: number;
    customGroupOrganizationsUpdated: number;
    organizationNamesUpdated: number;
    organizationBudgetsUpdated: number;
    organizationExpendituresUpdated: number;
    organizationDocumentLinksUpdated: number;
    developmentStrategiesUpdated: number;
    aliasAdded: string | null;
    nameAliasesMerged: string[];
    sourceOrgDeleted: boolean;
  };
  sourceOrg: {
    id: string;
    name: string;
    iati_org_id: string | null;
  };
  targetOrg: {
    id: string;
    name: string;
  };
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function POST(request: NextRequest) {
  console.log('[AIMS] POST /api/organizations/merge - Starting merge operation');
  
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      console.error('[AIMS] Supabase admin client not initialized');
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }
    
    const body: MergeRequest = await request.json();
    const { sourceOrgId, targetOrgId, mergeNameAliases = true } = body;
    
    // Validate request
    if (!sourceOrgId || !targetOrgId) {
      return NextResponse.json(
        { error: 'Both sourceOrgId and targetOrgId are required' },
        { status: 400 }
      );
    }
    
    if (sourceOrgId === targetOrgId) {
      return NextResponse.json(
        { error: 'Source and target organizations must be different' },
        { status: 400 }
      );
    }
    
    // Fetch both organizations to validate they exist
    const { data: sourceOrg, error: sourceError } = await supabase
      .from('organizations')
      .select('id, name, iati_org_id, alias_refs, name_aliases')
      .eq('id', sourceOrgId)
      .single();
    
    if (sourceError || !sourceOrg) {
      console.error('[AIMS] Source organization not found:', sourceOrgId);
      return NextResponse.json(
        { error: 'Source organization not found' },
        { status: 404 }
      );
    }
    
    const { data: targetOrg, error: targetError } = await supabase
      .from('organizations')
      .select('id, name, iati_org_id, alias_refs, name_aliases')
      .eq('id', targetOrgId)
      .single();
    
    if (targetError || !targetOrg) {
      console.error('[AIMS] Target organization not found:', targetOrgId);
      return NextResponse.json(
        { error: 'Target organization not found' },
        { status: 404 }
      );
    }
    
    console.log(`[AIMS] Merging "${sourceOrg.name}" (${sourceOrgId}) into "${targetOrg.name}" (${targetOrgId})`);
    
    // Initialize summary
    const summary: MergeResult['summary'] = {
      activitiesUpdated: 0,
      activityContributorsUpdated: 0,
      participatingOrgsUpdated: 0,
      transactionsProviderUpdated: 0,
      transactionsReceiverUpdated: 0,
      plannedDisbursementsProviderUpdated: 0,
      plannedDisbursementsReceiverUpdated: 0,
      usersUpdated: 0,
      userOrganizationsUpdated: 0,
      customGroupOrganizationsUpdated: 0,
      organizationNamesUpdated: 0,
      organizationBudgetsUpdated: 0,
      organizationExpendituresUpdated: 0,
      organizationDocumentLinksUpdated: 0,
      developmentStrategiesUpdated: 0,
      aliasAdded: null,
      nameAliasesMerged: [],
      sourceOrgDeleted: false,
    };
    
    // 1. Update activities.reporting_org_id
    const { data: activitiesData, error: activitiesError } = await supabase
      .from('activities')
      .update({ reporting_org_id: targetOrgId })
      .eq('reporting_org_id', sourceOrgId)
      .select('id');
    
    if (activitiesError) {
      console.error('[AIMS] Error updating activities:', activitiesError);
    } else {
      summary.activitiesUpdated = activitiesData?.length || 0;
      console.log(`[AIMS] Updated ${summary.activitiesUpdated} activities`);
    }
    
    // 2. Update activity_contributors.organization_id
    const { data: contributorsData, error: contributorsError } = await supabase
      .from('activity_contributors')
      .update({ organization_id: targetOrgId })
      .eq('organization_id', sourceOrgId)
      .select('id');
    
    if (contributorsError) {
      console.error('[AIMS] Error updating activity_contributors:', contributorsError);
    } else {
      summary.activityContributorsUpdated = contributorsData?.length || 0;
      console.log(`[AIMS] Updated ${summary.activityContributorsUpdated} activity_contributors`);
    }
    
    // 3. Update activity_participating_organizations.organization_id
    const { data: participatingData, error: participatingError } = await supabase
      .from('activity_participating_organizations')
      .update({ organization_id: targetOrgId })
      .eq('organization_id', sourceOrgId)
      .select('id');
    
    if (participatingError) {
      console.error('[AIMS] Error updating activity_participating_organizations:', participatingError);
    } else {
      summary.participatingOrgsUpdated = participatingData?.length || 0;
      console.log(`[AIMS] Updated ${summary.participatingOrgsUpdated} activity_participating_organizations`);
    }
    
    // 4. Update transactions.provider_org_id
    const { data: txProviderData, error: txProviderError } = await supabase
      .from('transactions')
      .update({ provider_org_id: targetOrgId })
      .eq('provider_org_id', sourceOrgId)
      .select('id');
    
    if (txProviderError) {
      console.error('[AIMS] Error updating transactions provider:', txProviderError);
    } else {
      summary.transactionsProviderUpdated = txProviderData?.length || 0;
      console.log(`[AIMS] Updated ${summary.transactionsProviderUpdated} transactions (provider)`);
    }
    
    // 5. Update transactions.receiver_org_id
    const { data: txReceiverData, error: txReceiverError } = await supabase
      .from('transactions')
      .update({ receiver_org_id: targetOrgId })
      .eq('receiver_org_id', sourceOrgId)
      .select('id');
    
    if (txReceiverError) {
      console.error('[AIMS] Error updating transactions receiver:', txReceiverError);
    } else {
      summary.transactionsReceiverUpdated = txReceiverData?.length || 0;
      console.log(`[AIMS] Updated ${summary.transactionsReceiverUpdated} transactions (receiver)`);
    }
    
    // 6. Update planned_disbursements.provider_org_id
    const { data: pdProviderData, error: pdProviderError } = await supabase
      .from('planned_disbursements')
      .update({ provider_org_id: targetOrgId })
      .eq('provider_org_id', sourceOrgId)
      .select('id');
    
    if (pdProviderError) {
      console.error('[AIMS] Error updating planned_disbursements provider:', pdProviderError);
    } else {
      summary.plannedDisbursementsProviderUpdated = pdProviderData?.length || 0;
      console.log(`[AIMS] Updated ${summary.plannedDisbursementsProviderUpdated} planned_disbursements (provider)`);
    }
    
    // 7. Update planned_disbursements.receiver_org_id
    const { data: pdReceiverData, error: pdReceiverError } = await supabase
      .from('planned_disbursements')
      .update({ receiver_org_id: targetOrgId })
      .eq('receiver_org_id', sourceOrgId)
      .select('id');
    
    if (pdReceiverError) {
      console.error('[AIMS] Error updating planned_disbursements receiver:', pdReceiverError);
    } else {
      summary.plannedDisbursementsReceiverUpdated = pdReceiverData?.length || 0;
      console.log(`[AIMS] Updated ${summary.plannedDisbursementsReceiverUpdated} planned_disbursements (receiver)`);
    }
    
    // 8. Update users.organization_id
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .update({ organization_id: targetOrgId })
      .eq('organization_id', sourceOrgId)
      .select('id');
    
    if (usersError) {
      console.error('[AIMS] Error updating users:', usersError);
    } else {
      summary.usersUpdated = usersData?.length || 0;
      console.log(`[AIMS] Updated ${summary.usersUpdated} users`);
    }
    
    // 9. Update user_organizations.organization_id
    const { data: userOrgsData, error: userOrgsError } = await supabase
      .from('user_organizations')
      .update({ organization_id: targetOrgId })
      .eq('organization_id', sourceOrgId)
      .select('id');
    
    if (userOrgsError) {
      console.error('[AIMS] Error updating user_organizations:', userOrgsError);
    } else {
      summary.userOrganizationsUpdated = userOrgsData?.length || 0;
      console.log(`[AIMS] Updated ${summary.userOrganizationsUpdated} user_organizations`);
    }
    
    // 10. Update custom_group_organizations.organization_id
    const { data: customGroupData, error: customGroupError } = await supabase
      .from('custom_group_organizations')
      .update({ organization_id: targetOrgId })
      .eq('organization_id', sourceOrgId)
      .select('id');
    
    if (customGroupError) {
      console.error('[AIMS] Error updating custom_group_organizations:', customGroupError);
    } else {
      summary.customGroupOrganizationsUpdated = customGroupData?.length || 0;
      console.log(`[AIMS] Updated ${summary.customGroupOrganizationsUpdated} custom_group_organizations`);
    }
    
    // 11. Update organization_names.organization_id
    const { data: orgNamesData, error: orgNamesError } = await supabase
      .from('organization_names')
      .update({ organization_id: targetOrgId })
      .eq('organization_id', sourceOrgId)
      .select('id');
    
    if (orgNamesError) {
      console.error('[AIMS] Error updating organization_names:', orgNamesError);
    } else {
      summary.organizationNamesUpdated = orgNamesData?.length || 0;
      console.log(`[AIMS] Updated ${summary.organizationNamesUpdated} organization_names`);
    }
    
    // 12. Update organization_budgets.organization_id
    const { data: budgetsData, error: budgetsError } = await supabase
      .from('organization_budgets')
      .update({ organization_id: targetOrgId })
      .eq('organization_id', sourceOrgId)
      .select('id');
    
    if (budgetsError) {
      console.error('[AIMS] Error updating organization_budgets:', budgetsError);
    } else {
      summary.organizationBudgetsUpdated = budgetsData?.length || 0;
      console.log(`[AIMS] Updated ${summary.organizationBudgetsUpdated} organization_budgets`);
    }
    
    // 13. Update organization_expenditures.organization_id
    const { data: expendituresData, error: expendituresError } = await supabase
      .from('organization_expenditures')
      .update({ organization_id: targetOrgId })
      .eq('organization_id', sourceOrgId)
      .select('id');
    
    if (expendituresError) {
      console.error('[AIMS] Error updating organization_expenditures:', expendituresError);
    } else {
      summary.organizationExpendituresUpdated = expendituresData?.length || 0;
      console.log(`[AIMS] Updated ${summary.organizationExpendituresUpdated} organization_expenditures`);
    }
    
    // 14. Update organization_document_links.organization_id
    const { data: docLinksData, error: docLinksError } = await supabase
      .from('organization_document_links')
      .update({ organization_id: targetOrgId })
      .eq('organization_id', sourceOrgId)
      .select('id');
    
    if (docLinksError) {
      console.error('[AIMS] Error updating organization_document_links:', docLinksError);
    } else {
      summary.organizationDocumentLinksUpdated = docLinksData?.length || 0;
      console.log(`[AIMS] Updated ${summary.organizationDocumentLinksUpdated} organization_document_links`);
    }
    
    // 15. Update development_strategies.organization_id
    const { data: strategiesData, error: strategiesError } = await supabase
      .from('development_strategies')
      .update({ organization_id: targetOrgId })
      .eq('organization_id', sourceOrgId)
      .select('id');
    
    if (strategiesError) {
      console.error('[AIMS] Error updating development_strategies:', strategiesError);
    } else {
      summary.developmentStrategiesUpdated = strategiesData?.length || 0;
      console.log(`[AIMS] Updated ${summary.developmentStrategiesUpdated} development_strategies`);
    }
    
    // 16. Add source org's IATI ID to target's alias_refs
    const targetAliasRefs = targetOrg.alias_refs || [];
    const targetNameAliases = targetOrg.name_aliases || [];
    const newAliasRefs = [...targetAliasRefs];
    const newNameAliases = [...targetNameAliases];
    
    // Add source IATI ID as alias if it exists and isn't already present
    if (sourceOrg.iati_org_id && !newAliasRefs.includes(sourceOrg.iati_org_id)) {
      newAliasRefs.push(sourceOrg.iati_org_id);
      summary.aliasAdded = sourceOrg.iati_org_id;
      console.log(`[AIMS] Adding ${sourceOrg.iati_org_id} as alias on target org`);
    }
    
    // Also add source's existing alias_refs to target
    if (sourceOrg.alias_refs && Array.isArray(sourceOrg.alias_refs)) {
      for (const alias of sourceOrg.alias_refs) {
        if (alias && !newAliasRefs.includes(alias)) {
          newAliasRefs.push(alias);
        }
      }
    }
    
    // Optionally merge name_aliases
    if (mergeNameAliases && sourceOrg.name_aliases && Array.isArray(sourceOrg.name_aliases)) {
      for (const nameAlias of sourceOrg.name_aliases) {
        if (nameAlias && !newNameAliases.includes(nameAlias)) {
          newNameAliases.push(nameAlias);
          summary.nameAliasesMerged.push(nameAlias);
        }
      }
      // Also add source org's name as a name alias if not already present
      if (sourceOrg.name && !newNameAliases.includes(sourceOrg.name) && sourceOrg.name !== targetOrg.name) {
        newNameAliases.push(sourceOrg.name);
        summary.nameAliasesMerged.push(sourceOrg.name);
      }
    }
    
    // Update target org with merged aliases
    const { error: updateAliasError } = await supabase
      .from('organizations')
      .update({
        alias_refs: newAliasRefs,
        name_aliases: newNameAliases,
      })
      .eq('id', targetOrgId);
    
    if (updateAliasError) {
      console.error('[AIMS] Error updating target org aliases:', updateAliasError);
    } else {
      console.log(`[AIMS] Updated target org aliases`);
    }
    
    // 17. Delete source organization
    const { error: deleteError } = await supabase
      .from('organizations')
      .delete()
      .eq('id', sourceOrgId);
    
    if (deleteError) {
      console.error('[AIMS] Error deleting source organization:', deleteError);
      return NextResponse.json(
        { 
          error: 'Failed to delete source organization after merge. Some references may have been updated.',
          details: deleteError.message,
          summary 
        },
        { status: 500 }
      );
    }
    
    summary.sourceOrgDeleted = true;
    console.log(`[AIMS] Deleted source organization ${sourceOrgId}`);
    
    const result: MergeResult = {
      success: true,
      summary,
      sourceOrg: {
        id: sourceOrg.id,
        name: sourceOrg.name,
        iati_org_id: sourceOrg.iati_org_id,
      },
      targetOrg: {
        id: targetOrg.id,
        name: targetOrg.name,
      },
    };
    
    console.log('[AIMS] Merge completed successfully:', JSON.stringify(summary));
    
    const response = NextResponse.json(result);
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
    
  } catch (error) {
    console.error('[AIMS] Unexpected error during merge:', error);
    return NextResponse.json(
      { error: 'Internal server error during merge operation' },
      { status: 500 }
    );
  }
}







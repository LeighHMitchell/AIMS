import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface MergePreview {
  sourceOrg: {
    id: string;
    name: string;
    acronym: string | null;
    iati_org_id: string | null;
    type: string | null;
    country: string | null;
  };
  counts: {
    activities: number;
    activityContributors: number;
    participatingOrgs: number;
    transactionsProvider: number;
    transactionsReceiver: number;
    plannedDisbursementsProvider: number;
    plannedDisbursementsReceiver: number;
    users: number;
    userOrganizations: number;
    customGroupOrganizations: number;
    organizationNames: number;
    organizationBudgets: number;
    organizationExpenditures: number;
    organizationDocumentLinks: number;
    developmentStrategies: number;
  };
  totals: {
    activities: number;
    transactions: number;
    plannedDisbursements: number;
    users: number;
    otherReferences: number;
  };
  willAddAlias: string | null;
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sourceOrgId = searchParams.get('sourceOrgId');
  const targetOrgId = searchParams.get('targetOrgId');
  
  console.log('[AIMS] GET /api/organizations/merge/preview - Fetching preview for merge');
  
  const { supabase, response: authResponse } = await requireAuth();
  
  if (authResponse) return authResponse;

  
  try {

    
    
    
    // Validate request
    if (!sourceOrgId) {
      return NextResponse.json(
        { error: 'sourceOrgId is required' },
        { status: 400 }
      );
    }
    
    if (sourceOrgId === targetOrgId) {
      return NextResponse.json(
        { error: 'Source and target organizations must be different' },
        { status: 400 }
      );
    }
    
    // Fetch source organization
    const { data: sourceOrg, error: sourceError } = await supabase
      .from('organizations')
      .select('id, name, acronym, iati_org_id, type, country, Organisation_Type_Code')
      .eq('id', sourceOrgId)
      .single();
    
    if (sourceError || !sourceOrg) {
      console.error('[AIMS] Source organization not found:', sourceOrgId);
      return NextResponse.json(
        { error: 'Source organization not found' },
        { status: 404 }
      );
    }
    
    // If targetOrgId is provided, validate it exists
    if (targetOrgId) {
      const { data: targetOrg, error: targetError } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', targetOrgId)
        .single();
      
      if (targetError || !targetOrg) {
        return NextResponse.json(
          { error: 'Target organization not found' },
          { status: 404 }
        );
      }
    }
    
    // Count all references
    const counts = {
      activities: 0,
      activityContributors: 0,
      participatingOrgs: 0,
      transactionsProvider: 0,
      transactionsReceiver: 0,
      plannedDisbursementsProvider: 0,
      plannedDisbursementsReceiver: 0,
      users: 0,
      userOrganizations: 0,
      customGroupOrganizations: 0,
      organizationNames: 0,
      organizationBudgets: 0,
      organizationExpenditures: 0,
      organizationDocumentLinks: 0,
      developmentStrategies: 0,
    };
    
    // Count activities
    const { count: activitiesCount } = await supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('reporting_org_id', sourceOrgId);
    counts.activities = activitiesCount || 0;
    
    // Count activity_contributors
    const { count: contributorsCount } = await supabase
      .from('activity_contributors')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', sourceOrgId);
    counts.activityContributors = contributorsCount || 0;
    
    // Count activity_participating_organizations
    const { count: participatingCount } = await supabase
      .from('activity_participating_organizations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', sourceOrgId);
    counts.participatingOrgs = participatingCount || 0;
    
    // Count transactions (provider)
    const { count: txProviderCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('provider_org_id', sourceOrgId);
    counts.transactionsProvider = txProviderCount || 0;
    
    // Count transactions (receiver)
    const { count: txReceiverCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_org_id', sourceOrgId);
    counts.transactionsReceiver = txReceiverCount || 0;
    
    // Count planned_disbursements (provider)
    const { count: pdProviderCount } = await supabase
      .from('planned_disbursements')
      .select('id', { count: 'exact', head: true })
      .eq('provider_org_id', sourceOrgId);
    counts.plannedDisbursementsProvider = pdProviderCount || 0;
    
    // Count planned_disbursements (receiver)
    const { count: pdReceiverCount } = await supabase
      .from('planned_disbursements')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_org_id', sourceOrgId);
    counts.plannedDisbursementsReceiver = pdReceiverCount || 0;
    
    // Count users
    const { count: usersCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', sourceOrgId);
    counts.users = usersCount || 0;
    
    // Count user_organizations
    const { count: userOrgsCount } = await supabase
      .from('user_organizations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', sourceOrgId);
    counts.userOrganizations = userOrgsCount || 0;
    
    // Count custom_group_organizations
    const { count: customGroupCount } = await supabase
      .from('custom_group_organizations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', sourceOrgId);
    counts.customGroupOrganizations = customGroupCount || 0;
    
    // Count organization_names
    const { count: orgNamesCount } = await supabase
      .from('organization_names')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', sourceOrgId);
    counts.organizationNames = orgNamesCount || 0;
    
    // Count organization_budgets
    const { count: budgetsCount } = await supabase
      .from('organization_budgets')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', sourceOrgId);
    counts.organizationBudgets = budgetsCount || 0;
    
    // Count organization_expenditures
    const { count: expendituresCount } = await supabase
      .from('organization_expenditures')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', sourceOrgId);
    counts.organizationExpenditures = expendituresCount || 0;
    
    // Count organization_document_links
    const { count: docLinksCount } = await supabase
      .from('organization_document_links')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', sourceOrgId);
    counts.organizationDocumentLinks = docLinksCount || 0;
    
    // Count development_strategies
    const { count: strategiesCount } = await supabase
      .from('development_strategies')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', sourceOrgId);
    counts.developmentStrategies = strategiesCount || 0;
    
    // Calculate totals for simpler display
    const totals = {
      activities: counts.activities + counts.activityContributors + counts.participatingOrgs,
      transactions: counts.transactionsProvider + counts.transactionsReceiver,
      plannedDisbursements: counts.plannedDisbursementsProvider + counts.plannedDisbursementsReceiver,
      users: counts.users + counts.userOrganizations,
      otherReferences: counts.customGroupOrganizations + counts.organizationNames + 
        counts.organizationBudgets + counts.organizationExpenditures + 
        counts.organizationDocumentLinks + counts.developmentStrategies,
    };
    
    const preview: MergePreview = {
      sourceOrg: {
        id: sourceOrg.id,
        name: sourceOrg.name,
        acronym: sourceOrg.acronym,
        iati_org_id: sourceOrg.iati_org_id,
        type: sourceOrg.Organisation_Type_Code || sourceOrg.type,
        country: sourceOrg.country,
      },
      counts,
      totals,
      willAddAlias: sourceOrg.iati_org_id,
    };
    
    console.log('[AIMS] Preview generated:', JSON.stringify(totals));
    
    const response = NextResponse.json(preview);
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
    
  } catch (error) {
    console.error('[AIMS] Unexpected error fetching preview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}








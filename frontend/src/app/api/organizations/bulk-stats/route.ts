import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { unstable_cache } from 'next/cache';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Cache the expensive database operations for 60 seconds
// Note: This uses the admin client for caching at module level
// The handler still requires authentication before returning data
const getCachedOrganizationStats = unstable_cache(
  async (limit: number, offset: number) => {
    console.log('[AIMS] Cache MISS - Fetching fresh organization stats from database');
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new Error('Database not available');
    }

    // Fetch organizations with pagination and all related data in parallel for maximum efficiency
    const [orgsResult, activitiesResult, contributorsResult, transactionsResult, plannedDisbursementsResult, budgetsResult, countResult] = await Promise.all([
      // Get organizations with pagination
      supabase
        .from('organizations')
        .select('id, name, acronym, type, Organisation_Type_Code, Organisation_Type_Name, country, logo, banner, description, website, email, phone, address, country_represented, cooperation_modality, iati_org_id, alias_refs, name_aliases, created_at, updated_at')
        .order('name')
        .range(offset, offset + limit - 1),

      // Get all activities with reporting org info (no pagination needed for counting)
      supabase
        .from('activities')
        .select('id, reporting_org_id, activity_status')
        .not('reporting_org_id', 'is', null),

      // Get all activity contributors to count participating organizations
      supabase
        .from('activity_contributors')
        .select('organization_id, activity_id, contribution_type')
        .in('contribution_type', ['funder', 'implementer', 'funding', 'implementing']),

      // Get all transactions for financial calculations and activity associations
      supabase
        .from('transactions')
        .select('activity_id, provider_org_id, receiver_org_id, transaction_type, value, currency'),

      // Get all planned disbursements for activity associations
      supabase
        .from('planned_disbursements')
        .select('activity_id, provider_org_id, receiver_org_id'),

      // Get all activity budgets for total budgeted calculations
      supabase
        .from('activity_budgets')
        .select('activity_id, usd_value, value, currency'),

      // Get total count for pagination metadata
      supabase
        .from('organizations')
        .select('id', { count: 'exact', head: true })
    ]);

    return {
      orgsResult,
      activitiesResult,
      contributorsResult,
      transactionsResult,
      plannedDisbursementsResult,
      budgetsResult,
      countResult
    };
  },
  ['organization-bulk-stats'],
  {
    revalidate: 60, // Cache for 60 seconds
    tags: ['organizations']
  }
);

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// Helper function to derive organization category
function deriveCategory(organisationType: string, countryRepresented: string): string {
  const type = organisationType?.toLowerCase() || '';
  const country = countryRepresented?.toLowerCase() || '';
  
  // Check for global/regional organizations first
  if (country.includes('global') || country.includes('regional')) {
    if (type.includes('multilateral') || type.includes('international')) {
      return 'Multilateral';
    }
    return 'International NGO';
  }
  
  // Map organization types to categories
  switch (type) {
    case 'government':
    case 'gov':
      return 'Government';
    case 'multilateral':
    case 'international':
      return 'Multilateral';
    case 'bilateral':
      return 'Bilateral';
    case 'ngo':
    case 'civil society':
    case 'civil_society':
      return 'Civil Society';
    case 'private':
    case 'private_sector':
      return 'Private Sector';
    case 'academic':
    case 'research':
      return 'Academic/Research';
    case 'foundation':
      return 'Foundation';
    default:
      return 'Other';
  }
}

export async function GET(request: NextRequest) {
  console.log('[AIMS] GET /api/organizations/bulk-stats - Starting bulk statistics request');
  
  // Require authentication
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  
  try {
    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '5000', 10), 10000); // Increased default to 5000 to ensure all orgs are loaded, cap at 10000
    const offset = (page - 1) * limit;
    
    // Add caching headers to reduce repeated requests
    const headers = {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120', // 1 minute cache (reduced from 5 min)
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Check if cache should be bypassed (cache busting via timestamp)
    const bustCache = searchParams.has('_');

    // Use cached data unless explicitly busting cache
    let orgsResult, activitiesResult, contributorsResult, transactionsResult, plannedDisbursementsResult, budgetsResult, countResult;

    if (bustCache && supabase) {
      console.log('[AIMS] Cache BUST - Fetching fresh data');
      // Fetch directly without cache when busting
      [orgsResult, activitiesResult, contributorsResult, transactionsResult, plannedDisbursementsResult, budgetsResult, countResult] = await Promise.all([
        supabase
          .from('organizations')
          .select('id, name, acronym, type, Organisation_Type_Code, Organisation_Type_Name, country, logo, banner, description, website, email, phone, address, country_represented, cooperation_modality, iati_org_id, alias_refs, name_aliases, created_at, updated_at')
          .order('name')
          .range(offset, offset + limit - 1),
        supabase
          .from('activities')
          .select('id, reporting_org_id, activity_status')
          .not('reporting_org_id', 'is', null),
        supabase
          .from('activity_contributors')
          .select('organization_id, activity_id, contribution_type')
          .in('contribution_type', ['funder', 'implementer', 'funding', 'implementing']),
        supabase
          .from('transactions')
          .select('activity_id, provider_org_id, receiver_org_id, transaction_type, value, currency'),
        supabase
          .from('planned_disbursements')
          .select('activity_id, provider_org_id, receiver_org_id'),
        supabase
          .from('activity_budgets')
          .select('activity_id, usd_value, value, currency'),
        supabase
          .from('organizations')
          .select('id', { count: 'exact', head: true })
      ]);
    } else {
      // Use server-side cache for normal requests
      const cachedResults = await getCachedOrganizationStats(limit, offset);
      orgsResult = cachedResults.orgsResult;
      activitiesResult = cachedResults.activitiesResult;
      contributorsResult = cachedResults.contributorsResult;
      transactionsResult = cachedResults.transactionsResult;
      plannedDisbursementsResult = cachedResults.plannedDisbursementsResult;
      budgetsResult = cachedResults.budgetsResult;
      countResult = cachedResults.countResult;
    }

    const { data: organizations, error: orgsError } = orgsResult;
    const { data: activities, error: activitiesError } = activitiesResult;
    const { data: contributors, error: contributorsError } = contributorsResult;
    const { data: transactions, error: transactionsError } = transactionsResult;
    const { data: plannedDisbursements, error: plannedDisbursementsError } = plannedDisbursementsResult;
    const { data: budgets, error: budgetsError } = budgetsResult;
    const { count: totalCount, error: countError } = countResult;
    
    if (orgsError) {
      console.error('[AIMS] Error fetching organizations:', orgsError);
      return NextResponse.json(
        { error: orgsError.message },
        { status: 500, headers }
      );
    }

    if (!organizations || organizations.length === 0) {
      console.log('[AIMS] No organizations found');
      return NextResponse.json({
        data: [],
        pagination: {
          page,
          limit,
          totalCount: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit),
          hasMore: false
        }
      }, { headers });
    }

    console.log(`[AIMS] Processing ${organizations.length} organizations with bulk statistics`);

    // Create maps for efficient lookups
    const reportingOrgActivityCount = new Map<string, number>();
    const contributingOrgActivityCount = new Map<string, number>();
    const associatedOrgActivities = new Map<string, Set<string>>(); // org_id -> Set of activity_ids
    const providerTransactionCount = new Map<string, number>(); // org_id -> count of transactions as provider
    const receiverTransactionCount = new Map<string, number>(); // org_id -> count of transactions as receiver
    const orgTotalBudgeted = new Map<string, number>();
    const orgTotalDisbursed = new Map<string, number>();

    // Build a map of activity_id -> reporting_org_id for budget lookups
    const activityToOrgMap = new Map<string, string>();

    // Count activities where organization is the reporting organization
    if (activities && !activitiesError) {
      activities.forEach((activity: any) => {
        const orgId = activity.reporting_org_id;
        if (orgId) {
          reportingOrgActivityCount.set(orgId, (reportingOrgActivityCount.get(orgId) || 0) + 1);
          activityToOrgMap.set(activity.id, orgId);
        }
      });
    }

    // Calculate total budgeted per organization from activity_budgets
    if (budgets && !budgetsError) {
      budgets.forEach((budget: any) => {
        const activityId = budget.activity_id;
        const orgId = activityToOrgMap.get(activityId);
        if (orgId) {
          // Use usd_value, fallback to value if currency is USD
          const amount = budget.usd_value || (budget.currency === 'USD' ? budget.value : 0) || 0;
          const currentBudgeted = orgTotalBudgeted.get(orgId) || 0;
          orgTotalBudgeted.set(orgId, currentBudgeted + amount);
        }
      });
    }

    // Count activities where organization is a contributor
    if (contributors && !contributorsError) {
      // Group contributors by activity to avoid double counting
      const activityContributors = new Map<string, Set<string>>();
      contributors.forEach((contributor: any) => {
        const activityId = contributor.activity_id;
        const orgId = contributor.organization_id;
        if (activityId && orgId) {
          if (!activityContributors.has(activityId)) {
            activityContributors.set(activityId, new Set());
          }
          activityContributors.get(activityId)!.add(orgId);
        }
      });

      // Count unique activities per organization
      activityContributors.forEach((orgIds, activityId) => {
        orgIds.forEach(orgId => {
          contributingOrgActivityCount.set(orgId, (contributingOrgActivityCount.get(orgId) || 0) + 1);
        });
      });
    }

    // Count activities associated via transactions (provider or receiver org)
    // Also count individual transactions as provider or receiver for each org
    if (transactions && !transactionsError) {
      transactions.forEach((transaction: any) => {
        const activityId = transaction.activity_id;
        if (activityId) {
          // Add activity for provider org and count transaction
          if (transaction.provider_org_id) {
            if (!associatedOrgActivities.has(transaction.provider_org_id)) {
              associatedOrgActivities.set(transaction.provider_org_id, new Set());
            }
            associatedOrgActivities.get(transaction.provider_org_id)!.add(activityId);
            // Count this transaction as provider
            providerTransactionCount.set(
              transaction.provider_org_id,
              (providerTransactionCount.get(transaction.provider_org_id) || 0) + 1
            );
          }
          // Add activity for receiver org and count transaction
          if (transaction.receiver_org_id) {
            if (!associatedOrgActivities.has(transaction.receiver_org_id)) {
              associatedOrgActivities.set(transaction.receiver_org_id, new Set());
            }
            associatedOrgActivities.get(transaction.receiver_org_id)!.add(activityId);
            // Count this transaction as receiver
            receiverTransactionCount.set(
              transaction.receiver_org_id,
              (receiverTransactionCount.get(transaction.receiver_org_id) || 0) + 1
            );
          }
        }
      });
    }

    // Count activities associated via planned disbursements (provider or receiver org)
    // Also count planned disbursements as provider or receiver for each org
    if (plannedDisbursements && !plannedDisbursementsError) {
      plannedDisbursements.forEach((pd: any) => {
        const activityId = pd.activity_id;
        if (activityId) {
          // Add activity for provider org and count planned disbursement
          if (pd.provider_org_id) {
            if (!associatedOrgActivities.has(pd.provider_org_id)) {
              associatedOrgActivities.set(pd.provider_org_id, new Set());
            }
            associatedOrgActivities.get(pd.provider_org_id)!.add(activityId);
            // Count this planned disbursement as provider
            providerTransactionCount.set(
              pd.provider_org_id,
              (providerTransactionCount.get(pd.provider_org_id) || 0) + 1
            );
          }
          // Add activity for receiver org and count planned disbursement
          if (pd.receiver_org_id) {
            if (!associatedOrgActivities.has(pd.receiver_org_id)) {
              associatedOrgActivities.set(pd.receiver_org_id, new Set());
            }
            associatedOrgActivities.get(pd.receiver_org_id)!.add(activityId);
            // Count this planned disbursement as receiver
            receiverTransactionCount.set(
              pd.receiver_org_id,
              (receiverTransactionCount.get(pd.receiver_org_id) || 0) + 1
            );
          }
        }
      });
    }

    // Calculate disbursement totals per organization (budgeted is calculated from activity_budgets above)
    if (transactions && !transactionsError) {
      transactions.forEach((transaction: any) => {
        const value = parseFloat(transaction.value) || 0;
        
        // For disbursed funds: sum disbursements (type '3') where org is provider
        if (transaction.transaction_type === '3' && transaction.provider_org_id) {
          const currentDisbursed = orgTotalDisbursed.get(transaction.provider_org_id) || 0;
          orgTotalDisbursed.set(transaction.provider_org_id, currentDisbursed + value);
        }
      });
    }

    // Process all organizations with calculated statistics
    const enhancedOrganizations = organizations.map((org: any) => {
      const reportingCount = reportingOrgActivityCount.get(org.id) || 0;
      const contributingCount = contributingOrgActivityCount.get(org.id) || 0;
      const associatedActivitiesSet = associatedOrgActivities.get(org.id);
      const associatedCount = associatedActivitiesSet ? associatedActivitiesSet.size : 0;
      
      // Get provider and receiver transaction counts
      const providerCount = providerTransactionCount.get(org.id) || 0;
      const receiverCount = receiverTransactionCount.get(org.id) || 0;
      const totalTransactionCount = providerCount + receiverCount;

      // Total active projects (avoid double counting if org is both reporting and contributing to same activity)
      const totalActiveProjects = Math.max(reportingCount, contributingCount);

      // Get financial totals for this organization
      const totalBudgeted = orgTotalBudgeted.get(org.id) || 0;
      const totalDisbursed = orgTotalDisbursed.get(org.id) || 0;

      return {
        ...org,
        // Ensure we use the correct Organisation_Type_Code field
        Organisation_Type_Code: org.Organisation_Type_Code || org.type,
        activeProjects: totalActiveProjects,
        reportedActivities: reportingCount, // Activities where org is the reporting org
        associatedActivities: associatedCount, // Activities associated via transactions/planned disbursements
        providerTransactionCount: providerCount, // Number of transactions/planned disbursements as provider
        receiverTransactionCount: receiverCount, // Number of transactions/planned disbursements as receiver
        totalTransactionCount: totalTransactionCount, // Total transactions (provider + receiver)
        totalBudgeted: totalBudgeted, // Total budgeted from activity_budgets (sum of usd_value for org's reported activities)
        totalDisbursed: totalDisbursed, // Total disbursed funds
        displayName: org.name && org.acronym ? `${org.name} (${org.acronym})` : org.name,
        derived_category: deriveCategory(org.Organisation_Type_Code || org.type, org.country_represented || org.country || ''),
        // Initialize project status breakdown with active count
        projectsByStatus: {
          active: totalActiveProjects,
          pipeline: 0,
          completed: 0,
          cancelled: 0
        },
        lastProjectActivity: org.updated_at,
        totalDisbursement: totalDisbursed
      };
    });

    console.log(`[AIMS] Successfully processed ${enhancedOrganizations.length} organizations with bulk statistics`);
    
    // Return paginated response with metadata
    const totalPages = Math.ceil((totalCount || 0) / limit);
    const hasMore = page < totalPages;
    
    return NextResponse.json({
      data: enhancedOrganizations,
      pagination: {
        page,
        limit,
        totalCount: totalCount || 0,
        totalPages,
        hasMore
      }
    }, { headers });
    
  } catch (error) {
    console.error('[AIMS] Error in bulk statistics endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization statistics' },
      { status: 500 }
    );
  }
}

import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { fetchSystemTotals, SystemTotals } from '@/lib/system-totals';
import { calculateModality } from '@/utils/modality-calculation';

/**
 * Optimized Activities API
 * 
 * Performance improvements:
 * 1. Uses materialized view for transaction summaries
 * 2. Implements server-side pagination
 * 3. Reduces payload size by only sending necessary fields
 * 4. Uses proper indexes for filtering and sorting
 * 
 * Backward compatible with existing UI
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  const { supabase, response: authResponse } = await requireAuth();
  
  if (authResponse) return authResponse;

  
  try {

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100); // Cap at 100
    const search = searchParams.get('search') || '';

    // Support both single values and comma-separated arrays for backward compatibility
    const activityStatus = searchParams.get('activityStatus'); // Legacy single value
    const activityStatuses = searchParams.get('activityStatuses')?.split(',').filter(Boolean) || [];
    const publicationStatus = searchParams.get('publicationStatus');
    const submissionStatus = searchParams.get('submissionStatus'); // Legacy single value
    const submissionStatuses = searchParams.get('submissionStatuses')?.split(',').filter(Boolean) || [];
    const reportedByOrgs = searchParams.get('reportedByOrgs')?.split(',').filter(Boolean) || [];
    const aidTypes = searchParams.get('aidTypes')?.split(',').filter(Boolean) || [];
    const flowTypes = searchParams.get('flowTypes')?.split(',').filter(Boolean) || [];
    const tiedStatuses = searchParams.get('tiedStatuses')?.split(',').filter(Boolean) || [];
    const sortField = searchParams.get('sortField') || 'updated_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build optimized query
    // Always get count for proper pagination
    let countQuery = supabase.from('activities').select('*', { count: 'exact', head: true });

    let dataQuery = supabase
      .from('activities')
      .select(`
        id,
        other_identifier,
        iati_identifier,
        title_narrative,
        description_narrative,
        description_objectives,
        description_target_groups,
        description_other,
        acronym,
        created_by_org_name,
        created_by_org_acronym,
        activity_status,
        publication_status,
        submission_status,
        reporting_org_id,
        reporting_org_ref,
        reporting_org_name,
        created_by,
        created_at,
        updated_at,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        actual_end_date,
        default_aid_type,
        default_finance_type,
        default_flow_type,
        default_tied_status,
        default_modality,
        default_modality_override,
        budget_status,
        on_budget_percentage,
        capital_spend_percentage,
        likes_count,
        vote_score,
        upvote_count,
        downvote_count,
        humanitarian,
        banner,
        icon,
        activity_sdg_mappings (
          id,
          sdg_goal,
          sdg_target,
          contribution_percent,
          notes
        ),
        activity_sectors (
          id,
          sector_code,
          sector_name,
          percentage,
          category_code,
          category_name,
          level
        )
      `)
      .range(offset, offset + limit - 1);

    // Apply filters
    if (search) {
      const searchConditions = [];
      
      if (isValidUUID(search)) {
        searchConditions.push(`id.eq.${search}`);
      }
      
      searchConditions.push(`iati_identifier.ilike.%${search}%`);
      searchConditions.push(`title_narrative.ilike.%${search}%`);
      searchConditions.push(`acronym.ilike.%${search}%`);
      
      const orCondition = searchConditions.join(',');
      countQuery = countQuery.or(orCondition);
      dataQuery = dataQuery.or(orCondition);
    }

    // Activity status - support both array and single value
    if (activityStatuses.length > 0) {
      countQuery = countQuery.in('activity_status', activityStatuses);
      dataQuery = dataQuery.in('activity_status', activityStatuses);
    } else if (activityStatus && activityStatus !== 'all') {
      countQuery = countQuery.eq('activity_status', activityStatus);
      dataQuery = dataQuery.eq('activity_status', activityStatus);
    }

    if (publicationStatus && publicationStatus !== 'all') {
      countQuery = countQuery.eq('publication_status', publicationStatus);
      dataQuery = dataQuery.eq('publication_status', publicationStatus);
    }

    // Submission status - support both array and single value
    if (submissionStatuses.length > 0) {
      countQuery = countQuery.in('submission_status', submissionStatuses);
      dataQuery = dataQuery.in('submission_status', submissionStatuses);
    } else if (submissionStatus && submissionStatus !== 'all') {
      countQuery = countQuery.eq('submission_status', submissionStatus);
      dataQuery = dataQuery.eq('submission_status', submissionStatus);
    }

    // Reported by organization filter
    if (reportedByOrgs.length > 0) {
      countQuery = countQuery.in('reporting_org_id', reportedByOrgs);
      dataQuery = dataQuery.in('reporting_org_id', reportedByOrgs);
    }

    // Aid type filter
    if (aidTypes.length > 0) {
      countQuery = countQuery.in('default_aid_type', aidTypes);
      dataQuery = dataQuery.in('default_aid_type', aidTypes);
    }

    // Flow type filter
    if (flowTypes.length > 0) {
      countQuery = countQuery.in('default_flow_type', flowTypes);
      dataQuery = dataQuery.in('default_flow_type', flowTypes);
    }

    // Tied status filter
    if (tiedStatuses.length > 0) {
      countQuery = countQuery.in('default_tied_status', tiedStatuses);
      dataQuery = dataQuery.in('default_tied_status', tiedStatuses);
    }

    // Apply sorting with field mapping
    const sortFieldMap: Record<string, string> = {
      'title': 'title_narrative',
      'title_narrative': 'title_narrative',
      'created_at': 'created_at',
      'updated_at': 'updated_at',
      'updatedAt': 'updated_at',
      'createdAt': 'created_at',
      'partnerId': 'other_identifier',
      'other_identifier': 'other_identifier',
      'activityStatus': 'activity_status',
      'activity_status': 'activity_status',
      'createdBy': 'created_by_org_acronym'
    };
    
    const mappedSortField = sortFieldMap[sortField] || 'updated_at';
    console.log(`[AIMS Optimized] Sorting by ${sortField} -> ${mappedSortField}, order: ${sortOrder}`);
    dataQuery = dataQuery.order(mappedSortField, { ascending: sortOrder === 'asc' });
    
    // Note: Budget and disbursement sorting will be handled client-side after data aggregation
    // since these are calculated fields from multiple tables

    // Execute queries in parallel, including system-wide totals for percentage calculations
    const [countResult, dataResult, systemTotals] = await Promise.all([
      countQuery,
      dataQuery,
      fetchSystemTotals()
    ]);

    // Check for HTML error responses (Supabase 520 errors)
    const isHTMLError = (error: any) => {
      return error && error.message && typeof error.message === 'string' && 
             error.message.includes('<!DOCTYPE html>');
    };

    if (countResult.error) {
      console.error('[AIMS] Count query error:', countResult.error);
      if (isHTMLError(countResult.error)) {
        console.error('[AIMS] Detected Supabase connectivity issue (HTML error response)');
        return NextResponse.json(
          { 
            error: 'Database connectivity issue detected',
            details: 'Supabase is experiencing connection problems. Please try again later.',
            code: 'DATABASE_CONNECTION_ERROR'
          },
          { status: 503 }
        );
      }
      throw countResult.error;
    }

    if (dataResult.error) {
      console.error('[AIMS] Data query error:', dataResult.error);
      if (isHTMLError(dataResult.error)) {
        console.error('[AIMS] Detected Supabase connectivity issue (HTML error response)');
        return NextResponse.json(
          { 
            error: 'Database connectivity issue detected',
            details: 'Supabase is experiencing connection problems. Please try again later.',
            code: 'DATABASE_CONNECTION_ERROR'
          },
          { status: 503 }
        );
      }
      throw dataResult.error;
    }

    const totalCount = countResult.count ?? null;
    const activities = dataResult.data || [];

    // Fetch transaction summaries and budget data
    const activityIds = activities.map((a: any) => a.id);
    
    let summariesMap = new Map();
    let budgetMap = new Map();
    const budgetOriginalMap = new Map<string, number>();
    const plannedDisbursementMap = new Map<string, number>();
    const plannedDisbursementOriginalMap = new Map<string, number>();
    
    // Organization entry type with logo support
    type OrgEntry = {
      name: string;
      acronym: string | null;
      logo: string | null;
    };
    
    // Declare participatingOrgsMap outside the if block so it's accessible when transforming activities
    const participatingOrgsMap = new Map<string, {
      funding: OrgEntry[];
      extending: OrgEntry[];
      implementing: OrgEntry[];
      accountable: OrgEntry[];
    }>();
    
    // Fetch subnational breakdowns map (declared here for use later)
    let subnationalBreakdownsMap = new Map<string, any[]>();

    // Policy markers map (declared here for use later)
    const policyMarkersMap = new Map<string, any[]>();

    // Creator profiles map (for metadata columns)
    const creatorProfilesMap = new Map<string, { name: string; department: string | null }>();

    if (activityIds.length > 0) {
      // PERFORMANCE OPTIMIZATION: Run all independent queries in parallel
      console.log('[AIMS Optimized] Starting parallel data fetch for', activityIds.length, 'activities');
      const parallelStartTime = Date.now();

      // Execute all independent queries in parallel
      const [
        budgetsResult,
        plannedDisbursementsResult,
        participatingOrgsResult,
        transactionsResult,
        breakdownsResult,
        policyMarkersResult
      ] = await Promise.all([
        // 1. Budgets
        supabase
          .from('activity_budgets')
          .select('activity_id, value, currency, usd_value')
          .in('activity_id', activityIds),

        // 2. Planned disbursements
        supabase
          .from('planned_disbursements')
          .select('activity_id, amount, currency, usd_amount')
          .in('activity_id', activityIds),

        // 3. Participating organizations (initial fetch)
        supabase
          .from('activity_participating_organizations')
          .select('activity_id, iati_role_code, role_type, narrative, organization_id')
          .in('activity_id', activityIds),

        // 4. Transactions
        supabase
          .from('transactions')
          .select('activity_id, transaction_type, status, value, value_usd')
          .in('activity_id', activityIds),

        // 5. Subnational breakdowns
        supabase
          .from('subnational_breakdowns')
          .select('id, activity_id, region_name, percentage, is_nationwide')
          .in('activity_id', activityIds),

        // 6. Policy markers (with marker details)
        supabase
          .from('activity_policy_markers')
          .select('activity_id, policy_marker_id, significance')
          .in('activity_id', activityIds)
      ]);

      console.log('[AIMS Optimized] Parallel fetch completed in', Date.now() - parallelStartTime, 'ms');

      // Process budgets
      const { data: budgets, error: budgetError } = budgetsResult;
      if (budgetError) {
        console.error('[AIMS Optimized] Budget fetch error:', budgetError);
      } else if (budgets) {
        budgets.forEach((b: any) => {
          const current = budgetMap.get(b.activity_id) || 0;
          const currentOriginal = budgetOriginalMap.get(b.activity_id) || 0;
          budgetMap.set(b.activity_id, current + (b.usd_value || 0));
          budgetOriginalMap.set(b.activity_id, currentOriginal + (b.value || 0));
        });
      }

      // Process planned disbursements
      const { data: plannedDisbursements, error: plannedDisbursementError } = plannedDisbursementsResult;
      if (plannedDisbursementError) {
        console.error('[AIMS Optimized] Planned disbursement fetch error:', plannedDisbursementError);
      } else if (plannedDisbursements) {
        plannedDisbursements.forEach((pd: any) => {
          const current = plannedDisbursementMap.get(pd.activity_id) || 0;
          const currentOriginal = plannedDisbursementOriginalMap.get(pd.activity_id) || 0;
          plannedDisbursementMap.set(pd.activity_id, current + (pd.usd_amount || 0));
          plannedDisbursementOriginalMap.set(pd.activity_id, currentOriginal + (pd.amount || 0));
        });
      }

      // Process participating organizations
      let participatingOrgs = participatingOrgsResult.data || [];
      const participatingOrgsError = participatingOrgsResult.error;

      if (participatingOrgsError) {
        console.error('[AIMS Optimized] Participating orgs fetch error:', participatingOrgsError);
      }

      // Fetch organization names in a follow-up query (depends on participatingOrgs)
      if (participatingOrgs.length > 0) {
        const orgIds = [...new Set(participatingOrgs.map((o: any) => o.organization_id).filter(Boolean))];
        if (orgIds.length > 0) {
          const { data: orgsData } = await supabase
            .from('organizations')
            .select('id, name, acronym, logo')
            .in('id', orgIds);

          if (orgsData) {
            const orgsLookup = new Map(orgsData.map((o: any) => [o.id, o]));
            participatingOrgs = participatingOrgs.map((po: any) => ({
              ...po,
              organizations: orgsLookup.get(po.organization_id) || null
            }));
          }
        }

        // Process participating orgs into the map
        participatingOrgs.forEach((org: any) => {
          const activityId = org.activity_id;
          if (!participatingOrgsMap.has(activityId)) {
            participatingOrgsMap.set(activityId, {
              funding: [],
              extending: [],
              implementing: [],
              accountable: []
            });
          }

          const orgData = participatingOrgsMap.get(activityId)!;
          const orgName = org.narrative ||
            (org.organizations?.acronym
              ? `${org.organizations.name} (${org.organizations.acronym})`
              : org.organizations?.name) ||
            (org.organization_id ? `Org ID: ${org.organization_id.substring(0, 8)}...` : null) ||
            'No name available';

          const orgEntry: OrgEntry = {
            name: orgName,
            acronym: org.organizations?.acronym || null,
            logo: org.organizations?.logo || null
          };

          const orgExists = (arr: OrgEntry[], name: string) => arr.some(o => o.name === name);

          let roleCode = org.iati_role_code;
          if (!roleCode && org.role_type) {
            const roleTypeMap: Record<string, number> = {
              'funding': 1, 'government': 2, 'extending': 3, 'implementing': 4
            };
            roleCode = roleTypeMap[org.role_type] || 4;
          }

          if (!roleCode || roleCode < 1 || roleCode > 4) {
            if (!orgExists(orgData.implementing, orgName)) {
              orgData.implementing.push(orgEntry);
            }
            return;
          }

          switch (roleCode) {
            case 1: if (!orgExists(orgData.funding, orgName)) orgData.funding.push(orgEntry); break;
            case 2: if (!orgExists(orgData.accountable, orgName)) orgData.accountable.push(orgEntry); break;
            case 3: if (!orgExists(orgData.extending, orgName)) orgData.extending.push(orgEntry); break;
            case 4: if (!orgExists(orgData.implementing, orgName)) orgData.implementing.push(orgEntry); break;
          }
        });
      }

      // Process transactions
      const { data: transactions, error: txError } = transactionsResult;
      if (!txError && transactions) {
        transactions.forEach((t: any) => {
          const current = summariesMap.get(t.activity_id) || {
            commitments: 0, disbursements: 0, expenditures: 0, inflows: 0,
            totalTransactions: 0, totalBudget: 0, totalBudgetOriginal: 0,
            totalDisbursed: 0, totalPlannedDisbursementsUSD: 0, totalPlannedDisbursementsOriginal: 0
          };

          current.totalTransactions++;
          const transactionValue = t.value_usd || 0;

          switch(t.transaction_type) {
            case '2': current.commitments += transactionValue; break;
            case '3': current.disbursements += transactionValue; current.totalDisbursed += transactionValue; break;
            case '4': current.expenditures += transactionValue; current.totalDisbursed += transactionValue; break;
            case '1': case '11': current.inflows += transactionValue; break;
          }

          summariesMap.set(t.activity_id, current);
        });
      }

      // Ensure all activities have budget data
      activityIds.forEach((activityId: string) => {
        if (!summariesMap.has(activityId)) {
          summariesMap.set(activityId, {
            commitments: 0, disbursements: 0, expenditures: 0, inflows: 0,
            totalTransactions: 0,
            totalBudget: budgetMap.get(activityId) || 0,
            totalBudgetOriginal: budgetOriginalMap.get(activityId) || 0,
            totalDisbursed: 0,
            totalPlannedDisbursementsUSD: plannedDisbursementMap.get(activityId) || 0,
            totalPlannedDisbursementsOriginal: plannedDisbursementOriginalMap.get(activityId) || 0
          });
        } else {
          const summary = summariesMap.get(activityId)!;
          summary.totalBudget = budgetMap.get(activityId) || 0;
          summary.totalBudgetOriginal = budgetOriginalMap.get(activityId) || 0;
          summary.totalPlannedDisbursementsUSD = plannedDisbursementMap.get(activityId) || 0;
          summary.totalPlannedDisbursementsOriginal = plannedDisbursementOriginalMap.get(activityId) || 0;
        }
      });

      // Process subnational breakdowns
      const { data: breakdowns, error: breakdownsError } = breakdownsResult;
      if (breakdownsError) {
        console.error('[AIMS Optimized] Subnational breakdowns fetch error:', breakdownsError);
      } else if (breakdowns) {
        breakdowns.forEach((b: any) => {
          if (!subnationalBreakdownsMap.has(b.activity_id)) {
            subnationalBreakdownsMap.set(b.activity_id, []);
          }
          subnationalBreakdownsMap.get(b.activity_id)!.push(b);
        });
      }

      // Process policy markers
      const { data: activityPolicyMarkers, error: policyMarkersError } = policyMarkersResult;
      if (policyMarkersError) {
        console.error('[AIMS Optimized] Policy markers fetch error:', policyMarkersError);
      } else if (activityPolicyMarkers && activityPolicyMarkers.length > 0) {
        // Fetch policy marker details for all markers
        const markerIds = [...new Set(activityPolicyMarkers.map((m: any) => m.policy_marker_id).filter(Boolean))];
        if (markerIds.length > 0) {
          const { data: markerDetails } = await supabase
            .from('policy_markers')
            .select('uuid, code, name, iati_code, is_iati_standard')
            .in('uuid', markerIds);

          if (markerDetails) {
            const markerDetailsMap = new Map(markerDetails.map((m: any) => [m.uuid, m]));
            activityPolicyMarkers.forEach((apm: any) => {
              if (!policyMarkersMap.has(apm.activity_id)) {
                policyMarkersMap.set(apm.activity_id, []);
              }
              const markerDetail = markerDetailsMap.get(apm.policy_marker_id);
              if (markerDetail) {
                policyMarkersMap.get(apm.activity_id)!.push({
                  ...apm,
                  code: markerDetail.code,
                  name: markerDetail.name,
                  iati_code: markerDetail.iati_code,
                  is_iati_standard: markerDetail.is_iati_standard
                });
              }
            });
          }
        }
      }

      // Fetch creator profiles for metadata columns (from users table)
      const creatorIds = [...new Set(activities.map((a: any) => a.created_by).filter(Boolean))];
      if (creatorIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name, department, job_title')
          .in('id', creatorIds);

        if (users) {
          users.forEach((user: any) => {
            const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unknown';
            creatorProfilesMap.set(user.id, {
              name: fullName,
              department: user.department || null,
              jobTitle: user.job_title || null
            });
          });
        }
      }
    }

    // Transform activities with summaries
    let transformedActivities = activities.map((activity: any) => {
      const summary = summariesMap.get(activity.id) || {
        commitments: 0,
        disbursements: 0,
        expenditures: 0,
        inflows: 0,
        totalTransactions: 0,
        totalBudget: budgetMap.get(activity.id) || 0,
        totalBudgetOriginal: budgetOriginalMap.get(activity.id) || 0,
        totalDisbursed: 0,
        totalPlannedDisbursementsUSD: plannedDisbursementMap.get(activity.id) || 0,
        totalPlannedDisbursementsOriginal: plannedDisbursementOriginalMap.get(activity.id) || 0
      };
      
      // Ensure planned disbursements are included even if summary exists
      if (!summary.totalPlannedDisbursementsUSD) {
        summary.totalPlannedDisbursementsUSD = plannedDisbursementMap.get(activity.id) || 0;
      }
      if (!summary.totalPlannedDisbursementsOriginal) {
        summary.totalPlannedDisbursementsOriginal = plannedDisbursementOriginalMap.get(activity.id) || 0;
      }
      // Ensure budget original is included
      if (!summary.totalBudgetOriginal) {
        summary.totalBudgetOriginal = budgetOriginalMap.get(activity.id) || 0;
      }

      return {
        ...activity,
        ...summary,
        // Map database fields to API fields for backward compatibility
        partnerId: activity.other_identifier,
        iatiId: activity.iati_identifier,
        iatiIdentifier: activity.iati_identifier,
        title: activity.title_narrative,
        description: activity.description_narrative,
        description_general: activity.description_narrative,
        description_objectives: activity.description_objectives,
        description_target_groups: activity.description_target_groups,
        description_other: activity.description_other,
        created_by_org_name: activity.created_by_org_name,
        created_by_org_acronym: activity.created_by_org_acronym,
        activityStatus: activity.activity_status,
        publicationStatus: activity.publication_status,
        submissionStatus: activity.submission_status,
        reportingOrgId: activity.reporting_org_id,
        reportingOrgRef: activity.reporting_org_ref,
        reportingOrgName: activity.reporting_org_name,
        createdBy: activity.created_by,
        plannedStartDate: activity.planned_start_date,
        plannedEndDate: activity.planned_end_date,
        actualStartDate: activity.actual_start_date,
        actualEndDate: activity.actual_end_date,
        default_aid_type: activity.default_aid_type,
        default_finance_type: activity.default_finance_type,
        default_flow_type: activity.default_flow_type,
        default_tied_status: activity.default_tied_status,
        tied_status: activity.default_tied_status, // Legacy compatibility
        // Calculate modality on-the-fly if not stored (for backwards compatibility with older activities)
        default_aid_modality: activity.default_modality || calculateModality(activity.default_aid_type || '', activity.default_finance_type || ''),
        default_aid_modality_override: activity.default_modality_override, // Map from correct DB column
        budgetStatus: activity.budget_status || 'unknown',
        onBudgetPercentage: activity.on_budget_percentage,
        capitalSpendPercentage: activity.capital_spend_percentage,
        humanitarian: activity.humanitarian,
        vote_score: activity.vote_score || 0,
        upvote_count: activity.upvote_count || 0,
        downvote_count: activity.downvote_count || 0,
        banner: activity.banner, // Include banner for card view
        icon: activity.icon, // Include icon for card view
        createdAt: activity.created_at,
        updatedAt: activity.updated_at,
        // Include SDG mappings for display with proper field mapping
        sdgMappings: (activity.activity_sdg_mappings || []).map((mapping: any) => ({
          id: mapping.id,
          sdgGoal: mapping.sdg_goal,
          sdgTarget: mapping.sdg_target,
          contributionPercent: mapping.contribution_percent,
          notes: mapping.notes
        })),
        // Include participating organisation arrays by role
        fundingOrgs: participatingOrgsMap.get(activity.id)?.funding || [],
        extendingOrgs: participatingOrgsMap.get(activity.id)?.extending || [],
        implementingOrgs: participatingOrgsMap.get(activity.id)?.implementing || [],
        accountableOrgs: participatingOrgsMap.get(activity.id)?.accountable || [],
        // Include sectors for display in activity list
        sectors: (activity.activity_sectors || []).map((sector: any) => ({
          code: sector.sector_code,
          name: sector.sector_name,
          percentage: sector.percentage || 0,
          categoryCode: sector.category_code,
          categoryName: sector.category_name,
          level: sector.level
        })),
        // Include locations for Locations % column (subnational breakdowns)
        locations: (() => {
          const subnationalBreakdowns = subnationalBreakdownsMap.get(activity.id) || [];

          // Use subnational breakdowns for the bar chart (includes Nationwide as full-width bar)
          const broadCoverageLocations = subnationalBreakdowns.map((b: any) => ({
            id: b.id,
            admin_unit: b.is_nationwide ? 'Nationwide' : b.region_name,
            description: null,
            percentage: b.percentage ?? null,
            state_region_name: b.is_nationwide ? 'Nationwide' : b.region_name,
            state_region_code: null
          }));

          return {
            site_locations: [],
            broad_coverage_locations: broadCoverageLocations
          };
        })(),
        // Include policy markers for Policy Markers column
        policyMarkers: policyMarkersMap.get(activity.id) || [],
        // Include creator profile for Metadata columns
        creatorProfile: creatorProfilesMap.get(activity.created_by) || null
      };
    });

    // Apply client-side sorting for calculated fields (budget, disbursement, and planned disbursements)
    if (sortField === 'commitments' || sortField === 'disbursements' || sortField === 'plannedDisbursements') {
      transformedActivities.sort((a: any, b: any) => {
        let aValue, bValue;
        if (sortField === 'commitments') {
          aValue = a.totalBudget || 0;
          bValue = b.totalBudget || 0;
        } else if (sortField === 'disbursements') {
          aValue = a.totalDisbursed || 0;
          bValue = b.totalDisbursed || 0;
        } else if (sortField === 'plannedDisbursements') {
          aValue = a.totalPlannedDisbursementsUSD || 0;
          bValue = b.totalPlannedDisbursementsUSD || 0;
        }
        
        if (sortOrder === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });
    }

    // Log performance metrics
    const executionTime = Date.now() - startTime;
    
    // Log to performance table if it exists
    try {
      await supabase
        .from('query_performance_log')
        .insert({
          query_type: 'activities_list_optimized',
          execution_time_ms: executionTime,
          result_count: activities.length,
          filters: {
            page,
            limit,
            search,
            activityStatus,
            publicationStatus,
            submissionStatus,
            sortField,
            sortOrder
          }
        });
    } catch (logError) {
      // Ignore logging errors
    }

    console.log(`[AIMS Optimized] Fetched ${activities.length} activities in ${executionTime}ms`);

    // Return paginated response with system-wide totals for percentage calculations
    const response = {
      activities: transformedActivities,
      data: transformedActivities,
      totalCount: totalCount ?? 0,
      pagination: {
        page,
        limit,
        total: totalCount ?? 0,
        totalCount: totalCount ?? 0,
        totalPages: totalCount ? Math.ceil(totalCount / limit) : 1
      },
      systemTotals,
      performance: {
        executionTimeMs: executionTime
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    console.error('[AIMS Optimized] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch activities',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
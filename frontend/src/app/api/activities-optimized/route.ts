import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { fetchSystemTotals, SystemTotals } from '@/lib/system-totals';

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
  
  try {
    const supabase = getSupabaseAdmin();
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
    const activityStatus = searchParams.get('activityStatus');
    const publicationStatus = searchParams.get('publicationStatus');
    const submissionStatus = searchParams.get('submissionStatus');
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
        default_aid_modality,
        default_aid_modality_override,
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

    if (activityStatus && activityStatus !== 'all') {
      countQuery = countQuery.eq('activity_status', activityStatus);
      dataQuery = dataQuery.eq('activity_status', activityStatus);
    }

    if (publicationStatus && publicationStatus !== 'all') {
      countQuery = countQuery.eq('publication_status', publicationStatus);
      dataQuery = dataQuery.eq('publication_status', publicationStatus);
    }

    if (submissionStatus && submissionStatus !== 'all') {
      countQuery = countQuery.eq('submission_status', submissionStatus);
      dataQuery = dataQuery.eq('submission_status', submissionStatus);
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
    const plannedDisbursementMap = new Map<string, number>();
    
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
    
    if (activityIds.length > 0) {
      // Fetch budget totals
      const { data: budgets, error: budgetError } = await supabase
        .from('activity_budgets')
        .select('activity_id, value, currency, usd_value')
        .in('activity_id', activityIds);

      if (budgetError) {
        console.error('[AIMS Optimized] Budget fetch error:', budgetError);
      } else if (budgets) {
        console.log('[AIMS Optimized] Budget data fetched:', budgets.length, 'entries');
        budgets.forEach((b: any) => {
          const current = budgetMap.get(b.activity_id) || 0;
          // Use USD converted value for aggregation
          const budgetValue = b.usd_value || 0;
          budgetMap.set(b.activity_id, current + budgetValue);
        });
        console.log('[AIMS Optimized] Budget map:', Object.fromEntries(budgetMap));
      } else {
        console.log('[AIMS Optimized] No budget data found');
      }

      // Fetch planned disbursements totals
      const { data: plannedDisbursements, error: plannedDisbursementError } = await supabase
        .from('planned_disbursements')
        .select('activity_id, usd_amount')
        .in('activity_id', activityIds);

      if (plannedDisbursementError) {
        console.error('[AIMS Optimized] Planned disbursement fetch error:', plannedDisbursementError);
      } else if (plannedDisbursements) {
        console.log('[AIMS Optimized] Planned disbursement data fetched:', plannedDisbursements.length, 'entries');
        plannedDisbursements.forEach((pd: any) => {
          const current = plannedDisbursementMap.get(pd.activity_id) || 0;
          const pdValue = pd.usd_amount || 0;
          plannedDisbursementMap.set(pd.activity_id, current + pdValue);
        });
        console.log('[AIMS Optimized] Planned disbursement map:', Object.fromEntries(plannedDisbursementMap));
      } else {
        console.log('[AIMS Optimized] No planned disbursement data found');
      }

      // Fetch participating organisations for all activities
      console.log('[AIMS Optimized] Fetching participating orgs for', activityIds.length, 'activities');
      console.log('[AIMS Optimized] Sample activity IDs:', activityIds.slice(0, 5));

      // Only fetch participating orgs if we have activity IDs
      let participatingOrgs: any[] = [];
      let participatingOrgsError: any = null;
      
      if (activityIds.length > 0) {
        try {
          // Try with organization join first
          const result = await supabase
            .from('activity_participating_organizations')
            .select(`
              activity_id,
              iati_role_code,
              role_type,
              narrative,
              organization_id
            `)
            .in('activity_id', activityIds);
          
          participatingOrgs = result.data || [];
          participatingOrgsError = result.error;
          
          // If we got orgs, fetch organization names separately
          if (participatingOrgs.length > 0) {
            const orgIds = [...new Set(participatingOrgs.map(o => o.organization_id).filter(Boolean))];
            if (orgIds.length > 0) {
              const { data: orgsData } = await supabase
                .from('organizations')
                .select('id, name, acronym, logo')
                .in('id', orgIds);
              
              if (orgsData) {
                const orgsMap = new Map(orgsData.map(o => [o.id, o]));
                participatingOrgs = participatingOrgs.map(po => ({
                  ...po,
                  organizations: orgsMap.get(po.organization_id) || null
                }));
              }
            }
          }
        } catch (err) {
          console.error('[AIMS Optimized] Error fetching participating orgs:', err);
          participatingOrgsError = err;
        }
      }

      if (participatingOrgsError) {
        console.error('[AIMS Optimized] Participating orgs fetch error:', participatingOrgsError);
        console.error('[AIMS Optimized] Error details:', {
          message: participatingOrgsError.message,
          details: participatingOrgsError.details,
          hint: participatingOrgsError.hint,
          code: participatingOrgsError.code
        });
      }
      
      if (participatingOrgs.length > 0) {
        console.log('[AIMS Optimized] Participating orgs fetched:', participatingOrgs.length, 'entries');
        console.log('[AIMS Optimized] Raw participating orgs data sample:', participatingOrgs.slice(0, 3));
        console.log('[AIMS Optimized] First org structure:', participatingOrgs[0]);
        
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
          
          // Get organisation name with enhanced fallback logic
          // Priority: narrative > organization.name (with acronym) > organization_id > placeholder
          const orgName = org.narrative || 
            (org.organizations?.acronym 
              ? `${org.organizations.name} (${org.organizations.acronym})` 
              : org.organizations?.name) ||
            (org.organization_id ? `Org ID: ${org.organization_id.substring(0, 8)}...` : null) ||
            'No name available';
          
          // Create org entry object with name, acronym, and logo
          const orgEntry: OrgEntry = {
            name: orgName,
            acronym: org.organizations?.acronym || null,
            logo: org.organizations?.logo || null
          };
          
          // Helper to check if org already exists in array (by name)
          const orgExists = (arr: OrgEntry[], name: string) => arr.some(o => o.name === name);
          
          // Validate and handle IATI role codes with fallback to role_type
          let roleCode = org.iati_role_code;
          
          // Fallback: map role_type to role code if iati_role_code is missing
          if (!roleCode && org.role_type) {
            const roleTypeMap: Record<string, number> = {
              'funding': 1,
              'government': 2,
              'extending': 3,
              'implementing': 4
            };
            roleCode = roleTypeMap[org.role_type] || 4;
            console.log('[AIMS Optimized] Using role_type fallback:', org.role_type, '->', roleCode);
          }
          
          if (!roleCode || roleCode < 1 || roleCode > 4) {
            console.warn('[AIMS Optimized] Invalid role code for org:', { 
              activity_id: activityId, 
              org_name: orgName, 
              role_code: roleCode,
              role_type: org.role_type,
              org_id: org.organization_id 
            });
            // Default to implementing if role is invalid
            if (!orgExists(orgData.implementing, orgName)) {
              orgData.implementing.push(orgEntry);
            }
            return;
          }
          
          // Map IATI role codes: 1=Funding, 2=Accountable, 3=Extending, 4=Implementing
          switch (roleCode) {
            case 1:
              if (!orgExists(orgData.funding, orgName)) orgData.funding.push(orgEntry);
              break;
            case 2:
              if (!orgExists(orgData.accountable, orgName)) orgData.accountable.push(orgEntry);
              break;
            case 3:
              if (!orgExists(orgData.extending, orgName)) orgData.extending.push(orgEntry);
              break;
            case 4:
              if (!orgExists(orgData.implementing, orgName)) orgData.implementing.push(orgEntry);
              break;
          }
        });
        
        // Debug: Check if our test activity is in the results
        const testActivityId = activities.find(a => 
          a.iati_identifier === 'AA-AAA-123456789-ABC123'
        )?.id;
        
        if (testActivityId) {
          console.log('[AIMS Optimized] Test activity ID found:', testActivityId);
          if (participatingOrgsMap.has(testActivityId)) {
            console.log('[AIMS Optimized] Test activity orgs:', participatingOrgsMap.get(testActivityId));
          } else {
            console.warn('[AIMS Optimized] Test activity has no participating orgs in map');
          }
        } else {
          console.warn('[AIMS Optimized] Test activity AA-AAA-123456789-ABC123 not found in current page');
        }
      }

      // Temporarily disable materialized view to force USD calculation
      // Comment out the materialized view code since we're forcing fallback
      /*
      const { data: summaries, error: summariesError } = await supabase
        .from('activity_transaction_summaries')
        .select('*')
        .in('activity_id', activityIds);

      if (!summariesError && summaries) {
        console.log('[AIMS Optimized] Transaction summaries fetched:', summaries.length, 'entries');
        summaries.forEach((s: any) => {
          summariesMap.set(s.activity_id, {
            commitments: s.commitments || 0,
            disbursements: s.disbursements || 0,
            expenditures: s.expenditures || 0,
            inflows: s.inflows || 0,
            totalTransactions: s.total_transactions || 0,
            totalBudget: budgetMap.get(s.activity_id) || 0,
            totalDisbursed: (s.disbursements || 0) + (s.expenditures || 0)
          });
        });
        console.log('[AIMS Optimized] Summaries map:', Object.fromEntries(summariesMap));
      } else {
      */
      
      // Force fallback to USD calculation
      const summariesError = { message: 'Forcing fallback to USD calculation' };
      if (summariesError) {
        // Fallback: Calculate summaries directly if materialized view doesn't exist
        console.warn('[AIMS Optimized] Materialized view error:', summariesError);
        console.warn('[AIMS Optimized] Falling back to direct calculation');
        
        const { data: transactions, error: txError } = await supabase
          .from('transactions')
          .select('activity_id, transaction_type, status, value, value_usd')
          .in('activity_id', activityIds);
          // Remove status filter temporarily to see all transactions
        
        if (!txError && transactions) {
          console.log('[AIMS Optimized] Fallback: Found', transactions.length, 'transactions');
          // Group by activity_id and calculate summaries
          transactions.forEach((t: any) => {
            const current = summariesMap.get(t.activity_id) || {
              commitments: 0,
              disbursements: 0,
              expenditures: 0,
              inflows: 0,
              totalTransactions: 0,
              totalBudget: budgetMap.get(t.activity_id) || 0,
              totalDisbursed: 0,
              totalPlannedDisbursementsUSD: plannedDisbursementMap.get(t.activity_id) || 0
            };
            
            // Ensure planned disbursements are included
            if (!current.totalPlannedDisbursementsUSD) {
              current.totalPlannedDisbursementsUSD = plannedDisbursementMap.get(t.activity_id) || 0;
            }
            
            current.totalTransactions++;
            
            // Use USD converted value for aggregation
            const transactionValue = t.value_usd || 0;
            
            switch(t.transaction_type) {
              case '2':
                current.commitments += transactionValue;
                break;
              case '3':
                current.disbursements += transactionValue;
                current.totalDisbursed += transactionValue;
                break;
              case '4':
                current.expenditures += transactionValue;
                current.totalDisbursed += transactionValue;
                break;
              case '1':
              case '11':
                current.inflows += transactionValue;
                break;
            }
            
            summariesMap.set(t.activity_id, current);
          });
        }
        
        // Ensure all activities have budget data even if no transactions
        activityIds.forEach((activityId: string) => {
          if (!summariesMap.has(activityId)) {
            summariesMap.set(activityId, {
              commitments: 0,
              disbursements: 0,
              expenditures: 0,
              inflows: 0,
              totalTransactions: 0,
              totalBudget: budgetMap.get(activityId) || 0,
              totalDisbursed: 0,
              totalPlannedDisbursementsUSD: plannedDisbursementMap.get(activityId) || 0
            });
          } else {
            // Add planned disbursements to existing summary
            const summary = summariesMap.get(activityId)!;
            summary.totalPlannedDisbursementsUSD = plannedDisbursementMap.get(activityId) || 0;
          }
        });
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
        totalBudget: 0,
        totalDisbursed: 0,
        totalPlannedDisbursementsUSD: plannedDisbursementMap.get(activity.id) || 0
      };
      
      // Ensure planned disbursements are included even if summary exists
      if (!summary.totalPlannedDisbursementsUSD) {
        summary.totalPlannedDisbursementsUSD = plannedDisbursementMap.get(activity.id) || 0;
      }
      
      console.log(`[AIMS Optimized] Activity ${activity.id} summary:`, summary);

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
        }))
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
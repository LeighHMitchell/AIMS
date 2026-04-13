import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrVisitor } from '@/lib/auth';
import {
  NationalPlanRow,
  NationalPriorityRow,
  nationalPlanFromRow,
  nationalPriorityFromRow,
  AlignmentCoverageNode,
} from '@/types/national-priorities';

/**
 * GET /api/analytics/alignment-coverage?planId=X&donorId=Y&sectorCode=Z
 * Returns alignment coverage data for a specific plan with optional filters.
 * - The plan's priority tree with activity counts and funding at each node
 * - Summary stats for the plan
 * - Activity mappings for drill-down (which activities are aligned to which priority)
 * Public access (no auth required).
 */
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuthOrVisitor(request);
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not available' }, { status: 500 });
    }

    const planId = request.nextUrl.searchParams.get('planId');
    const donorId = request.nextUrl.searchParams.get('donorId');
    const sectorCode = request.nextUrl.searchParams.get('sectorCode');

    if (!planId) {
      return NextResponse.json(
        { success: false, error: 'planId is required' },
        { status: 400 }
      );
    }

    // Fetch the plan
    const { data: planRow, error: planError } = await supabase
      .from('national_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !planRow) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      );
    }

    const plan = nationalPlanFromRow(planRow as NationalPlanRow);

    // Fetch all active priorities for this plan
    const { data: priorityRows, error: priorityError } = await supabase
      .from('national_priorities')
      .select('*')
      .eq('plan_id', planId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('code', { ascending: true });

    if (priorityError) {
      return NextResponse.json(
        { success: false, error: priorityError.message },
        { status: 500 }
      );
    }

    const priorities = (priorityRows as NationalPriorityRow[]).map(nationalPriorityFromRow);
    const priorityIds = priorities.map(p => p.id);

    // Fetch activity allocations for these priorities (including significance)
    let allocationsData: { national_priority_id: string; activity_id: string; significance: string }[] = [];
    if (priorityIds.length > 0) {
      const { data: allocs } = await supabase
        .from('activity_national_priorities')
        .select('national_priority_id, activity_id, significance')
        .in('national_priority_id', priorityIds);
      allocationsData = (allocs || []).map((a: any) => ({
        national_priority_id: a.national_priority_id,
        activity_id: a.activity_id,
        significance: a.significance || 'significant',
      }));
    }

    // Get unique activity IDs across all priorities in this plan
    let alignedActivityIdsAll = Array.from(new Set(allocationsData.map(a => a.activity_id)));

    // === APPLY FILTERS to narrow which activities count ===

    // Filter by donor: keep only activities where this org is a participating org with role 'funding'
    if (donorId && alignedActivityIdsAll.length > 0) {
      const { data: orgLinks } = await supabase
        .from('activity_participating_organizations')
        .select('activity_id')
        .eq('organization_id', donorId)
        .in('activity_id', alignedActivityIdsAll);
      const allowedIds = new Set((orgLinks || []).map((o: any) => o.activity_id));
      alignedActivityIdsAll = alignedActivityIdsAll.filter(id => allowedIds.has(id));
    }

    // Filter by sector code (DAC sector)
    if (sectorCode && alignedActivityIdsAll.length > 0) {
      const { data: sectorLinks } = await supabase
        .from('activity_sectors')
        .select('activity_id')
        .eq('sector_code', sectorCode)
        .in('activity_id', alignedActivityIdsAll);
      const allowedIds = new Set((sectorLinks || []).map((s: any) => s.activity_id));
      alignedActivityIdsAll = alignedActivityIdsAll.filter(id => allowedIds.has(id));
    }

    const allAlignedActivityIds = new Set(alignedActivityIdsAll);
    // Re-filter the allocations data to only include those that match the filtered activities
    const filteredAllocations = allocationsData.filter(a => allAlignedActivityIds.has(a.activity_id));

    // Count unique activities per priority (using filtered allocations)
    const activitiesByPriority = new Map<string, Set<string>>();
    const principalByPriority = new Map<string, Set<string>>();
    const significantByPriority = new Map<string, Set<string>>();
    filteredAllocations.forEach(alloc => {
      if (!activitiesByPriority.has(alloc.national_priority_id)) {
        activitiesByPriority.set(alloc.national_priority_id, new Set());
      }
      activitiesByPriority.get(alloc.national_priority_id)!.add(alloc.activity_id);

      const sigMap = alloc.significance === 'principal' ? principalByPriority : significantByPriority;
      if (!sigMap.has(alloc.national_priority_id)) {
        sigMap.set(alloc.national_priority_id, new Set());
      }
      sigMap.get(alloc.national_priority_id)!.add(alloc.activity_id);
    });

    // Fetch activity details (title, iati_id) for the drill-down
    const activityDetails = new Map<string, { id: string; title: string; iati_id: string | null }>();
    if (allAlignedActivityIds.size > 0) {
      const idArray = Array.from(allAlignedActivityIds);
      const batchSize = 100;
      for (let i = 0; i < idArray.length; i += batchSize) {
        const batch = idArray.slice(i, i + batchSize);
        const { data: acts } = await supabase
          .from('activities')
          .select('id, title_narrative, iati_identifier')
          .in('id', batch);
        if (acts) {
          acts.forEach((a: any) => {
            activityDetails.set(a.id, {
              id: a.id,
              title: a.title_narrative || 'Untitled',
              iati_id: a.iati_identifier || null,
            });
          });
        }
      }
    }

    // Fetch disbursement totals for aligned activities
    const fundingByActivity = new Map<string, number>();
    if (allAlignedActivityIds.size > 0) {
      const idArray = Array.from(allAlignedActivityIds);
      const batchSize = 100;
      for (let i = 0; i < idArray.length; i += batchSize) {
        const batch = idArray.slice(i, i + batchSize);
        const { data: txns } = await supabase
          .from('transactions')
          .select('activity_id, value_usd')
          .in('activity_id', batch)
          .eq('transaction_type_code', '3');
        if (txns) {
          txns.forEach((txn: { activity_id: string; value_usd: number | null }) => {
            const current = fundingByActivity.get(txn.activity_id) || 0;
            fundingByActivity.set(txn.activity_id, current + (txn.value_usd || 0));
          });
        }
      }
    }

    // Calculate funding per priority
    const fundingByPriority = new Map<string, number>();
    filteredAllocations.forEach(alloc => {
      const funding = fundingByActivity.get(alloc.activity_id) || 0;
      const current = fundingByPriority.get(alloc.national_priority_id) || 0;
      fundingByPriority.set(alloc.national_priority_id, current + funding);
    });

    // Build the coverage tree
    const buildCoverageTree = (priorities: ReturnType<typeof nationalPriorityFromRow>[]): AlignmentCoverageNode[] => {
      const nodeMap = new Map<string, AlignmentCoverageNode>();
      const roots: AlignmentCoverageNode[] = [];

      priorities.forEach(p => {
        const activities = activitiesByPriority.get(p.id);
        nodeMap.set(p.id, {
          id: p.id,
          code: p.code,
          name: p.name,
          level: p.level,
          activityCount: activities?.size || 0,
          principalCount: principalByPriority.get(p.id)?.size || 0,
          significantCount: significantByPriority.get(p.id)?.size || 0,
          totalFunding: fundingByPriority.get(p.id) || 0,
          children: [],
        });
      });

      priorities.forEach(p => {
        const node = nodeMap.get(p.id)!;
        if (p.parentId && nodeMap.has(p.parentId)) {
          nodeMap.get(p.parentId)!.children!.push(node);
        } else {
          roots.push(node);
        }
      });

      const rollUp = (node: AlignmentCoverageNode): {
        activities: Set<string>;
        principal: Set<string>;
        significant: Set<string>;
        funding: number;
      } => {
        const myActivities = activitiesByPriority.get(node.id) || new Set<string>();
        const myPrincipal = principalByPriority.get(node.id) || new Set<string>();
        const mySignificant = significantByPriority.get(node.id) || new Set<string>();
        const allActivities = new Set(myActivities);
        const allPrincipal = new Set(myPrincipal);
        const allSignificant = new Set(mySignificant);
        let totalFunding = fundingByPriority.get(node.id) || 0;

        if (node.children) {
          node.children.forEach(child => {
            const childResult = rollUp(child);
            childResult.activities.forEach(id => allActivities.add(id));
            childResult.principal.forEach(id => allPrincipal.add(id));
            childResult.significant.forEach(id => allSignificant.add(id));
            totalFunding += childResult.funding;
          });
        }

        node.activityCount = allActivities.size;
        node.principalCount = allPrincipal.size;
        node.significantCount = allSignificant.size;
        node.totalFunding = totalFunding;
        return { activities: allActivities, principal: allPrincipal, significant: allSignificant, funding: totalFunding };
      };

      roots.forEach(rollUp);

      return roots;
    };

    const tree = buildCoverageTree(priorities);

    // Build a mapping: priorityId -> [{activityId, title, iati_id, funding}]
    // This is for drill-down. Includes both direct allocations and rollup from children.
    const priorityIdToActivitiesMap: Record<string, Array<{ id: string; title: string; iati_id: string | null; funding: number }>> = {};

    // Helper: get all descendant priority IDs (including self)
    const childrenByParent = new Map<string | null, string[]>();
    priorities.forEach(p => {
      const key = p.parentId || null;
      if (!childrenByParent.has(key)) childrenByParent.set(key, []);
      childrenByParent.get(key)!.push(p.id);
    });

    const getDescendantIds = (priorityId: string): string[] => {
      const result = [priorityId];
      const children = childrenByParent.get(priorityId) || [];
      children.forEach(childId => {
        result.push(...getDescendantIds(childId));
      });
      return result;
    };

    priorities.forEach(p => {
      const descendantIds = getDescendantIds(p.id);
      const activityIdsForThisNode = new Set<string>();
      filteredAllocations.forEach(a => {
        if (descendantIds.includes(a.national_priority_id)) {
          activityIdsForThisNode.add(a.activity_id);
        }
      });
      priorityIdToActivitiesMap[p.id] = Array.from(activityIdsForThisNode)
        .map(id => {
          const det = activityDetails.get(id);
          return {
            id,
            title: det?.title || 'Untitled',
            iati_id: det?.iati_id || null,
            funding: fundingByActivity.get(id) || 0,
          };
        })
        .sort((a, b) => b.funding - a.funding);
    });

    // Get totals
    const { count: totalActivities } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true });

    let totalFunding = 0;
    const { data: totalTxns } = await supabase
      .from('transactions')
      .select('value_usd')
      .eq('transaction_type_code', '3');

    if (totalTxns) {
      totalFunding = totalTxns.reduce((sum: number, t: { value_usd: number | null }) => sum + (t.value_usd || 0), 0);
    }

    let alignedFunding = 0;
    allAlignedActivityIds.forEach(id => {
      alignedFunding += fundingByActivity.get(id) || 0;
    });

    return NextResponse.json({
      success: true,
      data: {
        plan,
        tree,
        totalActivities: totalActivities || 0,
        alignedActivities: allAlignedActivityIds.size,
        totalFunding,
        alignedFunding,
        activitiesByPriority: priorityIdToActivitiesMap,
      },
    });

  } catch (error) {
    console.error('[Alignment Coverage API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

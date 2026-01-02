import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { MeasureType, FragmentationData, FragmentationCell, FragmentationDonor, FragmentationCategory } from '@/types/national-priorities';

/**
 * GET /api/analytics/fragmentation/program
 * Returns Donors × National Priorities fragmentation matrix
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    // Check if Supabase is properly initialized
    if (!supabase) {
      console.error('[Program Fragmentation API] Supabase client not initialized');
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 503 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    
    const measure = (searchParams.get('measure') || 'disbursements') as MeasureType;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const maxDonors = parseInt(searchParams.get('maxDonors') || '10');
    const priorityLevel = parseInt(searchParams.get('priorityLevel') || '1'); // Default to top-level
    
    const transactionType = measure === 'commitments' ? '2' : '3';

    // Get all activities with their reporting orgs, national priorities, and transactions
    const { data: activities, error } = await supabase
      .from('activities')
      .select(`
        id,
        reporting_org_id,
        organizations!reporting_org_id (id, name, acronym, country),
        activity_national_priorities (
          national_priority_id,
          percentage,
          national_priorities (id, code, name, level, parent_id)
        ),
        transactions!transactions_activity_id_fkey1 (usd_value, transaction_type, transaction_date, status)
      `);

    if (error) {
      console.error('[Program Fragmentation API] Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Get all top-level priorities for the categories
    const { data: allPriorities } = await supabase
      .from('national_priorities')
      .select('id, code, name, level, parent_id')
      .eq('level', priorityLevel)
      .eq('is_active', true)
      .order('display_order');

    // Build mapping from child priority to top-level parent
    const { data: allPriorityRows } = await supabase
      .from('national_priorities')
      .select('id, parent_id, level');

    const priorityParentMap = new Map<string, string>();
    
    // Build parent chain for each priority
    const findTopLevelParent = (priorityId: string): string => {
      if (priorityParentMap.has(priorityId)) {
        return priorityParentMap.get(priorityId)!;
      }
      
      const priority = allPriorityRows?.find((p: any) => p.id === priorityId);
      if (!priority) return priorityId;
      
      if (priority.level === priorityLevel) {
        priorityParentMap.set(priorityId, priorityId);
        return priorityId;
      }
      
      if (priority.parent_id) {
        const topLevel = findTopLevelParent(priority.parent_id);
        priorityParentMap.set(priorityId, topLevel);
        return topLevel;
      }
      
      priorityParentMap.set(priorityId, priorityId);
      return priorityId;
    };

    // Pre-calculate all mappings
    allPriorityRows?.forEach((p: any) => findTopLevelParent(p.id));

    // Build donor totals and priority breakdown
    const donorData = new Map<string, {
      name: string;
      acronym?: string;
      country?: string;
      total: number;
      priorities: Map<string, { name: string; code: string; value: number; count: number }>;
    }>();

    const priorityInfo = new Map<string, { code: string; name: string }>();
    allPriorities?.forEach((p: any) => {
      priorityInfo.set(p.id, { code: p.code, name: p.name });
    });

    activities?.forEach((activity: any) => {
      const orgId = activity.reporting_org_id;
      const orgName = activity.organizations?.name || 'Unknown';
      const orgAcronym = activity.organizations?.acronym;
      const orgCountry = activity.organizations?.country;

      // Filter transactions
      const validTransactions = (activity.transactions || []).filter((t: any) => {
        if (t.transaction_type !== transactionType || t.status !== 'actual') return false;
        if (dateFrom && new Date(t.transaction_date) < new Date(dateFrom)) return false;
        if (dateTo && new Date(t.transaction_date) > new Date(dateTo)) return false;
        return true;
      });

      if (validTransactions.length === 0) return;

      const totalTransactionValue = validTransactions.reduce(
        (sum: number, t: any) => sum + (parseFloat(t.usd_value) || 0), 0
      );

      if (!donorData.has(orgId)) {
        donorData.set(orgId, {
          name: orgName,
          acronym: orgAcronym,
          country: orgCountry,
          total: 0,
          priorities: new Map(),
        });
      }

      const donor = donorData.get(orgId)!;
      donor.total += totalTransactionValue;

      // Distribute value across national priorities
      const npAllocations = activity.activity_national_priorities || [];
      if (npAllocations.length === 0) {
        // No priorities - put under "Unallocated"
        const priorityId = 'unallocated';
        const prioData = donor.priorities.get(priorityId) || { name: 'Unallocated', code: 'N/A', value: 0, count: 0 };
        prioData.value += totalTransactionValue;
        prioData.count += 1;
        donor.priorities.set(priorityId, prioData);
        priorityInfo.set(priorityId, { code: 'N/A', name: 'Unallocated' });
      } else {
        npAllocations.forEach((alloc: any) => {
          const priority = alloc.national_priorities;
          if (!priority) return;
          
          // Map to top-level priority
          const topLevelId = findTopLevelParent(priority.id);
          const topLevel = priorityInfo.get(topLevelId);
          
          const pct = (alloc.percentage || 100) / 100;
          const priorityId = topLevelId;
          const priorityName = topLevel?.name || priority.name;
          const priorityCode = topLevel?.code || priority.code;

          const prioData = donor.priorities.get(priorityId) || { name: priorityName, code: priorityCode, value: 0, count: 0 };
          prioData.value += totalTransactionValue * pct;
          prioData.count += 1;
          donor.priorities.set(priorityId, prioData);
          
          if (!priorityInfo.has(priorityId)) {
            priorityInfo.set(priorityId, { code: priorityCode, name: priorityName });
          }
        });
      }
    });

    // Sort donors by total value
    const sortedDonors = Array.from(donorData.entries())
      .sort((a, b) => b[1].total - a[1].total);

    // Take top N donors, aggregate rest into OTHERS
    const topDonors = sortedDonors.slice(0, maxDonors);
    const otherDonors = sortedDonors.slice(maxDonors);

    // Calculate OTHERS totals
    let othersTotal = 0;
    const othersPriorities = new Map<string, { name: string; code: string; value: number; count: number }>();
    
    otherDonors.forEach(([, data]) => {
      othersTotal += data.total;
      data.priorities.forEach((prioData, priorityId) => {
        const existing = othersPriorities.get(priorityId) || { name: prioData.name, code: prioData.code, value: 0, count: 0 };
        existing.value += prioData.value;
        existing.count += prioData.count;
        othersPriorities.set(priorityId, existing);
      });
    });

    // Build response
    const donors: FragmentationDonor[] = topDonors.map(([id, data]) => ({
      id,
      name: data.name,
      acronym: data.acronym,
      country: data.country,
      total: data.total,
    }));

    if (othersTotal > 0) {
      donors.push({
        id: 'others',
        name: 'OTHERS',
        total: othersTotal,
      });
    }

    // Sort priorities by total value across all donors
    const priorityTotals = new Map<string, number>();
    donorData.forEach((donor) => {
      donor.priorities.forEach((prioData, priorityId) => {
        priorityTotals.set(priorityId, (priorityTotals.get(priorityId) || 0) + prioData.value);
      });
    });

    const sortedPriorityIds = Array.from(priorityInfo.keys())
      .sort((a, b) => (priorityTotals.get(b) || 0) - (priorityTotals.get(a) || 0));

    // Build categories with totals
    const categories: FragmentationCategory[] = sortedPriorityIds.map((id) => ({
      id,
      name: priorityInfo.get(id)?.name || 'Unknown',
      code: priorityInfo.get(id)?.code,
      total: priorityTotals.get(id) || 0,
    }));

    // Build cells with both row-based and column-based percentages
    const cells: FragmentationCell[] = [];

    topDonors.forEach(([donorId, donorData]) => {
      sortedPriorityIds.forEach((priorityId) => {
        const prioData = donorData.priorities.get(priorityId);
        if (prioData && prioData.value > 0) {
          const categoryTotal = priorityTotals.get(priorityId) || 0;
          cells.push({
            donorId,
            donorName: donorData.name,
            donorCountry: donorData.country,
            categoryId: priorityId,
            categoryName: prioData.name,
            categoryCode: prioData.code,
            value: prioData.value,
            percentage: donorData.total > 0 ? (prioData.value / donorData.total) * 100 : 0,
            percentageOfCategory: categoryTotal > 0 ? (prioData.value / categoryTotal) * 100 : 0,
            activityCount: prioData.count,
          });
        }
      });
    });

    // Add OTHERS cells
    if (othersTotal > 0) {
      sortedPriorityIds.forEach((priorityId) => {
        const prioData = othersPriorities.get(priorityId);
        if (prioData && prioData.value > 0) {
          const categoryTotal = priorityTotals.get(priorityId) || 0;
          cells.push({
            donorId: 'others',
            donorName: 'OTHERS',
            categoryId: priorityId,
            categoryName: prioData.name,
            categoryCode: prioData.code,
            value: prioData.value,
            percentage: othersTotal > 0 ? (prioData.value / othersTotal) * 100 : 0,
            percentageOfCategory: categoryTotal > 0 ? (prioData.value / categoryTotal) * 100 : 0,
            activityCount: prioData.count,
          });
        }
      });
    }

    const grandTotal = donors.reduce((sum, d) => sum + d.total, 0);

    const data: FragmentationData = {
      donors,
      categories,
      cells,
      grandTotal,
      othersTotal,
    };

    return NextResponse.json({
      success: true,
      data,
      measure,
      fragmentationType: 'program',
    });

  } catch (error: any) {
    console.error('[Program Fragmentation API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}


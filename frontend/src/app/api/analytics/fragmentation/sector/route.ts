import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { MeasureType, FragmentationData, FragmentationCell, FragmentationDonor, FragmentationCategory } from '@/types/national-priorities';

/**
 * GET /api/analytics/fragmentation/sector
 * Returns Donors × DAC 3-digit Sector Categories fragmentation matrix
 */
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    
    // Check if Supabase is properly initialized
    if (!supabase) {
      console.error('[Sector Fragmentation API] Supabase client not initialized');
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
    
    const transactionType = measure === 'commitments' ? '2' : '3';

    // Get all activities with their reporting orgs, sectors, and transactions
    const { data: activities, error } = await supabase
      .from('activities')
      .select(`
        id,
        reporting_org_id,
        organizations!reporting_org_id (id, name, acronym, country),
        activity_sectors (sector_code, category_code, category_name, percentage),
        transactions!transactions_activity_id_fkey1 (value_usd, transaction_type, transaction_date, status)
      `);

    if (error) {
      console.error('[Sector Fragmentation API] Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Build donor totals and sector breakdown
    const donorData = new Map<string, {
      name: string;
      acronym?: string;
      country?: string;
      total: number;
      sectors: Map<string, { name: string; value: number; count: number }>;
    }>();

    const allCategories = new Map<string, string>();

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
        (sum: number, t: any) => sum + (parseFloat(t.value_usd) || 0), 0
      );

      if (!donorData.has(orgId)) {
        donorData.set(orgId, {
          name: orgName,
          acronym: orgAcronym,
          country: orgCountry,
          total: 0,
          sectors: new Map(),
        });
      }

      const donor = donorData.get(orgId)!;
      donor.total += totalTransactionValue;

      // Distribute value across sectors
      const sectors = activity.activity_sectors || [];
      if (sectors.length === 0) {
        // No sectors - put under "Unallocated"
        const categoryCode = '998';
        const categoryName = 'Unallocated';
        allCategories.set(categoryCode, categoryName);
        
        const sectorData = donor.sectors.get(categoryCode) || { name: categoryName, value: 0, count: 0 };
        sectorData.value += totalTransactionValue;
        sectorData.count += 1;
        donor.sectors.set(categoryCode, sectorData);
      } else {
        sectors.forEach((sector: any) => {
          const categoryCode = sector.category_code || sector.sector_code?.substring(0, 3) || '998';
          const categoryName = sector.category_name || `Sector ${categoryCode}`;
          const pct = (sector.percentage || 100) / 100;

          allCategories.set(categoryCode, categoryName);

          const sectorData = donor.sectors.get(categoryCode) || { name: categoryName, value: 0, count: 0 };
          sectorData.value += totalTransactionValue * pct;
          sectorData.count += 1;
          donor.sectors.set(categoryCode, sectorData);
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
    const othersSectors = new Map<string, { name: string; value: number; count: number }>();
    
    otherDonors.forEach(([, data]) => {
      othersTotal += data.total;
      data.sectors.forEach((sectorData, categoryCode) => {
        const existing = othersSectors.get(categoryCode) || { name: sectorData.name, value: 0, count: 0 };
        existing.value += sectorData.value;
        existing.count += sectorData.count;
        othersSectors.set(categoryCode, existing);
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

    // Sort categories by total value across all donors
    const categoryTotals = new Map<string, number>();
    donorData.forEach((donor) => {
      donor.sectors.forEach((sectorData, categoryCode) => {
        categoryTotals.set(categoryCode, (categoryTotals.get(categoryCode) || 0) + sectorData.value);
      });
    });

    const sortedCategories = Array.from(allCategories.entries())
      .sort((a, b) => (categoryTotals.get(b[0]) || 0) - (categoryTotals.get(a[0]) || 0));

    // Build categories with totals
    const categories: FragmentationCategory[] = sortedCategories.map(([code, name]) => ({
      id: code,
      name,
      code,
      total: categoryTotals.get(code) || 0,
    }));

    // Build cells with both row-based and column-based percentages
    const cells: FragmentationCell[] = [];

    topDonors.forEach(([donorId, donorData]) => {
      sortedCategories.forEach(([categoryCode, categoryName]) => {
        const sectorData = donorData.sectors.get(categoryCode);
        if (sectorData && sectorData.value > 0) {
          const catTotal = categoryTotals.get(categoryCode) || 0;
          cells.push({
            donorId,
            donorName: donorData.name,
            donorCountry: donorData.country,
            categoryId: categoryCode,
            categoryName,
            categoryCode,
            value: sectorData.value,
            percentage: donorData.total > 0 ? (sectorData.value / donorData.total) * 100 : 0,
            percentageOfCategory: catTotal > 0 ? (sectorData.value / catTotal) * 100 : 0,
            activityCount: sectorData.count,
          });
        }
      });
    });

    // Add OTHERS cells
    if (othersTotal > 0) {
      sortedCategories.forEach(([categoryCode, categoryName]) => {
        const sectorData = othersSectors.get(categoryCode);
        if (sectorData && sectorData.value > 0) {
          const catTotal = categoryTotals.get(categoryCode) || 0;
          cells.push({
            donorId: 'others',
            donorName: 'OTHERS',
            categoryId: categoryCode,
            categoryName,
            categoryCode,
            value: sectorData.value,
            percentage: othersTotal > 0 ? (sectorData.value / othersTotal) * 100 : 0,
            percentageOfCategory: catTotal > 0 ? (sectorData.value / catTotal) * 100 : 0,
            activityCount: sectorData.count,
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
      fragmentationType: 'sector',
    });

  } catch (error: any) {
    console.error('[Sector Fragmentation API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { MeasureType, FragmentationData, FragmentationCell, FragmentationDonor, FragmentationCategory } from '@/types/national-priorities';

/**
 * GET /api/analytics/fragmentation/location
 * Returns Donors × Admin Level 1 Regions fragmentation matrix
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const searchParams = request.nextUrl.searchParams;
    
    const measure = (searchParams.get('measure') || 'disbursements') as MeasureType;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const maxDonors = parseInt(searchParams.get('maxDonors') || '10');
    
    const transactionType = measure === 'commitments' ? '2' : '3';

    // Get all activities with their reporting orgs, locations, and transactions
    const { data: activities, error } = await supabase
      .from('activities')
      .select(`
        id,
        reporting_org_id,
        organizations!reporting_org_id (id, name, acronym, country),
        subnational_breakdowns (region_name, percentage, is_nationwide),
        transactions!transactions_activity_id_fkey1 (value_usd, transaction_type, transaction_date, status)
      `);

    if (error) {
      console.error('[Location Fragmentation API] Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Build donor totals and location breakdown
    const donorData = new Map<string, {
      name: string;
      acronym?: string;
      country?: string;
      total: number;
      locations: Map<string, { value: number; count: number }>;
    }>();

    const allLocations = new Set<string>();

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
          locations: new Map(),
        });
      }

      const donor = donorData.get(orgId)!;
      donor.total += totalTransactionValue;

      // Distribute value across locations using subnational breakdowns
      const breakdowns = activity.subnational_breakdowns || [];
      if (breakdowns.length === 0) {
        // No location breakdowns - put under "Nationwide"
        const locationName = 'Nationwide';
        allLocations.add(locationName);
        
        const locData = donor.locations.get(locationName) || { value: 0, count: 0 };
        locData.value += totalTransactionValue;
        locData.count += 1;
        donor.locations.set(locationName, locData);
      } else {
        breakdowns.forEach((breakdown: any) => {
          // Use "Nationwide" for is_nationwide entries, otherwise use region_name
          const locationName = breakdown.is_nationwide ? 'Nationwide' : (breakdown.region_name || 'Unspecified');
          const pct = (breakdown.percentage || 100) / 100;

          allLocations.add(locationName);

          const locData = donor.locations.get(locationName) || { value: 0, count: 0 };
          locData.value += totalTransactionValue * pct;
          locData.count += 1;
          donor.locations.set(locationName, locData);
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
    const othersLocations = new Map<string, { value: number; count: number }>();
    
    otherDonors.forEach(([, data]) => {
      othersTotal += data.total;
      data.locations.forEach((locData, locationName) => {
        const existing = othersLocations.get(locationName) || { value: 0, count: 0 };
        existing.value += locData.value;
        existing.count += locData.count;
        othersLocations.set(locationName, existing);
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

    // Sort locations by total value across all donors
    const locationTotals = new Map<string, number>();
    donorData.forEach((donor) => {
      donor.locations.forEach((locData, locationName) => {
        locationTotals.set(locationName, (locationTotals.get(locationName) || 0) + locData.value);
      });
    });

    const sortedLocations = Array.from(allLocations)
      .sort((a, b) => (locationTotals.get(b) || 0) - (locationTotals.get(a) || 0));

    // Build categories with totals
    const categories: FragmentationCategory[] = sortedLocations.map((name) => ({
      id: name,
      name,
      total: locationTotals.get(name) || 0,
    }));

    // Build cells with both row-based and column-based percentages
    const cells: FragmentationCell[] = [];

    topDonors.forEach(([donorId, donorData]) => {
      sortedLocations.forEach((locationName) => {
        const locData = donorData.locations.get(locationName);
        if (locData && locData.value > 0) {
          const locTotal = locationTotals.get(locationName) || 0;
          cells.push({
            donorId,
            donorName: donorData.name,
            donorCountry: donorData.country,
            categoryId: locationName,
            categoryName: locationName,
            value: locData.value,
            percentage: donorData.total > 0 ? (locData.value / donorData.total) * 100 : 0,
            percentageOfCategory: locTotal > 0 ? (locData.value / locTotal) * 100 : 0,
            activityCount: locData.count,
          });
        }
      });
    });

    // Add OTHERS cells
    if (othersTotal > 0) {
      sortedLocations.forEach((locationName) => {
        const locData = othersLocations.get(locationName);
        if (locData && locData.value > 0) {
          const locTotal = locationTotals.get(locationName) || 0;
          cells.push({
            donorId: 'others',
            donorName: 'OTHERS',
            categoryId: locationName,
            categoryName: locationName,
            value: locData.value,
            percentage: othersTotal > 0 ? (locData.value / othersTotal) * 100 : 0,
            percentageOfCategory: locTotal > 0 ? (locData.value / locTotal) * 100 : 0,
            activityCount: locData.count,
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
      fragmentationType: 'location',
    });

  } catch (error: any) {
    console.error('[Location Fragmentation API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}


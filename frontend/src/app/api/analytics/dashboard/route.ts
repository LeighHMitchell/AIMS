import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { MeasureType, DashboardData, RankedItem, FundingByType } from '@/types/national-priorities';

/**
 * GET /api/analytics/dashboard
 * Returns all summary data for the Dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const searchParams = request.nextUrl.searchParams;
    
    // Parse parameters
    const measure = (searchParams.get('measure') || 'disbursements') as MeasureType;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const topN = parseInt(searchParams.get('topN') || '5');
    
    // Determine transaction type based on measure
    const transactionType = measure === 'commitments' ? '2' : '3'; // 2=Commitment, 3=Disbursement
    
    // Build date filter
    let dateFilter = '';
    if (dateFrom) {
      dateFilter += ` AND t.transaction_date >= '${dateFrom}'`;
    }
    if (dateTo) {
      dateFilter += ` AND t.transaction_date <= '${dateTo}'`;
    }

    // ============================================
    // TOP DONOR AGENCIES (Reporting Orgs)
    // ============================================
    // Note: We skip the RPC call since it may not exist, and use the fallback query directly
    let topDonorAgencies: RankedItem[] = [];
    let donorAgenciesOthers = 0;
    
    {
      // Query activities with transactions - filter transactions in JS for reliability
      // Use explicit FK relationship to avoid ambiguity
      const { data: agencies, error: agencyError } = await supabase
        .from('activities')
        .select(`
          id,
          reporting_org_id,
          organizations!reporting_org_id (id, name, acronym, country),
          transactions!transactions_activity_id_fkey1 (value, value_usd, transaction_type, transaction_date, status)
        `)
        .not('reporting_org_id', 'is', null);

      const agencyMap = new Map<string, { name: string; country: string; value: number; activityIds: Set<string> }>();
      
      agencies?.forEach((a: any) => {
        const orgId = a.reporting_org_id;
        const activityId = a.id;
        if (!orgId || !activityId) return;
        const orgName = a.organizations?.name || 'Unknown';
        const country = a.organizations?.country || '';
        
        let hasMatchingTransaction = false;
        let activityValue = 0;
        
        a.transactions?.forEach((t: any) => {
          // Filter to correct transaction type and status (handle both string and number)
          if (String(t.transaction_type) !== transactionType) return;
          if (t.status !== 'actual') return;
          
          if (!dateFrom || new Date(t.transaction_date) >= new Date(dateFrom)) {
            if (!dateTo || new Date(t.transaction_date) <= new Date(dateTo)) {
              hasMatchingTransaction = true;
              activityValue += parseFloat(t.value_usd) || parseFloat(t.value) || 0;
            }
          }
        });
        
        if (hasMatchingTransaction) {
          const existing = agencyMap.get(orgId) || { name: orgName, country, value: 0, activityIds: new Set<string>() };
          existing.value += activityValue;
          existing.activityIds.add(activityId);
          agencyMap.set(orgId, existing);
        }
      });

      const sorted = Array.from(agencyMap.entries())
        .sort((a, b) => b[1].value - a[1].value);

      topDonorAgencies = sorted.slice(0, topN).map(([id, data]) => ({
        id,
        name: data.name,
        country: data.country,
        value: data.value,
        activityCount: data.activityIds.size,
      }));

      donorAgenciesOthers = sorted.slice(topN).reduce((sum, [, data]) => sum + data.value, 0);
    }

    if (donorAgenciesOthers > 0) {
      topDonorAgencies.push({
        id: 'others',
        name: 'OTHERS',
        value: donorAgenciesOthers,
        activityCount: 0,
      });
    }

    // ============================================
    // TOP DONOR GROUPS (By Country)
    // ============================================
    const countryMap = new Map<string, { value: number; count: number }>();
    
    topDonorAgencies.forEach((agency) => {
      if (agency.id !== 'others' && agency.country) {
        const existing = countryMap.get(agency.country) || { value: 0, count: 0 };
        existing.value += agency.value;
        existing.count += agency.activityCount;
        countryMap.set(agency.country, existing);
      }
    });

    const topDonorGroups: RankedItem[] = Array.from(countryMap.entries())
      .sort((a, b) => b[1].value - a[1].value)
      .slice(0, topN)
      .map(([country, data]) => ({
        id: country,
        name: country,
        country: country,
        value: data.value,
        activityCount: data.count,
      }));

    // ============================================
    // TOP SECTORS (DAC 3-digit categories)
    // ============================================
    // Use explicit FK relationship to avoid ambiguity
    const { data: sectorData } = await supabase
      .from('activity_sectors')
      .select(`
        sector_code,
        category_code,
        category_name,
        percentage,
        activity_id,
        activities (
          transactions!transactions_activity_id_fkey1 (value, value_usd, transaction_type, transaction_date, status)
        )
      `);

    const sectorMap = new Map<string, { name: string; value: number; activityIds: Set<string> }>();
    
    sectorData?.forEach((s: any) => {
      const categoryCode = s.category_code || s.sector_code?.substring(0, 3);
      const activityId = s.activity_id;
      if (!categoryCode || !activityId) return;
      const categoryName = s.category_name || `Sector ${categoryCode}`;
      const pct = (s.percentage || 100) / 100;
      
      let hasMatchingTransaction = false;
      let activityValue = 0;
      
      s.activities?.transactions?.forEach((t: any) => {
        // Filter to correct transaction type and status (handle both string and number)
        if (String(t.transaction_type) !== transactionType) return;
        if (t.status !== 'actual') return;
        
        if (!dateFrom || new Date(t.transaction_date) >= new Date(dateFrom)) {
          if (!dateTo || new Date(t.transaction_date) <= new Date(dateTo)) {
            hasMatchingTransaction = true;
            activityValue += (parseFloat(t.value_usd) || parseFloat(t.value) || 0) * pct;
          }
        }
      });
      
      if (hasMatchingTransaction) {
        const existing = sectorMap.get(categoryCode) || { name: categoryName, value: 0, activityIds: new Set<string>() };
        existing.value += activityValue;
        existing.activityIds.add(activityId);
        sectorMap.set(categoryCode, existing);
      }
    });

    const sortedSectors = Array.from(sectorMap.entries())
      .sort((a, b) => b[1].value - a[1].value);

    const topSectors: RankedItem[] = sortedSectors.slice(0, topN).map(([code, data]) => ({
      id: code,
      name: data.name,
      code,
      value: data.value,
      activityCount: data.activityIds.size,
    }));

    const sectorsOthers = sortedSectors.slice(topN).reduce((sum, [, data]) => sum + data.value, 0);
    if (sectorsOthers > 0) {
      topSectors.push({
        id: 'others',
        name: 'OTHERS',
        value: sectorsOthers,
        activityCount: 0,
      });
    }

    // ============================================
    // SUBNATIONAL ALLOCATIONS (Myanmar States/Regions)
    // ============================================
    // Valid Myanmar states/regions
    const VALID_REGIONS = new Set([
      'chin state', 'kachin state', 'kayah state', 'kayin state', 
      'mon state', 'rakhine state', 'shan state',
      'ayeyarwady region', 'bago region', 'magway region', 'mandalay region',
      'sagaing region', 'tanintharyi region', 'yangon region',
      'naypyidaw union territory', 'nationwide'
    ]);

    // Normalize and validate region name
    function normalizeRegion(name: string): string | null {
      const lower = name.toLowerCase().trim();
      if (VALID_REGIONS.has(lower)) {
        return lower.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
      return null;
    }

    // Get subnational breakdowns with activity transactions
    const { data: subnationalData, error: subnationalError } = await supabase
      .from('subnational_breakdowns')
      .select(`
        region_name,
        is_nationwide,
        percentage,
        activity_id,
        activities (
          transactions!transactions_activity_id_fkey1 (value, value_usd, transaction_type, transaction_date, status)
        )
      `);

    if (subnationalError) {
      console.error('[Dashboard API] Error fetching subnational data:', subnationalError);
    }

    const districtMap = new Map<string, { value: number; activityIds: Set<string> }>();
    
    subnationalData?.forEach((sub: any) => {
      const activityId = sub.activity_id;
      if (!activityId) return;
      
      // Validate region name - only include valid Myanmar regions
      let regionName: string | null;
      if (sub.is_nationwide) {
        regionName = 'Nationwide';
      } else {
        regionName = normalizeRegion(sub.region_name || '');
        if (!regionName) return; // Skip invalid entries like "Test Location"
      }
      
      const pct = (sub.percentage || 100) / 100;
      
      let hasMatchingTransaction = false;
      let activityValue = 0;
      
      sub.activities?.transactions?.forEach((t: any) => {
        // Filter to correct transaction type and status (handle both string and number)
        if (String(t.transaction_type) !== transactionType) return;
        if (t.status !== 'actual') return;
        
        if (!dateFrom || new Date(t.transaction_date) >= new Date(dateFrom)) {
          if (!dateTo || new Date(t.transaction_date) <= new Date(dateTo)) {
            hasMatchingTransaction = true;
            activityValue += (parseFloat(t.value_usd) || parseFloat(t.value) || 0) * pct;
          }
        }
      });
      
      if (hasMatchingTransaction) {
        const existing = districtMap.get(regionName) || { value: 0, activityIds: new Set<string>() };
        existing.value += activityValue;
        existing.activityIds.add(activityId);
        districtMap.set(regionName, existing);
      }
    });

    const sortedDistricts = Array.from(districtMap.entries())
      .sort((a, b) => b[1].value - a[1].value);

    const topDistricts: RankedItem[] = sortedDistricts.slice(0, topN).map(([name, data]) => ({
      id: name,
      name,
      value: data.value,
      activityCount: data.activityIds.size,
    }));

    const districtsOthers = sortedDistricts.slice(topN).reduce((sum, [, data]) => sum + data.value, 0);
    if (districtsOthers > 0) {
      topDistricts.push({
        id: 'others',
        name: 'OTHERS',
        value: districtsOthers,
        activityCount: 0,
      });
    }

    // ============================================
    // IMPLEMENTING AGENCIES (iati_role_code = 4)
    // ============================================
    const { data: implementingData } = await supabase
      .from('activity_participating_organizations')
      .select(`
        organization_id,
        narrative,
        iati_role_code,
        activity_id,
        organizations (id, name, acronym),
        activities (
          id,
          transactions!transactions_activity_id_fkey1 (value, value_usd, transaction_type, transaction_date, status)
        )
      `)
      .eq('iati_role_code', 4); // Implementing

    const implementingMap = new Map<string, { name: string; value: number; activityIds: Set<string> }>();
    
    implementingData?.forEach((org: any) => {
      const orgId = org.organization_id || org.narrative;
      const activityId = org.activity_id || org.activities?.id;
      if (!orgId || !activityId) return;
      const orgName = org.organizations?.acronym || org.organizations?.name || org.narrative || 'Unknown';
      
      let hasMatchingTransaction = false;
      let activityValue = 0;
      
      org.activities?.transactions?.forEach((t: any) => {
        // Filter to correct transaction type and status (handle both string and number)
        if (String(t.transaction_type) !== transactionType) return;
        if (t.status !== 'actual') return;
        
        if (!dateFrom || new Date(t.transaction_date) >= new Date(dateFrom)) {
          if (!dateTo || new Date(t.transaction_date) <= new Date(dateTo)) {
            hasMatchingTransaction = true;
            activityValue += parseFloat(t.value_usd) || parseFloat(t.value) || 0;
          }
        }
      });
      
      if (hasMatchingTransaction) {
        const existing = implementingMap.get(orgId) || { name: orgName, value: 0, activityIds: new Set<string>() };
        existing.value += activityValue;
        existing.activityIds.add(activityId);
        implementingMap.set(orgId, existing);
      }
    });

    const sortedImplementing = Array.from(implementingMap.entries())
      .sort((a, b) => b[1].value - a[1].value);

    const implementingAgencies: RankedItem[] = sortedImplementing.slice(0, topN).map(([id, data]) => ({
      id,
      name: data.name,
      value: data.value,
      activityCount: data.activityIds.size,
    }));

    const implementingOthers = sortedImplementing.slice(topN).reduce((sum, [, data]) => sum + data.value, 0);
    if (implementingOthers > 0) {
      implementingAgencies.push({
        id: 'others',
        name: 'OTHERS',
        value: implementingOthers,
        activityCount: 0,
      });
    }

    // ============================================
    // EXECUTING AGENCIES (iati_role_code = 3)
    // ============================================
    const { data: executingData } = await supabase
      .from('activity_participating_organizations')
      .select(`
        organization_id,
        narrative,
        iati_role_code,
        activity_id,
        organizations (id, name, acronym),
        activities (
          id,
          transactions!transactions_activity_id_fkey1 (value, value_usd, transaction_type, transaction_date, status)
        )
      `)
      .eq('iati_role_code', 3); // Extending

    const executingMap = new Map<string, { name: string; value: number; activityIds: Set<string> }>();
    
    executingData?.forEach((org: any) => {
      const orgId = org.organization_id || org.narrative;
      const activityId = org.activity_id || org.activities?.id;
      if (!orgId || !activityId) return;
      const orgName = org.organizations?.acronym || org.organizations?.name || org.narrative || 'Unknown';
      
      let hasMatchingTransaction = false;
      let activityValue = 0;
      
      org.activities?.transactions?.forEach((t: any) => {
        // Filter to correct transaction type and status (handle both string and number)
        if (String(t.transaction_type) !== transactionType) return;
        if (t.status !== 'actual') return;
        
        if (!dateFrom || new Date(t.transaction_date) >= new Date(dateFrom)) {
          if (!dateTo || new Date(t.transaction_date) <= new Date(dateTo)) {
            hasMatchingTransaction = true;
            activityValue += parseFloat(t.value_usd) || parseFloat(t.value) || 0;
          }
        }
      });
      
      if (hasMatchingTransaction) {
        const existing = executingMap.get(orgId) || { name: orgName, value: 0, activityIds: new Set<string>() };
        existing.value += activityValue;
        existing.activityIds.add(activityId);
        executingMap.set(orgId, existing);
      }
    });

    const sortedExecuting = Array.from(executingMap.entries())
      .sort((a, b) => b[1].value - a[1].value);

    const executingAgencies: RankedItem[] = sortedExecuting.slice(0, topN).map(([id, data]) => ({
      id,
      name: data.name,
      value: data.value,
      activityCount: data.activityIds.size,
    }));

    const executingOthers = sortedExecuting.slice(topN).reduce((sum, [, data]) => sum + data.value, 0);
    if (executingOthers > 0) {
      executingAgencies.push({
        id: 'others',
        name: 'OTHERS',
        value: executingOthers,
        activityCount: 0,
      });
    }

    // ============================================
    // RECIPIENT GOVERNMENT BODIES (Transaction receivers that are government type)
    // ============================================
    // Query transactions directly by receiver organization, filtering for government types (10, 15)
    // This correctly shows organizations that actually RECEIVE disbursements/commitments
    let recipientGovQuery = supabase
      .from('transactions')
      .select(`
        uuid,
        activity_id,
        value,
        value_usd,
        transaction_type,
        transaction_date,
        status,
        receiver_org_id,
        receiver_org_name,
        receiver_organization:organizations!transactions_receiver_org_id_fkey (
          id, 
          name, 
          acronym, 
          Organisation_Type_Code
        )
      `)
      .eq('transaction_type', transactionType)
      .eq('status', 'actual')
      .not('receiver_org_id', 'is', null);
    
    // Apply date filters at query level for efficiency
    if (dateFrom) {
      recipientGovQuery = recipientGovQuery.gte('transaction_date', dateFrom);
    }
    if (dateTo) {
      recipientGovQuery = recipientGovQuery.lte('transaction_date', dateTo);
    }
    
    const { data: receiverOrgTransactions } = await recipientGovQuery;

    const recipientGovMap = new Map<string, { name: string; value: number; activityIds: Set<string> }>();
    
    receiverOrgTransactions?.forEach((tx: any) => {
      // Filter to government types only (10 = Government, 15 = Other Public Sector)
      const orgTypeCode = tx.receiver_organization?.Organisation_Type_Code;
      if (!orgTypeCode || !['10', '15'].includes(String(orgTypeCode))) return;
      
      const orgId = tx.receiver_org_id;
      const activityId = tx.activity_id;
      if (!orgId) return;
      
      const orgName = tx.receiver_organization?.acronym || tx.receiver_organization?.name || tx.receiver_org_name || 'Unknown';
      const txValue = parseFloat(tx.value_usd) || parseFloat(tx.value) || 0;
      
      const existing = recipientGovMap.get(orgId) || { name: orgName, value: 0, activityIds: new Set<string>() };
      existing.value += txValue;
      if (activityId) {
        existing.activityIds.add(activityId);
      }
      recipientGovMap.set(orgId, existing);
    });

    const sortedRecipientGov = Array.from(recipientGovMap.entries())
      .sort((a, b) => b[1].value - a[1].value);

    const recipientGovBodies: RankedItem[] = sortedRecipientGov.slice(0, topN).map(([id, data]) => ({
      id,
      name: data.name,
      value: data.value,
      activityCount: data.activityIds.size,
    }));

    const recipientGovOthers = sortedRecipientGov.slice(topN).reduce((sum, [, data]) => sum + data.value, 0);
    if (recipientGovOthers > 0) {
      recipientGovBodies.push({
        id: 'others',
        name: 'OTHERS',
        value: recipientGovOthers,
        activityCount: 0,
      });
    }

    // ============================================
    // FUNDING BY TYPE (Time Series)
    // ============================================
    const { data: fundingData } = await supabase
      .from('transactions')
      .select(`
        transaction_date,
        value,
        value_usd,
        finance_type,
        status
      `)
      .eq('transaction_type', transactionType)
      .eq('status', 'actual')
      .order('transaction_date');

    const fundingMap = new Map<string, Map<string, number>>();
    
    fundingData?.forEach((t: any) => {
      if (!dateFrom || new Date(t.transaction_date) >= new Date(dateFrom)) {
        if (!dateTo || new Date(t.transaction_date) <= new Date(dateTo)) {
          const year = new Date(t.transaction_date).getFullYear().toString();
          const financeType = t.finance_type || 'Unknown';
          
          if (!fundingMap.has(year)) {
            fundingMap.set(year, new Map());
          }
          const yearMap = fundingMap.get(year)!;
          yearMap.set(financeType, (yearMap.get(financeType) || 0) + (parseFloat(t.value_usd) || parseFloat(t.value) || 0));
        }
      }
    });

    const fundingByType: FundingByType[] = [];
    fundingMap.forEach((typeMap, year) => {
      typeMap.forEach((value, financeType) => {
        fundingByType.push({
          year: parseInt(year),
          financeType,
          financeTypeName: getFinanceTypeName(financeType),
          value,
        });
      });
    });

    fundingByType.sort((a, b) => a.year - b.year || a.financeType.localeCompare(b.financeType));

    // ============================================
    // CALCULATE GRAND TOTAL
    // ============================================
    const grandTotal = topDonorAgencies
      .filter((d) => d.id !== 'others')
      .reduce((sum, d) => sum + d.value, 0) + donorAgenciesOthers;

    // ============================================
    // RETURN RESPONSE
    // ============================================
    const data: DashboardData = {
      topDonorAgencies,
      topDonorGroups,
      topSectors,
      topDistricts,
      implementingAgencies,
      executingAgencies,
      recipientGovBodies,
      fundingByType,
      grandTotal,
    };

    return NextResponse.json({
      success: true,
      data,
      measure,
      dateRange: {
        from: dateFrom || 'all',
        to: dateTo || 'all',
      },
    });

  } catch (error: any) {
    console.error('[Dashboard API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Get human-readable finance type name
 */
function getFinanceTypeName(code: string): string {
  const financeTypes: Record<string, string> = {
    '110': 'Grant (Standard)',
    '111': 'Grant (Subsidies)',
    '210': 'Interest Subsidy',
    '310': 'Capital Subscription',
    '410': 'Loan',
    '411': 'Reimbursable Grant',
    '412': 'Debt Relief',
    '413': 'Investment',
    '420': 'Bond',
    '421': 'Common Equity',
    '422': 'Shares (ODA)',
    '423': 'Shares (OOF)',
    '431': 'Subordinated Loan',
    '432': 'Preferred Equity',
    '433': 'Other Hybrid',
    '451': 'Non-cash ODA',
    '452': 'Debt Swap',
    '453': 'Debt Buyback',
    '510': 'Guarantee/Insurance',
    '520': 'Export Credit',
    '610': 'Debt Rescheduling',
    '620': 'Debt Cancellation',
    '630': 'Debt Conversion',
    '700': 'Grant (Equity)',
    '800': 'Technical Assistance',
    '900': 'Administrative Costs',
    'Unknown': 'Unspecified',
  };
  return financeTypes[code] || `Finance Type ${code}`;
}


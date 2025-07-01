import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Enhanced types for the dual grouping system
export interface PartnerSummaryData {
  id: string;
  name: string;
  acronym?: string;
  displayName: string;
  organizationType: string;
  organizationTypeId: string;
  organizationTypeLabel: string;
  organizationTypeCode: string; // IATI DAC code
  userDefinedGroups: UserDefinedGroup[];
  projectCounts: {
    active: number;
    total: number;
  };
  financialData: {
    year2022: number;
    year2023: number;
    year2024: number;
    year2025: number;
    year2026: number;
    year2027: number;
  };
  lastUpdated: string;
  website?: string;
  contactEmail?: string;
  country?: string;
  fullName?: string;
}

export interface UserDefinedGroup {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdByName?: string;
  lastUpdated: string;
  memberCount: number;
}

export interface OrganizationTypeGroup {
  id: string;
  code: string;
  type: string;
  label: string;
  count: number;
  totalProjects: number;
  totalDisbursements: number;
  yearlyTotals: {
    year2022: number;
    year2023: number;
    year2024: number;
    year2025: number;
    year2026: number;
    year2027: number;
  };
}

export interface PartnerSummaryResponse {
  partners: PartnerSummaryData[];
  organizationTypeGroups: OrganizationTypeGroup[];
  userDefinedGroups: UserDefinedGroup[];
  organizationTypes: string[];
  lastUpdated: string;
  groupingMode: 'organizationType' | 'userDefined';
  totalCounts: {
    partners: number;
    projects: number;
    totalDisbursements: number;
  };
}

// Organization database interface
interface OrganizationData {
  id: string;
  name: string;
  acronym?: string;
  full_name?: string;
  type?: string;
  organisation_type?: string;
  website?: string;
  email?: string;
  country?: string;
  created_at: string;
  updated_at: string;
}

interface TransactionData {
  provider_organization_id: string;
  receiver_organization_id: string;
  amount: number;
  transaction_date: string;
  transaction_type: string;
  project_id: string;
}

interface ActivityData {
  id: string;
  title: string;
  activity_status: string;
  implementing_org: string;
  planned_start_date: string;
  planned_end_date: string;
  actual_start_date: string;
  actual_end_date: string;
}

interface OrganizationTypeData {
  id: string;
  code: string;
  label: string;
  description?: string;
  category: string;
}

interface OrganizationGroupData {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_updated: string;
}

// Helper function to get year from date string
const getYearFromDate = (dateString: string | null): number | null => {
  if (!dateString) return null;
  try {
    return new Date(dateString).getFullYear();
  } catch {
    return null;
  }
};

const isUuid = (id: string | null): boolean => {
  if (!id) return false;
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(id);
};

// GET /api/partner-summary
export async function GET(request: NextRequest) {
  try {
    console.log('[AIMS] GET /api/partner-summary - Starting request');
    
    // Check if getSupabaseAdmin is properly initialized
    if (!getSupabaseAdmin()) {
      console.error('[AIMS] getSupabaseAdmin() is not initialized');
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    console.log('[AIMS] Supabase admin client is available, proceeding...');
    
    const searchParams = request.nextUrl.searchParams;
    const groupBy = searchParams.get('groupBy') || 'organizationType';
    const financialMode = searchParams.get('financialMode') || 'disbursements';
    
    console.log('[AIMS] Fetching data from database...');
    
    // Fetch all organizations including full_name
    const { data: organizations, error: orgError } = await getSupabaseAdmin()
      .from('organizations')
      .select('id, name, acronym, full_name, type, organisation_type, website, email, country, created_at, updated_at');

    if (orgError) {
      console.error('[AIMS] Error fetching organizations:', orgError);
      return NextResponse.json(
        { error: `Database error: ${orgError.message}` },
        { status: 500 }
      );
    }

    // Fetch organization types from database
    const { data: organizationTypes, error: typesError } = await getSupabaseAdmin()
      .from('organization_types')
      .select('id, code, label, description, category')
      .eq('is_active', true)
      .order('sort_order');

    if (typesError) {
      console.error('[AIMS] Error fetching organization types:', typesError);
    }

    // Fetch organization groups and their members from database
    const { data: organizationGroups, error: groupsError } = await getSupabaseAdmin()
      .from('organization_groups')
      .select(`
        id, name, description, created_by, created_at, updated_at,
        organization_group_members(organization_id)
      `);

    if (groupsError) {
      console.error('[AIMS] Error fetching organization groups:', groupsError);
    }

    // Fetch financial transactions - use the correct table and fields
    let transactions: TransactionData[] = [];
    let transactionError: any = null;
    
    // Query the transactions table with correct field names
    const { data: transactionData, error: transactionFetchError } = await getSupabaseAdmin()
      .from('transactions')
      .select('provider_org, receiver_org, value, transaction_date, transaction_type, activity_id, organization_id');

    if (!transactionFetchError && transactionData) {
      console.log('[AIMS] Using transactions table, found', transactionData.length, 'transactions');
      // Map to expected format
      transactions = transactionData.map((t: any) => ({
        provider_organization_id: t.provider_org,
        receiver_organization_id: t.receiver_org,
        amount: t.value,
        transaction_date: t.transaction_date,
        transaction_type: t.transaction_type,
        project_id: t.activity_id,
        organization_id: t.organization_id
      }));
    } else {
      console.error('[AIMS] Error fetching transactions:', transactionFetchError);
      transactionError = transactionFetchError;
    }

    // Create a comprehensive map for organization lookup
    const orgLookup = new Map<string, string>();
    (organizations || []).forEach((org: OrganizationData) => {
        orgLookup.set(org.id, org.id); // Map ID to ID
        if (org.name) orgLookup.set(org.name.toLowerCase(), org.id);
        if (org.acronym) orgLookup.set(org.acronym.toLowerCase(), org.id);
        if (org.full_name) orgLookup.set(org.full_name.toLowerCase(), org.id);
    });

    // Normalize transactions to ensure organization IDs are UUIDs
    const normalizedTransactions = (transactions || []).map(t => {
      let { provider_organization_id, receiver_organization_id } = t;
  
      if (provider_organization_id && !isUuid(provider_organization_id)) {
        provider_organization_id = orgLookup.get(provider_organization_id.toLowerCase()) || provider_organization_id;
      }
      if (receiver_organization_id && !isUuid(receiver_organization_id)) {
        receiver_organization_id = orgLookup.get(receiver_organization_id.toLowerCase()) || receiver_organization_id;
      }
      return { ...t, provider_organization_id, receiver_organization_id };
    });

    console.log('[AIMS] Normalized transactions count:', normalizedTransactions.length);

    // Filter transactions by financial mode
    const transactionTypeFilter = financialMode === 'disbursements' ? 'D' : 'C'; // Use single character codes
    const filteredTransactions = normalizedTransactions.filter((t: TransactionData) => 
      t.transaction_type === transactionTypeFilter
    );

    console.log('[AIMS] Filtered transactions for', financialMode, ':', filteredTransactions.length);

    // Fetch activities for additional project metadata
    const { data: activities, error: activitiesError } = await getSupabaseAdmin()
      .from('activities')
      .select('id, title, activity_status, implementing_org, planned_start_date, planned_end_date');

    if (activitiesError) {
      console.error('[AIMS] Error fetching activities:', activitiesError);
    }

    console.log('[AIMS] Fetched data:', {
      organizations: organizations?.length || 0,
      organizationTypes: organizationTypes?.length || 0,
      organizationGroups: organizationGroups?.length || 0,
      transactions: filteredTransactions?.length || 0,
      activities: activities?.length || 0,
      financialMode
    });

    // Sample data for debugging
    if (organizations && organizations.length > 0) {
      console.log('[DEBUG] Sample organization:', organizations[0]);
    }
    if (filteredTransactions && filteredTransactions.length > 0) {
      console.log('[DEBUG] Sample transaction:', filteredTransactions[0]);
      
      // Check for organizations with transactions
      const orgsWithTransactions = new Set([
        ...filteredTransactions.map((t: TransactionData) => t.provider_organization_id),
        ...filteredTransactions.map((t: TransactionData) => t.receiver_organization_id)
      ].filter(Boolean));
      console.log('[DEBUG] Organizations with transactions count:', orgsWithTransactions.size);
      console.log('[DEBUG] Sample org IDs with transactions:', Array.from(orgsWithTransactions).slice(0, 5));
    }

    if (!organizations || organizations.length === 0) {
      console.log('[AIMS] No organizations found in database');
      return NextResponse.json({
        partners: [],
        organizationTypeGroups: [],
        userDefinedGroups: [],
        organizationTypes: [],
        lastUpdated: new Date().toISOString(),
        groupingMode: groupBy as 'organizationType' | 'userDefined',
        totalCounts: { partners: 0, projects: 0, totalDisbursements: 0 }
      });
    }

    // Create group membership map
    const groupMembershipMap = new Map<string, string[]>();
    (organizationGroups || []).forEach((group: any) => {
      const memberIds = group.organization_group_members?.map((m: any) => m.organization_id) || [];
      memberIds.forEach((orgId: string) => {
        if (!groupMembershipMap.has(orgId)) {
          groupMembershipMap.set(orgId, []);
        }
        groupMembershipMap.get(orgId)!.push(group.id);
      });
    });

    // Helper function to get organization type info
    const getOrganizationTypeInfo = (org: OrganizationData): { id: string; code: string; label: string } => {
      const rawType = org.organisation_type || org.type || 'other';
      
      // Create built-in IATI DAC organization types mapping
      const builtInTypes: Record<string, { code: string; label: string }> = {
        '10': { code: '10', label: 'Government' },
        '11': { code: '11', label: 'Local Government' },
        '12': { code: '12', label: 'Other Public Sector' },
        '21': { code: '21', label: 'International NGO' },
        '22': { code: '22', label: 'National NGO' },
        '23': { code: '23', label: 'Partner Country based NGO' },
        '30': { code: '30', label: 'Regional Organisation' },
        '31': { code: '31', label: 'Public Private Partnership' },
        '40': { code: '40', label: 'Multilateral' },
        '60': { code: '60', label: 'Foundation' },
        '70': { code: '70', label: 'Private Sector in Provider Country' },
        '71': { code: '71', label: 'Private Sector in Aid Recipient Country' },
        '72': { code: '72', label: 'Private Sector in Third Country' },
        '80': { code: '80', label: 'Academic, Training and Research' },
        '90': { code: '90', label: 'Other' }
      };
      
      // First try direct code match
      if (builtInTypes[rawType]) {
        const type = builtInTypes[rawType];
        return { id: `type-${type.code}`, code: type.code, label: type.label };
      }
      
      // Try legacy mappings to IATI DAC codes
      const legacyMapping: Record<string, string> = {
        'development_partner': '40',
        'partner_government': '10',
        'implementing_partner': '22',
        'civil_society': '23',
        'private_sector': '70',
        'bilateral': '10',
        'multilateral': '40',
        'ingo': '21',
        'ngo': '22',
        'un': '40',
        'government': '10',
        'academic': '80',
        'foundation': '60'
      };
      
      const mappedCode = legacyMapping[rawType.toLowerCase()];
      if (mappedCode && builtInTypes[mappedCode]) {
        const type = builtInTypes[mappedCode];
        return { id: `type-${type.code}`, code: type.code, label: type.label };
      }
      
      // Default to 'Other' only if no match
      const otherType = builtInTypes['90'];
      return { id: `type-${otherType.code}`, code: otherType.code, label: otherType.label };
    };

    // Process organizations with real transaction and activity data
    const partners: PartnerSummaryData[] = organizations.map((org: OrganizationData) => {
      const typeInfo = getOrganizationTypeInfo(org);
      
      // --- Project Count Calculation ---
      // Uses all transactions to ensure count is independent of financial mode.
      const allOrgTransactions = (normalizedTransactions || []).filter(t => 
        t.provider_organization_id === org.id || t.receiver_organization_id === org.id
      );
      const distinctProjectIds = new Set(allOrgTransactions.map(t => t.project_id).filter(Boolean));
      const orgActivities = (activities || []).filter((activity: ActivityData) => 
        distinctProjectIds.has(activity.id)
      );
      const activeProjectCount = orgActivities.filter((a: ActivityData) => 
        a.activity_status === 'active' || a.activity_status === 'implementation'
      ).length;

      // --- Financial Data Calculation ---
      // Uses transactions pre-filtered by financial mode.
      const financialData = {
        year2022: 0,
        year2023: 0,
        year2024: 0,
        year2025: 0,
        year2026: 0,
        year2027: 0
      };

      (filteredTransactions || []).forEach((transaction: TransactionData) => {
        const year = getYearFromDate(transaction.transaction_date);
        const amount = transaction.amount || 0;
        let shouldCount = false;

        if (financialMode === 'commitments') {
          if (transaction.provider_organization_id === org.id) shouldCount = true;
        } else { // disbursements
          if (transaction.provider_organization_id === org.id || transaction.receiver_organization_id === org.id) {
            shouldCount = true;
          }
        }

        if (shouldCount && year && amount > 0) {
          switch (year) {
            case 2022: financialData.year2022 += amount; break;
            case 2023: financialData.year2023 += amount; break;
            case 2024: financialData.year2024 += amount; break;
            case 2025: financialData.year2025 += amount; break;
            case 2026: financialData.year2026 += amount; break;
            case 2027: financialData.year2027 += amount; break;
          }
        }
      });

      // Get user-defined groups for this organization
      const groupIds = groupMembershipMap.get(org.id) || [];
      const userDefinedGroups = (organizationGroups || [])
        .filter((group: any) => groupIds.includes(group.id))
        .map((group: any) => ({
          id: group.id,
          name: group.name,
          description: group.description,
          createdBy: group.created_by,
          lastUpdated: group.last_updated || group.updated_at,
          memberCount: group.organization_group_members?.length || 0
        }));

      return {
        id: org.id,
        name: org.name,
        acronym: org.acronym,
        fullName: org.full_name,
        displayName: org.acronym && org.acronym.trim() ? `${org.name} (${org.acronym})` : org.name,
        organizationType: typeInfo.code,
        organizationTypeId: typeInfo.id,
        organizationTypeLabel: typeInfo.label,
        organizationTypeCode: typeInfo.code,
        userDefinedGroups,
        projectCounts: {
          active: activeProjectCount,
          total: distinctProjectIds.size
        },
        financialData,
        lastUpdated: org.updated_at || org.created_at,
        website: org.website,
        contactEmail: org.email,
        country: org.country
      };
    });

    // Create organization type groups with enhanced statistics
    const typeStatsMap = new Map<string, OrganizationTypeGroup>();
    
    partners.forEach(partner => {
      const code = partner.organizationTypeCode;
      
      if (!typeStatsMap.has(code)) {
        typeStatsMap.set(code, {
          id: partner.organizationTypeId,
          code,
          type: partner.organizationType,
          label: partner.organizationTypeLabel,
          count: 0,
          totalProjects: 0,
          totalDisbursements: 0,
          yearlyTotals: {
            year2022: 0,
            year2023: 0,
            year2024: 0,
            year2025: 0,
            year2026: 0,
            year2027: 0
          }
        });
      }
      
      const stats = typeStatsMap.get(code)!;
      stats.count++;
      stats.totalProjects += partner.projectCounts.active;
      
      // Calculate yearly totals
      Object.keys(stats.yearlyTotals).forEach(year => {
        const yearKey = year as keyof typeof stats.yearlyTotals;
        stats.yearlyTotals[yearKey] += partner.financialData[yearKey];
        stats.totalDisbursements += partner.financialData[yearKey];
      });
    });

    const organizationTypeGroupsData = Array.from(typeStatsMap.values())
      .sort((a, b) => b.count - a.count);

    // Process user-defined groups
    const userDefinedGroupsData: UserDefinedGroup[] = (organizationGroups || []).map((group: any) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      createdBy: group.created_by,
      lastUpdated: group.last_updated || group.updated_at,
      memberCount: group.organization_group_members?.length || 0
    }));

    // Calculate total statistics
    const totalCounts = {
      partners: partners.length,
      projects: partners.reduce((sum, p) => sum + p.projectCounts.active, 0),
      totalDisbursements: partners.reduce((sum, p) => 
        sum + Object.values(p.financialData).reduce((s, v) => s + v, 0), 0
      )
    };

    const response: PartnerSummaryResponse = {
      partners,
      organizationTypeGroups: organizationTypeGroupsData,
      userDefinedGroups: userDefinedGroupsData,
      organizationTypes: Array.from(new Set(partners.map(p => p.organizationType))),
      lastUpdated: new Date().toISOString(),
      groupingMode: groupBy as 'organizationType' | 'userDefined',
      totalCounts
    };

    console.log('[AIMS] Partner summary prepared successfully:', {
      partnersCount: partners.length,
      orgTypeGroups: organizationTypeGroupsData.length,
      userGroups: userDefinedGroupsData.length,
      totalProjects: totalCounts.projects,
      totalDisbursements: Math.round(totalCounts.totalDisbursements / 1000000) + 'M',
      financialMode
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('[AIMS] Partner summary error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[AIMS] Error details:', errorMessage);
    
    return NextResponse.json(
      { error: `Failed to fetch partner summary: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// Helper function to find user-defined group for an organization
function findUserDefinedGroup(orgId: string, groups: any[]): string | undefined {
  const group = groups.find(g => 
    g.organization_ids && g.organization_ids.includes(orgId)
  );
  return group?.name;
} 
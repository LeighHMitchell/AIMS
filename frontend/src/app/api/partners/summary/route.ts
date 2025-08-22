import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Types matching actual Supabase Organizations table schema
interface Organization {
  id: string;                    // UUID from Supabase
  name: string;                  // Organization name
  type: string | null;           // Organization type
  country: string | null;        // Country
  created_at: string;
  updated_at: string;
  organisation_type?: string;    // Some orgs may have this field too
  acronym?: string;
  country_represented?: string;
  cooperation_modality?: string;
  active_project_count?: number;
  logo?: string | null;
}

interface OrganizationMetrics extends Organization {
  activeProjects: number;
  totalAmount: number;
  financialData: Record<string, number>;
  // Computed/display fields
  fullName: string;
  acronym: string;
  organisationType: string;
  countryRepresented: string;
  cooperationModality: string;   // Partner Origin
  derivedCategory: string;       // Partner Classification
}

interface GroupData {
  id: string;
  name: string;
  description: string;
  type: 'predefined' | 'custom';
  organizations: OrganizationMetrics[];
  totalOrganizations: number;
  totalAmount: number;
  totalActiveProjects: number;
  logo?: string;
}

// IATI type code to group mapping
const IATI_TYPE_TO_GROUP: Record<string, string> = {
  '10': 'bilateral',     // Government
  '11': 'bilateral',     // Local Government
  '15': 'bilateral',     // Other Public Sector
  '21': 'other',         // International NGO
  '22': 'other',         // National NGO
  '23': 'other',         // Regional NGO
  '24': 'other',         // Partner Country based NGO
  '30': 'other',         // Public Private Partnership
  '40': 'multilateral',  // Multilateral
  '60': 'other',         // Foundation
  '70': 'other',         // Private Sector
  '71': 'other',         // Private Sector in Provider Country
  '72': 'other',         // Private Sector in Aid Recipient Country
  '73': 'other',         // Private Sector in Third Country
  '80': 'other',         // Academic, Training and Research
  '90': 'other',         // Other
};

// New group definitions based on IATI mapping
const PARTNER_GROUPS = [
  { 
    id: 'bilateral', 
    name: 'Bilateral Partners', 
    description: 'External government ministries and development agencies',
    sortOrder: 1
  },
  { 
    id: 'multilateral', 
    name: 'Multilateral Organisations', 
    description: 'International organisations with multiple member states',
    sortOrder: 2
  },
  { 
    id: 'other', 
    name: 'Other Development Partners', 
    description: 'NGOs, foundations, academic institutions, and private sector partners',
    sortOrder: 3
  }
];

// Myanmar-specific cooperation modality calculation (Partner Origin)
const deriveCooperationModality = (orgTypeCode: string, country: string): string => {
  const typeCode = orgTypeCode?.trim();
  const countryValue = country?.trim().toLowerCase();
  
  // Updated logic to work with type codes
  if (typeCode === '10' && countryValue !== 'myanmar' && countryValue !== 'global / not country-specific' && countryValue !== 'global') {
    // Government (code 10) from foreign country
    return 'External';
  } else if (
    ['22', '40'].includes(typeCode) || // Multilateral (22) or Academic/Research (40)
    countryValue === 'global / not country-specific' || countryValue === 'global'
  ) {
    return 'Multilateral';
  } else if (typeCode === '15' && countryValue === 'myanmar') {
    // NGO (code 15) based in Myanmar
    return 'Internal';
  } else if (typeCode === '23') {
    // Bilateral (code 23) - typically external
    return 'External';
  } else {
    return 'Other';
  }
}

// Derive Category based on organization type and country (Partner Classification)
const deriveCategory = (orgTypeCode: string, country: string): string => {
  const c = country?.toLowerCase()?.trim();
  const isMyanmar = c === "myanmar";
  const isGlobal = c?.includes("global");

  switch (orgTypeCode) {
    case "10": // Government
      if (isMyanmar) return "National Government";
      if (isGlobal) return "Intergovernmental / Regional Body";
      return "External Government";
    case "11":
      return isMyanmar ? "Subnational Government" : "External Subnational Government";
    case "15":
      if (isMyanmar) return "Other National Public Sector";
      if (isGlobal) return "Other Public Sector (Global)";
      return "Other External Public Sector";
    case "21": case "22": case "23": case "24":
      return isMyanmar ? "Local/Partner Country NGO" : "International/Regional NGO";
    case "30":
      return isMyanmar ? "PPP (Myanmar-based)" : (isGlobal ? "PPP (Global)" : "PPP (Foreign-based)");
    case "40":
      return "Multilateral";
    case "60":
      return isMyanmar ? "Domestic Foundation" : (isGlobal ? "Global Foundation" : "Foreign Foundation");
    case "70": case "71": case "72": case "73":
      return isMyanmar ? "Domestic Private Sector" : (isGlobal ? "Private Sector (Global)" : "Foreign Private Sector");
    case "80":
      return isMyanmar ? "Myanmar Academic Institution" : (isGlobal ? "Academic Institution (Global)" : "Foreign Academic Institution");
    case "90":
      return isMyanmar ? "Other (Myanmar)" : (isGlobal ? "Other (Global)" : "Other (External)");
    default:
      return "Uncategorised";
  }
}

// GET /api/partners/summary
export async function GET(request: NextRequest) {
  try {
    console.log('[AIMS] GET /api/partners/summary - Starting request');
    
    // Check if getSupabaseAdmin is properly initialized
    if (!getSupabaseAdmin()) {
      console.error('[AIMS] getSupabaseAdmin() is not initialized');
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }
    
    // Get search parameters
    const { searchParams } = new URL(request.url);
    const groupBy = searchParams.get('groupBy') || 'type'; // 'type' or 'custom'
    const transactionType = searchParams.get('transactionType') || 'C'; // 'C' for commitments, 'D' for disbursements
    
    console.log('[AIMS] Request parameters:', { groupBy, transactionType });

    // Fetch all organizations from Supabase Organizations table
    console.log('[AIMS] Fetching organizations from Supabase...');
    const { data: organizations, error: orgError } = await getSupabaseAdmin()
      .from('organizations')
      .select('*')
      .order('name');

    if (orgError) {
      console.error('[AIMS] Error fetching organizations:', orgError);
      return NextResponse.json(
        { error: 'Failed to fetch organizations', details: orgError.message },
        { status: 500 }
      );
    }

    console.log('[AIMS] Found organizations:', organizations?.length || 0);

    if (!organizations || organizations.length === 0) {
      console.log('[AIMS] No organizations found, returning empty result');
      return NextResponse.json({
        groups: [],
        totalOrganizations: 0,
        totalActiveProjects: 0,
        totalAmount: 0,
        lastUpdated: new Date().toISOString(),
        transactionType,
        groupBy
      });
    }

    // Fetch all activities for counting active projects
    console.log('[AIMS] Fetching activities...');
    const { data: activities, error: activitiesError } = await getSupabaseAdmin()
      .from('activities')
      .select('id, activity_status, reporting_org_id, created_by_org_name, created_by_org_acronym')
      .in('activity_status', ['2', '3']); // 2=Implementation, 3=Finalisation

    if (activitiesError) {
      console.error('[AIMS] Error fetching activities:', activitiesError);
    }

    console.log('[AIMS] Found active activities:', activities?.length || 0);
    
    // Debug: Log all activity org names to see what we're working with
    const activityOrgNames = new Set();
    activities?.forEach((activity: any) => {
      if (activity.created_by_org_name) activityOrgNames.add(activity.created_by_org_name);
      if (activity.created_by_org_acronym) activityOrgNames.add(activity.created_by_org_acronym);
    });
    console.log('[AIMS] Activity org names found:', Array.from(activityOrgNames));
    
    // Debug: Log organization names to see what we're matching against
    const orgNames = organizations?.map((org: any) => `${org.name} (${org.acronym || 'no acronym'})`);
    console.log('[AIMS] Organization names in database:', orgNames);
    
          // Debug: Show UNDP-related organizations specifically
      const undpOrgs = organizations?.filter((org: any) => 
        org.name?.toLowerCase().includes('undp') || 
        org.acronym?.toLowerCase().includes('undp') ||
        org.name?.toLowerCase().includes('united nations development')
      );
      console.log('[AIMS] UNDP-related organizations:', undpOrgs?.map((org: any) => ({
        id: org.id,
        name: org.name,
        acronym: org.acronym
      })));
      
      // Debug: Show activities with UNDP-related org names
      const undpActivities = activities?.filter((activity: any) => 
        activity.created_by_org_name?.toLowerCase().includes('undp') ||
        activity.created_by_org_acronym?.toLowerCase().includes('undp')
      );
      console.log('[AIMS] UNDP-related activities:', undpActivities?.map((activity: any) => ({
        id: activity.id,
        created_by_org_name: activity.created_by_org_name,
        created_by_org_acronym: activity.created_by_org_acronym,
        reporting_org_id: activity.reporting_org_id
      })));

    // Map frontend transaction type to IATI codes
    const transactionTypeCodes = transactionType === 'C' ? ['1', '2', '11'] : ['3', '4']; // C = Commitments (1=Incoming, 2=Outgoing, 11=Incoming Commitment), D = Disbursements (3=Disbursement, 4=Expenditure)
    
    // Fetch all transactions for financial calculations
    console.log('[AIMS] Fetching transactions with type codes:', transactionTypeCodes);
    const { data: transactions, error: transactionsError } = await getSupabaseAdmin()
      .from('transactions')
      .select('activity_id, provider_org_id, receiver_org_id, provider_org_name, receiver_org_name, value, transaction_date, value_usd, transaction_type')
      .in('transaction_type', transactionTypeCodes);

    if (transactionsError) {
      console.error('[AIMS] Error fetching transactions:', transactionsError);
    }

    console.log('[AIMS] Found transactions:', transactions?.length || 0);
    

    


    // Note: Only counting activities where organization is the reporting organization
    // No need to fetch contributors or participating organizations for this count

    // Calculate metrics for each organization using ONLY Organizations table data
    const organizationMetrics: OrganizationMetrics[] = organizations.map((org: Organization) => {
      console.log(`[AIMS] Processing org: ${org.name} (ID: ${org.id})`);
      

      
      // Count active projects where this organization is the reporting organization
      // STRICT: Only count activities directly reported by this organization
      const matchedActivities = activities?.filter((activity: any) => {
        // ONLY Method 1: Check if organization matches by UUID (reporting_org_id)
        // This is the most reliable method as it uses database relationships
        if (activity.reporting_org_id === org.id) {
          return true;
        }
        
        // No fallback methods - only count if there's a proper UUID link
        return false;
      }) || [];
      
      const activeProjects = matchedActivities.length;
      
      // Debug logging for organizations with matched activities
      if (activeProjects > 0) {
        console.log(`[AIMS] ${org.name} (${org.acronym || 'no acronym'}) matched ${activeProjects} activities:`);
        matchedActivities.forEach((activity: any) => {
          console.log(`  - Activity: ${activity.id}, created_by_org_name: "${activity.created_by_org_name}", created_by_org_acronym: "${activity.created_by_org_acronym}", reporting_org_id: "${activity.reporting_org_id}"`);
        });
      }

      // Calculate financial data by year (2022-2027)
      const financialData: Record<string, number> = {};
      const years = [2022, 2023, 2024, 2025, 2026, 2027];
      
      // Initialize all years with 0
      years.forEach(year => {
        financialData[year.toString()] = 0;
      });
      
      // Calculate yearly totals by aggregating transactions where this organization is involved
      years.forEach(year => {
        const yearTotal = (transactions || []).reduce((sum: number, trans: any) => {
          if (!trans.transaction_date) return sum;
          
          try {
            const transYear = new Date(trans.transaction_date).getFullYear();
            if (transYear !== year) return sum;
            
            // Check if this organization is involved in the transaction
            // For commitments: organization must be the provider
            // For disbursements: organization can be provider or receiver
            let isInvolved = false;
            if (transactionType === 'C') {
              // For commitments, only count if organization is the provider
              isInvolved = trans.provider_org_id === org.id || trans.provider_org_name === org.name;
            } else {
              // For disbursements, count if organization is provider or receiver
              isInvolved = trans.provider_org_id === org.id || 
                          trans.receiver_org_id === org.id ||
                          trans.provider_org_name === org.name || 
                          trans.receiver_org_name === org.name;
            }
            
            if (isInvolved) {
              // Use USD value if available, otherwise use original value
              const transValue = trans.value_usd || trans.value;
              const amount = (typeof transValue === 'number' && !isNaN(transValue)) ? transValue : 0;
              return sum + amount;
            }
            
            return sum;
          } catch (dateError) {
            console.warn('[AIMS] Invalid transaction date:', trans.transaction_date);
            return sum;
          }
        }, 0);
        
        financialData[year.toString()] = yearTotal;
      });

      // Calculate total financial amount
      const totalAmount = Object.values(financialData).reduce((sum, val) => {
        const amount = (typeof val === 'number' && !isNaN(val)) ? val : 0;
        return sum + amount;
      }, 0);

      // Get the organization type and country for derived fields
      const orgType = org.organisation_type || org.type || '';
      const country = org.country_represented || org.country || '';

      // Map to expected output format using actual Supabase fields
      return {
        ...org,                                                    // Include all original Supabase fields
        activeProjects,
        totalAmount,
        financialData,
        // Computed display fields
        fullName: org.name,                                          // Use name
        acronym: org.acronym,                                        // Use acronym
        organisationType: orgType,                                   // Use organisation_type if available
        countryRepresented: country,                                 // Use country_represented if available
        cooperationModality: deriveCooperationModality(orgType, country),  // Partner Origin
        derivedCategory: deriveCategory(orgType, country)               // Partner Classification
      };
    });

    console.log('[AIMS] Calculated metrics for', organizationMetrics.length, 'organizations');

    // Group organizations based on groupBy parameter
    let groupedData: GroupData[];
    
    if (groupBy === 'custom') {
      // Fetch custom groups and their member organizations
      console.log('[AIMS] Custom grouping requested - fetching custom groups');
      
      try {
        // Fetch custom groups
        const { data: customGroups, error: customGroupsError } = await getSupabaseAdmin()
          .from('custom_groups')
          .select('*')
          .order('name');

        if (customGroupsError) {
          console.error('[AIMS] Error fetching custom groups:', customGroupsError);
          groupedData = [];
        } else {
          console.log('[AIMS] Found custom groups:', customGroups?.length || 0);

          // Fetch memberships for all custom groups
          const { data: memberships, error: membershipsError } = await getSupabaseAdmin()
            .from('custom_group_memberships')
            .select('group_id, organization_id');

          if (membershipsError) {
            console.error('[AIMS] Error fetching group memberships:', membershipsError);
            groupedData = [];
          } else {
            // Map custom groups to the GroupData format
            groupedData = (customGroups || []).map((group: any) => {
              // Get organization IDs that belong to this group
              const groupOrgIds = (memberships || [])
                .filter(m => m.group_id === group.id)
                .map(m => m.organization_id);

              // Get the actual organization metrics for this group
              const groupOrganizations = organizationMetrics.filter(org => 
                groupOrgIds.includes(org.id)
              );

              return {
                id: group.id,
                name: group.name,
                description: group.description || `Custom group: ${group.name}`,
                type: 'custom' as const,
                organizations: groupOrganizations,
                totalOrganizations: groupOrganizations.length,
                totalAmount: groupOrganizations.reduce((sum, org) => {
                  const amount = (typeof org.totalAmount === 'number' && !isNaN(org.totalAmount)) ? org.totalAmount : 0;
                  return sum + amount;
                }, 0),
                totalActiveProjects: groupOrganizations.reduce((sum, org) => {
                  const projects = (typeof org.activeProjects === 'number' && !isNaN(org.activeProjects)) ? org.activeProjects : 0;
                  return sum + projects;
                }, 0),
                logo: group.logo
              };
            });
          }
        }
      } catch (error) {
        console.error('[AIMS] Error in custom groups processing:', error);
        groupedData = [];
      }
    } else {
      // Group by IATI-based categories
      console.log('[AIMS] Grouping by IATI-based partner types');
      groupedData = PARTNER_GROUPS.map(group => {
        const groupOrganizations = organizationMetrics.filter(org => {
          // Get the organization type (prefer organisation_type over type)
          const orgType = org.organisation_type || org.type || '';
          
          // Map IATI code to group
          const mappedGroup = IATI_TYPE_TO_GROUP[orgType] || 'other';
          
          // Special filtering for bilateral partners: exclude Myanmar government organizations
          if (group.id === 'bilateral' && mappedGroup === 'bilateral') {
            const orgCountry = (org.country_represented || org.country || '').toLowerCase().trim();
            const isMyanmarGov = (orgType === '10' || orgType === '11') && orgCountry === 'myanmar';
            
            // Only include external government organizations in bilateral partners
            if (isMyanmarGov) {
              console.log(`[AIMS] Excluding Myanmar government org from bilateral: ${org.name}`);
              return false;
            }
          }
          
          // Log unmapped types for debugging
          if (!IATI_TYPE_TO_GROUP[orgType] && orgType) {
            console.log(`[AIMS] Unmapped organization type: ${orgType} for ${org.name}`);
          }
          
          return mappedGroup === group.id;
        });
        
        return {
          ...group,
          type: 'predefined' as const,
          organizations: groupOrganizations,
          totalOrganizations: groupOrganizations.length,
          totalAmount: groupOrganizations.reduce((sum, org) => {
            const amount = (typeof org.totalAmount === 'number' && !isNaN(org.totalAmount)) ? org.totalAmount : 0;
            return sum + amount;
          }, 0),
          totalActiveProjects: groupOrganizations.reduce((sum, org) => {
            const projects = (typeof org.activeProjects === 'number' && !isNaN(org.activeProjects)) ? org.activeProjects : 0;
            return sum + projects;
          }, 0)
        };
      });
    }

    // Sort groups by predefined order
    groupedData.sort((a, b) => {
      const orderA = PARTNER_GROUPS.find(g => g.id === a.id)?.sortOrder || 999;
      const orderB = PARTNER_GROUPS.find(g => g.id === b.id)?.sortOrder || 999;
      return orderA - orderB;
    });

    console.log('[AIMS] Final grouped data:', groupedData.length, 'groups');
    groupedData.forEach(group => {
      console.log(`[AIMS] Group ${group.name}: ${group.totalOrganizations} organizations`);
    });
    
    // Calculate summary statistics
    const totalOrganizations = organizationMetrics.length;
    const totalActiveProjects = organizationMetrics.reduce((sum, org) => {
      const projects = (typeof org.activeProjects === 'number' && !isNaN(org.activeProjects)) ? org.activeProjects : 0;
      return sum + projects;
    }, 0);
    const totalAmount = organizationMetrics.reduce((sum, org) => {
      const amount = (typeof org.totalAmount === 'number' && !isNaN(org.totalAmount)) ? org.totalAmount : 0;
      return sum + amount;
    }, 0);

    // Always fetch custom groups count regardless of groupBy parameter
    let customGroupsCount = 0;
    try {
      const { data: customGroups, error: customGroupsError } = await getSupabaseAdmin()
        .from('custom_groups')
        .select('id');
      
      if (!customGroupsError && customGroups) {
        customGroupsCount = customGroups.length;
      }
    } catch (error) {
      console.error('[AIMS] Error fetching custom groups count:', error);
    }

    console.log('[AIMS] Summary stats:', { totalOrganizations, totalActiveProjects, totalAmount, customGroupsCount });

    return NextResponse.json({
      groups: groupedData,
      totalOrganizations,
      totalActiveProjects,
      totalAmount,
      customGroupsCount,
      lastUpdated: new Date().toISOString(),
      transactionType,
      groupBy
    });

  } catch (error) {
    console.error('[AIMS] Unexpected error in GET /api/partners/summary:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
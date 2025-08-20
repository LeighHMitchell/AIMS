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
    description: 'National development agencies and government donors',
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
      .select('id, activity_status, created_by_org')
      .in('activity_status', ['2', '3']); // 2=Implementation, 3=Finalisation

    if (activitiesError) {
      console.error('[AIMS] Error fetching activities:', activitiesError);
    }

    console.log('[AIMS] Found active activities:', activities?.length || 0);

    // Fetch all transactions for financial calculations
    console.log('[AIMS] Fetching transactions...');
    const { data: transactions, error: transactionsError } = await getSupabaseAdmin()
      .from('transactions')
      .select('activity_id, organization_id, provider_org, receiver_org, value, transaction_date')
      .eq('transaction_type', transactionType);

    if (transactionsError) {
      console.error('[AIMS] Error fetching transactions:', transactionsError);
    }

    console.log('[AIMS] Found transactions:', transactions?.length || 0);

    // Fetch activity contributors for project counting
    console.log('[AIMS] Fetching activity contributors...');
    const { data: contributors, error: contributorsError } = await getSupabaseAdmin()
      .from('activity_contributors')
      .select('activity_id, organization_id')
      .eq('status', 'accepted');

    if (contributorsError) {
      console.error('[AIMS] Error fetching contributors:', contributorsError);
    }

    console.log('[AIMS] Found contributors:', contributors?.length || 0);

    // Calculate metrics for each organization using ONLY Organizations table data
    const organizationMetrics: OrganizationMetrics[] = organizations.map((org: Organization) => {
      console.log(`[AIMS] Processing org: ${org.name} (ID: ${org.id})`);
      
      // Count active projects where this organization is involved (by UUID reference)
      const activeProjects = activities?.filter((activity: any) => {
        // Check if organization is creator by UUID
        const isCreatedByOrg = activity.reporting_org_id === org.id;
        
        // Check if organization is contributor by UUID
        const isContributor = contributors?.some((contrib: any) => 
          contrib.organization_id === org.id && contrib.activity_id === activity.id
        );
        
        // Check if organization is in transactions (by UUID or name fallback)
        const isInTransactions = transactions?.some((trans: any) => 
          trans.activity_id === activity.id && (
            trans.organization_id === org.id ||      // UUID reference (preferred)
            trans.provider_org === org.name ||       // Name fallback
            trans.receiver_org === org.name          // Name fallback
          )
        );
        
        return isCreatedByOrg || isContributor || isInTransactions;
      }).length || 0;

      // Calculate financial data by year (2022-2027)
      const financialData: Record<string, number> = {};
      const years = [2022, 2023, 2024, 2025, 2026, 2027];
      
      // Initialize all years with 0
      years.forEach(year => {
        financialData[year.toString()] = 0;
      });
      
      // Calculate yearly totals
      years.forEach(year => {
        const yearTotal = transactions?.filter((trans: any) => {
          if (!trans.transaction_date) return false;
          
          try {
            const transYear = new Date(trans.transaction_date).getFullYear();
            const isCorrectYear = transYear === year;
            
            // Match by UUID (preferred) or name (fallback)
            const isOrgMatch = trans.organization_id === org.id ||
                              trans.provider_org === org.name || 
                              trans.receiver_org === org.name;
            
            return isCorrectYear && isOrgMatch;
          } catch (dateError) {
            console.warn('[AIMS] Invalid transaction date:', trans.transaction_date);
            return false;
          }
        }).reduce((sum: number, trans: any) => {
          const transValue = trans.value;
          const amount = (typeof transValue === 'number' && !isNaN(transValue)) ? transValue : 0;
          return sum + amount;
        }, 0) || 0;
        
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
      // For now, return empty custom groups - this would be enhanced later
      // when organization_groups table is properly implemented
      console.log('[AIMS] Custom grouping requested - returning empty groups');
      groupedData = [];
    } else {
      // Group by IATI-based categories
      console.log('[AIMS] Grouping by IATI-based partner types');
      groupedData = PARTNER_GROUPS.map(group => {
        const groupOrganizations = organizationMetrics.filter(org => {
          // Get the organization type (prefer organisation_type over type)
          const orgType = org.organisation_type || org.type || '';
          
          // Map IATI code to group
          const mappedGroup = IATI_TYPE_TO_GROUP[orgType] || 'other';
          
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

    console.log('[AIMS] Summary stats:', { totalOrganizations, totalActiveProjects, totalAmount });

    return NextResponse.json({
      groups: groupedData,
      totalOrganizations,
      totalActiveProjects,
      totalAmount,
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
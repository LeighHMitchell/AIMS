import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// Helper function to derive organization category
function deriveCategory(organisationType: string, countryRepresented: string): string {
  const type = organisationType?.toLowerCase() || '';
  const country = countryRepresented?.toLowerCase() || '';
  
  // Check for global/regional organizations first
  if (country.includes('global') || country.includes('regional')) {
    if (type.includes('multilateral') || type.includes('international')) {
      return 'Multilateral';
    }
    return 'International NGO';
  }
  
  // Map organization types to categories
  switch (type) {
    case 'government':
    case 'gov':
      return 'Government';
    case 'multilateral':
    case 'international':
      return 'Multilateral';
    case 'bilateral':
      return 'Bilateral';
    case 'ngo':
    case 'civil society':
    case 'civil_society':
      return 'Civil Society';
    case 'private':
    case 'private_sector':
      return 'Private Sector';
    case 'academic':
    case 'research':
      return 'Academic/Research';
    case 'foundation':
      return 'Foundation';
    default:
      return 'Other';
  }
}

export async function GET(request: NextRequest) {
  console.log('[AIMS] GET /api/organizations/bulk-stats - Starting bulk statistics request');
  
  try {
    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '1000', 10), 2000); // Increased default to 1000, cap at 2000
    const offset = (page - 1) * limit;
    
    // Add caching headers to reduce repeated requests
    const headers = {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120', // 1 minute cache (reduced from 5 min)
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Check if getSupabaseAdmin() is properly initialized
    if (!getSupabaseAdmin()) {
      console.error('[AIMS] getSupabaseAdmin() is not initialized');
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500, headers }
      );
    }
    
    // Fetch organizations with pagination and all related data in parallel for maximum efficiency
    const [orgsResult, activitiesResult, contributorsResult, countResult] = await Promise.all([
      // Get organizations with pagination
      getSupabaseAdmin()
        .from('organizations')
        .select('id, name, acronym, type, Organisation_Type_Code, Organisation_Type_Name, country, logo, banner, description, website, email, phone, address, country_represented, cooperation_modality, iati_org_id, created_at, updated_at')
        .order('name')
        .range(offset, offset + limit - 1),
      
      // Get all activities with reporting org info (no pagination needed for counting)
      getSupabaseAdmin()
        .from('activities')
        .select('id, reporting_org_id, activity_status')
        .not('reporting_org_id', 'is', null),
        
      // Get all activity contributors to count participating organizations
      getSupabaseAdmin()
        .from('activity_contributors')
        .select('organization_id, activity_id, contribution_type')
        .in('contribution_type', ['funder', 'implementer', 'funding', 'implementing']),
        
      // Get total count for pagination metadata
      getSupabaseAdmin()
        .from('organizations')
        .select('id', { count: 'exact', head: true })
    ]);

    const { data: organizations, error: orgsError } = orgsResult;
    const { data: activities, error: activitiesError } = activitiesResult;
    const { data: contributors, error: contributorsError } = contributorsResult;
    const { count: totalCount, error: countError } = countResult;
    
    if (orgsError) {
      console.error('[AIMS] Error fetching organizations:', orgsError);
      return NextResponse.json(
        { error: orgsError.message },
        { status: 500, headers }
      );
    }

    if (!organizations || organizations.length === 0) {
      console.log('[AIMS] No organizations found');
      return NextResponse.json({
        data: [],
        pagination: {
          page,
          limit,
          totalCount: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit),
          hasMore: false
        }
      }, { headers });
    }

    console.log(`[AIMS] Processing ${organizations.length} organizations with bulk statistics`);

    // Create maps for efficient lookups
    const reportingOrgActivityCount = new Map<string, number>();
    const contributingOrgActivityCount = new Map<string, number>();

    // Count activities where organization is the reporting organization
    if (activities && !activitiesError) {
      activities.forEach((activity: any) => {
        const orgId = activity.reporting_org_id;
        if (orgId) {
          reportingOrgActivityCount.set(orgId, (reportingOrgActivityCount.get(orgId) || 0) + 1);
        }
      });
    }

    // Count activities where organization is a contributor
    if (contributors && !contributorsError) {
      // Group contributors by activity to avoid double counting
      const activityContributors = new Map<string, Set<string>>();
      contributors.forEach((contributor: any) => {
        const activityId = contributor.activity_id;
        const orgId = contributor.organization_id;
        if (activityId && orgId) {
          if (!activityContributors.has(activityId)) {
            activityContributors.set(activityId, new Set());
          }
          activityContributors.get(activityId)!.add(orgId);
        }
      });

      // Count unique activities per organization
      activityContributors.forEach((orgIds, activityId) => {
        orgIds.forEach(orgId => {
          contributingOrgActivityCount.set(orgId, (contributingOrgActivityCount.get(orgId) || 0) + 1);
        });
      });
    }

    // Process all organizations with calculated statistics
    const enhancedOrganizations = organizations.map((org: any) => {
      const reportingCount = reportingOrgActivityCount.get(org.id) || 0;
      const contributingCount = contributingOrgActivityCount.get(org.id) || 0;
      
      // Total active projects (avoid double counting if org is both reporting and contributing to same activity)
      const totalActiveProjects = Math.max(reportingCount, contributingCount);

      return {
        ...org,
        // Ensure we use the correct Organisation_Type_Code field
        Organisation_Type_Code: org.Organisation_Type_Code || org.type,
        activeProjects: totalActiveProjects,
        totalBudgeted: 0, // TODO: Implement financial calculations efficiently
        totalDisbursed: 0, // TODO: Implement financial calculations efficiently
        displayName: org.name && org.acronym ? `${org.name} (${org.acronym})` : org.name,
        derived_category: deriveCategory(org.Organisation_Type_Code || org.type, org.country_represented || org.country || ''),
        // Initialize project status breakdown with active count
        projectsByStatus: { 
          active: totalActiveProjects, 
          pipeline: 0, 
          completed: 0, 
          cancelled: 0 
        },
        lastProjectActivity: org.updated_at,
        totalDisbursement: 0
      };
    });

    console.log(`[AIMS] Successfully processed ${enhancedOrganizations.length} organizations with bulk statistics`);
    
    // Return paginated response with metadata
    const totalPages = Math.ceil((totalCount || 0) / limit);
    const hasMore = page < totalPages;
    
    return NextResponse.json({
      data: enhancedOrganizations,
      pagination: {
        page,
        limit,
        totalCount: totalCount || 0,
        totalPages,
        hasMore
      }
    }, { headers });
    
  } catch (error) {
    console.error('[AIMS] Error in bulk statistics endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization statistics' },
      { status: 500 }
    );
  }
}

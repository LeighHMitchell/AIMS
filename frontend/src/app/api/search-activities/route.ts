import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper function to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Helper function to clean search query
function cleanSearchQuery(query: string): string {
  return query.trim().replace(/[%_]/g, '\\$&'); // Escape special characters
}

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Get search parameter from query string
    const searchQuery = request.nextUrl.searchParams.get('q');
    const excludeId = request.nextUrl.searchParams.get('exclude');
    
    if (!searchQuery || searchQuery.trim().length < 2) {
      return NextResponse.json([]);
    }
    
    const cleanQuery = cleanSearchQuery(searchQuery);
    console.log('[AIMS] Searching activities with query:', cleanQuery);
    
    // Build the query for live search - return minimal fields for performance
    let query = supabase
      .from('activities')
      .select(`
        id,
        title_narrative,
        iati_identifier,
        other_identifier,
        activity_status,
        publication_status,
        description_narrative,
        created_at,
        icon
      `);
    
    // Build search conditions for comprehensive search
    const searchConditions = [];
    
    // Search by exact ID if the search query is a valid UUID
    if (isValidUUID(cleanQuery)) {
      searchConditions.push(`id.eq.${cleanQuery}`);
    }
    
    // Search across multiple fields (case-insensitive)
    const searchFields = [
      `iati_identifier.ilike.%${cleanQuery}%`,
      `other_identifier.ilike.%${cleanQuery}%`,
      `title_narrative.ilike.%${cleanQuery}%`,
      `description_narrative.ilike.%${cleanQuery}%`
    ];
    
    // Add all search fields to conditions
    searchConditions.push(...searchFields);
    
    // Also try to match if the query is part of a UUID (partial UUID search)
    if (cleanQuery.length >= 4 && /^[0-9a-f-]+$/i.test(cleanQuery)) {
      searchConditions.push(`id::text.ilike.%${cleanQuery}%`);
    }
    
    // Apply the OR condition for all search criteria
    if (searchConditions.length > 0) {
      query = query.or(searchConditions.join(','));
    }
    
    // Exclude specific activity if provided (to avoid self-linking)
    if (excludeId && isValidUUID(excludeId)) {
      query = query.neq('id', excludeId);
    }
    
    // Order by relevance: exact matches first, then by creation date
    query = query.order('created_at', { ascending: false });
    
    // Limit results for performance
    query = query.limit(20); // Increased from 10 to show more results
    
    // Execute the query
    const { data: activities, error } = await query;

    if (error) {
      console.error('[AIMS] Error searching activities:', error);
      return NextResponse.json(
        { error: 'Failed to search activities', details: error.message },
        { status: 500 }
      );
    }

    // Transform the data to match expected format and add relevance scoring
    const transformedActivities = (activities || []).map((activity: any) => {
      // Calculate a basic relevance score
      let relevanceScore = 0;
      const lowerQuery = cleanQuery.toLowerCase();
      
      // Exact ID match gets highest score
      if (activity.id.toLowerCase() === lowerQuery) relevanceScore += 100;
      
      // IATI ID exact match
      if (activity.iati_identifier?.toLowerCase() === lowerQuery) relevanceScore += 90;
      
      // Title exact match
      if (activity.title_narrative?.toLowerCase() === lowerQuery) relevanceScore += 80;
      
      // Partial matches
      if (activity.iati_identifier?.toLowerCase().includes(lowerQuery)) relevanceScore += 40;
      if (activity.title_narrative?.toLowerCase().includes(lowerQuery)) relevanceScore += 30;
      if (activity.other_identifier?.toLowerCase().includes(lowerQuery)) relevanceScore += 20;
      if (activity.description_narrative?.toLowerCase().includes(lowerQuery)) relevanceScore += 10;
      
      return {
        id: activity.id,
        title: activity.title_narrative || 'Untitled Activity',
        iati_id: activity.iati_identifier || '',
        partner_id: activity.other_identifier || '',
        activity_status: activity.activity_status || 'unknown',
        publication_status: activity.publication_status || 'draft',
        description: activity.description_narrative || '',
        icon: activity.icon || null,
        relevanceScore
      };
    });
    
    // Sort by relevance score
    transformedActivities.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);

    console.log(`[AIMS] Found ${transformedActivities.length} activities matching search`);

    const response = NextResponse.json(transformedActivities);
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error) {
    console.error('[AIMS] Error in search-activities endpoint:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to search activities',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
} 
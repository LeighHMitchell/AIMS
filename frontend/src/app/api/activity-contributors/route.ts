import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function GET(request: NextRequest) {
  console.log('[AIMS] GET /api/activity-contributors - Starting request');
  
  try {
    // Check if getSupabaseAdmin is properly initialized
    if (!getSupabaseAdmin()) {
      console.error('[AIMS] getSupabaseAdmin() is not initialized');
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    // Fetch all activity contributors
    const { data: contributors, error } = await getSupabaseAdmin()
      .from('activity_contributors')
      .select('*');

    if (error) {
      console.error('[AIMS] Error fetching activity contributors:', error);
      
      // Return empty array if table doesn't exist
      if (error.code === '42P01') {
        console.log('[AIMS] activity_contributors table does not exist, returning empty array');
        return NextResponse.json([]);
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[AIMS] Fetched activity contributors count:', contributors?.length || 0);
    
    const response = NextResponse.json(contributors || []);
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
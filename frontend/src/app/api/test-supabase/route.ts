import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('[AIMS] Testing Supabase connection...');
  
  try {
    // Test environment variables
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('[AIMS] Environment check:', { hasUrl, hasAnonKey, hasServiceKey });
    
    if (!hasUrl || !hasAnonKey || !hasServiceKey) {
      return NextResponse.json({
        status: 'error',
        message: 'Missing environment variables',
        details: { hasUrl, hasAnonKey, hasServiceKey }
      }, { status: 500 });
    }
    
    // Test if getSupabaseAdmin client exists
    if (!getSupabaseAdmin()) {
      return NextResponse.json({
        status: 'error',
        message: 'Supabase admin client not initialized'
      }, { status: 500 });
    }
    
    console.log('[AIMS] Supabase admin client exists, testing connection...');
    
    // Test a simple query to activities table
    const { data: activities, error: activitiesError } = await getSupabaseAdmin()
      .from('activities')
      .select('id, title_narrative')
      .limit(1);
    
    if (activitiesError) {
      console.error('[AIMS] Activities table error:', activitiesError);
      return NextResponse.json({
        status: 'error',
        message: 'Failed to query activities table',
        details: activitiesError
      }, { status: 500 });
    }
    
    // Test organizations table
    const { data: organizations, error: orgsError } = await getSupabaseAdmin()
      .from('organizations')
      .select('id, name')
      .limit(1);
    
    if (orgsError) {
      console.error('[AIMS] Organizations table error:', orgsError);
      return NextResponse.json({
        status: 'error',
        message: 'Failed to query organizations table',
        details: orgsError
      }, { status: 500 });
    }
    
    console.log('[AIMS] Supabase connection test successful!');
    
    return NextResponse.json({
      status: 'success',
      message: 'Supabase connection working',
      data: {
        activitiesCount: activities?.length || 0,
        organizationsCount: organizations?.length || 0,
        sampleActivity: activities?.[0] || null,
        sampleOrganization: organizations?.[0] || null
      }
    });
    
  } catch (error) {
    console.error('[AIMS] Supabase connection test failed:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
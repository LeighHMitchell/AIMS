import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  console.log('[TEST-DB] Starting database connection test');
  
  // Basic environment check
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  
  console.log('[TEST-DB] Environment variables:', envCheck);
  
  if (!getSupabaseAdmin()) {
    console.error('[TEST-DB] getSupabaseAdmin() is null or undefined');
    return NextResponse.json({
      success: false,
      error: 'Supabase admin client not initialized',
      env: envCheck
    }, { status: 500 });
  }
  
  try {
    console.log('[TEST-DB] Attempting to query activities table...');
    
    // Simple query to test connection
    const { data, error } = await getSupabaseAdmin()
      .from('activities')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('[TEST-DB] Database query error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
        env: envCheck
      }, { status: 500 });
    }
    
    console.log('[TEST-DB] Successfully connected to database');
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      activitiesCount: data?.length || 0,
      env: envCheck
    });
    
  } catch (error) {
    console.error('[TEST-DB] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      env: envCheck
    }, { status: 500 });
  }
}
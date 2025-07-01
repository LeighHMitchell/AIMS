import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[DEBUG-SIMPLE] Starting debug...');
    
    // Check environment variables
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      NODE_ENV: process.env.NODE_ENV
    };
    
    console.log('[DEBUG-SIMPLE] Environment variables:', {
      NEXT_PUBLIC_SUPABASE_URL: envVars.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
      SUPABASE_SERVICE_ROLE_KEY: envVars.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing',
      NODE_ENV: envVars.NODE_ENV
    });
    
    if (!envVars.NEXT_PUBLIC_SUPABASE_URL || !envVars.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({
        error: 'Missing environment variables',
        env: envVars,
        message: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing'
      }, { status: 500 });
    }
    
    // Try to import the Supabase library
    const { createClient } = await import('@supabase/supabase-js');
    console.log('[DEBUG-SIMPLE] Supabase library imported successfully');
    
    // Try to create a client
    console.log('[DEBUG-SIMPLE] Creating Supabase client...');
    const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    console.log('[DEBUG-SIMPLE] Supabase client created successfully');
    
    // Try a simple query
    console.log('[DEBUG-SIMPLE] Testing database connection...');
    const { data, error } = await supabase
      .from('activities')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('[DEBUG-SIMPLE] Database error:', error);
      return NextResponse.json({
        error: 'Database query failed',
        details: error,
        env: {
          NEXT_PUBLIC_SUPABASE_URL: !!envVars.NEXT_PUBLIC_SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: !!envVars.SUPABASE_SERVICE_ROLE_KEY
        }
      }, { status: 500 });
    }
    
    console.log('[DEBUG-SIMPLE] Database connection successful!', data);
    
    return NextResponse.json({
      success: true,
      message: 'All systems working',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: !!envVars.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!envVars.SUPABASE_SERVICE_ROLE_KEY,
        NODE_ENV: envVars.NODE_ENV
      },
      data: data
    });
    
  } catch (error) {
    console.error('[DEBUG-SIMPLE] Unexpected error:', error);
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error
    }, { status: 500 });
  }
}
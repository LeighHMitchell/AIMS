import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const timestamp = new Date().toISOString();
    const buildId = process.env.BUILD_ID || 'unknown';
    const nodeEnv = process.env.NODE_ENV || 'unknown';
    
    // Basic environment check
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp,
      buildId,
      environment: nodeEnv,
      version: '1.0.0',
      config: {
        supabaseUrl: hasSupabaseUrl ? 'configured' : 'missing',
        supabaseKey: hasSupabaseKey ? 'configured' : 'missing',
        serviceKey: hasServiceKey ? 'configured' : 'missing',
      },
      uptime: process.uptime(),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}

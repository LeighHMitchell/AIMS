import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  console.log('[DEBUG] Starting activities debug endpoint');
  
  try {
    // Use the centralized Supabase client
    console.log('[DEBUG] Getting Supabase client...');
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json({
        error: 'Failed to initialize Supabase client',
        details: 'getSupabaseAdmin() returned null'
      }, { status: 500 });
    }
    
    console.log('[DEBUG] Querying activities table...');
    const { data, error } = await supabase
      .from('activities')
      .select(`
        id,
        partner_id,
        iati_id,
        title,
        description,
        activity_status,
        publication_status,
        submission_status,
        created_at,
        updated_at
      `)
      .limit(5);
    
    if (error) {
      console.error('[DEBUG] Database error:', error);
      return NextResponse.json({
        error: 'Database query failed',
        details: error
      }, { status: 500 });
    }
    
    console.log('[DEBUG] Successfully fetched activities:', data?.length || 0);
    
    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      activities: data || [],
      message: 'Debug activities endpoint working'
    });
    
  } catch (error) {
    console.error('[DEBUG] Unexpected error:', error);
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Waitlist] Missing Supabase configuration');
      return NextResponse.json(
        { error: 'Service not configured' },
        { status: 500 }
      );
    }

    // Create Supabase client with service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get optional metadata
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Insert into waitlist_signups table
    const { data, error } = await supabase
      .from('waitlist_signups')
      .insert({
        email: email.toLowerCase().trim(),
        ip_address: ip,
        user_agent: userAgent,
        source: 'landing_page'
      })
      .select()
      .single();

    if (error) {
      // Check for duplicate email
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This email is already on the waitlist' },
          { status: 409 }
        );
      }

      console.error('[Waitlist] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to join waitlist' },
        { status: 500 }
      );
    }

    console.log('[Waitlist] New signup:', email);

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the waitlist'
    });

  } catch (error) {
    console.error('[Waitlist] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

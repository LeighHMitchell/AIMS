import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    console.log('[AIMS Rolodex Stats] Fetching contact type statistics');
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    // Direct approach - get counts from each table
    console.log('[AIMS Rolodex Stats] Using direct table queries...');
    
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('email', 'is', null)
      .neq('email', '');

    const { count: contactsCount } = await supabase
      .from('activity_contacts')
      .select('*', { count: 'exact', head: true })
      .or('not.email.is.null,not.first_name.is.null');

    const stats = [
      { contact_type: 'user', count: usersCount || 0 },
      { contact_type: 'activity_contact', count: contactsCount || 0 }
    ];

    const total = (usersCount || 0) + (contactsCount || 0);

    console.log(`[AIMS Rolodex Stats] Successfully fetched stats:`, stats);

    return NextResponse.json({
      stats,
      total,
      source: 'direct_queries'
    });

  } catch (error) {
    console.error('[AIMS Rolodex Stats] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch rolodex statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

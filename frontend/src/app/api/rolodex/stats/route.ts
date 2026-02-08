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

    // Fetch contact emails and names to compute deduplicated count
    const { data: contactRows } = await supabase
      .from('activity_contacts')
      .select('email, first_name, last_name')
      .or('not.email.is.null,not.first_name.is.null');

    // Deduplicate by email (primary) or first+last name (secondary)
    let dedupedContactCount = 0;
    if (contactRows) {
      const seen = new Set<string>();
      for (const c of contactRows) {
        let key: string;
        if (c.email && c.email.trim()) {
          key = `email:${c.email.trim().toLowerCase()}`;
        } else if (c.first_name?.trim() && c.last_name?.trim()) {
          key = `name:${c.first_name.trim().toLowerCase()}_${c.last_name.trim().toLowerCase()}`;
        } else {
          key = `row:${dedupedContactCount}_${Math.random()}`; // unique, no dedup
        }
        seen.add(key);
      }
      dedupedContactCount = seen.size;
    }

    const stats = [
      { contact_type: 'user', count: usersCount || 0 },
      { contact_type: 'activity_contact', count: dedupedContactCount }
    ];

    const total = (usersCount || 0) + dedupedContactCount;

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

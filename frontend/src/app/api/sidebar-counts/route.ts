import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json(
      { error: 'Database connection failed' },
      { status: 500 }
    );
  }

  try {
    const [activities, transactions, plannedDisbursements, budgets, organizations, rolodexUsers, rolodexContacts] = await Promise.all([
      supabase.from('activities').select('*', { count: 'exact', head: true }),
      supabase.from('transactions').select('*', { count: 'exact', head: true }),
      supabase.from('planned_disbursements').select('*', { count: 'exact', head: true }),
      supabase.from('activity_budgets').select('*', { count: 'exact', head: true }),
      supabase.from('organizations').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).not('email', 'is', null).neq('email', ''),
      supabase.from('activity_contacts').select('*', { count: 'exact', head: true }),
    ]);

    return NextResponse.json({
      activities: activities.count ?? 0,
      transactions: transactions.count ?? 0,
      plannedDisbursements: plannedDisbursements.count ?? 0,
      budgets: budgets.count ?? 0,
      organizations: organizations.count ?? 0,
      rolodex: (rolodexUsers.count ?? 0) + (rolodexContacts.count ?? 0),
    });
  } catch (error) {
    console.error('[Sidebar Counts] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch counts' },
      { status: 500 }
    );
  }
}

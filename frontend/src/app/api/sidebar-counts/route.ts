import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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
    const [activities, transactions, plannedDisbursements, budgets, organizations, rolodexUsers, rolodexContacts, activityDocs, transactionDocs, orgDocs, resultDocs, indicatorDocs, standaloneDocs, faqs] = await Promise.all([
      supabase.from('activities').select('*', { count: 'exact', head: true }),
      supabase.from('transactions').select('*', { count: 'exact', head: true }),
      supabase.from('planned_disbursements').select('*', { count: 'exact', head: true }),
      supabase.from('activity_budgets').select('*', { count: 'exact', head: true }),
      supabase.from('organizations').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).not('email', 'is', null).neq('email', ''),
      supabase.from('contacts').select('*', { count: 'exact', head: true }),
      supabase.from('activity_documents').select('*', { count: 'exact', head: true }),
      supabase.from('transaction_documents').select('*', { count: 'exact', head: true }),
      supabase.from('organization_document_links').select('*', { count: 'exact', head: true }),
      supabase.from('result_document_links').select('*', { count: 'exact', head: true }),
      supabase.from('indicator_document_links').select('*', { count: 'exact', head: true }),
      supabase.from('library_documents').select('*', { count: 'exact', head: true }),
      supabase.from('faq').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    ]);

    return NextResponse.json({
      activities: activities.count ?? 0,
      transactions: transactions.count ?? 0,
      plannedDisbursements: plannedDisbursements.count ?? 0,
      budgets: budgets.count ?? 0,
      organizations: organizations.count ?? 0,
      rolodex: (rolodexUsers.count ?? 0) + (rolodexContacts.count ?? 0),
      documents: (activityDocs.count ?? 0) + (transactionDocs.count ?? 0) + (orgDocs.count ?? 0) + (resultDocs.count ?? 0) + (indicatorDocs.count ?? 0) + (standaloneDocs.count ?? 0),
      faqs: faqs.count ?? 0,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[Sidebar Counts] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch counts' },
      { status: 500 }
    );
  }
}

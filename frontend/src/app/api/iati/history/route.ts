import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Fetch import history with user details
    const { data: history, error } = await getSupabaseAdmin()
      .from('iati_import_history')
      .select(`
        id,
        user_id,
        timestamp,
        activities_count,
        organizations_count,
        transactions_count,
        errors_count,
        status,
        file_name,
        users!inner(id, first_name, last_name, name)
      `)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching import history:', error);
      return NextResponse.json({ error: 'Failed to fetch import history' }, { status: 500 });
    }

    // Transform the data for the frontend
    const transformedHistory = (history || []).map((record: any) => {
      // Check if rollback is allowed (within 1 hour)
      const importTime = new Date(record.timestamp);
      const now = new Date();
      const hoursSinceImport = (now.getTime() - importTime.getTime()) / (1000 * 60 * 60);
      const canRollback = hoursSinceImport <= 1 && record.status === 'completed';

      return {
        id: record.id,
        fileName: record.file_name || 'Unknown file',
        userName: record.users ? `${record.users.first_name || ''} ${record.users.last_name || ''}`.trim() || record.users.name || 'Unknown user' : 'Unknown user',
        timestamp: record.timestamp,
        activitiesCount: record.activities_count,
        organizationsCount: record.organizations_count,
        transactionsCount: record.transactions_count,
        errorsCount: record.errors_count,
        status: record.status,
        canRollback
      };
    });

    return NextResponse.json(transformedHistory);
  } catch (error) {
    console.error('IATI history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch import history', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
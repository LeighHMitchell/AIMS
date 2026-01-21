import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Health check endpoint - intentionally public for monitoring
export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'checking',
    database: {
      connected: false,
      error: null as string | null
    },
    tables: {
      activities: { exists: false, count: 0, error: null as string | null },
      transactions: { exists: false, count: 0, error: null as string | null },
      activity_sectors: { exists: false, count: 0, error: null as string | null },
      activity_contacts: { exists: false, count: 0, error: null as string | null },
      organizations: { exists: false, count: 0, error: null as string | null },
      users: { exists: false, count: 0, error: null as string | null }
    },
    environment: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing'
    }
  };

  try {
    const supabase = getSupabaseAdmin();
    
    // Test database connection
    if (!supabase) {
      checks.database.error = 'Supabase admin client not initialized';
      checks.status = 'error';
      return NextResponse.json(checks, { status: 500 });
    }

    // Simple connection test
    const { error: connError } = await supabase.from('activities').select('id').limit(1);
    if (connError) {
      checks.database.error = connError.message;
      checks.status = 'error';
      return NextResponse.json(checks, { status: 500 });
    }
    
    checks.database.connected = true;

    // Check each table
    const tables = ['activities', 'transactions', 'activity_sectors', 'activity_contacts', 'organizations', 'users'] as const;
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          checks.tables[table].error = error.message;
        } else {
          checks.tables[table].exists = true;
          checks.tables[table].count = count || 0;
        }
      } catch (e) {
        checks.tables[table].error = e instanceof Error ? e.message : 'Unknown error';
      }
    }

    // Determine overall status
    const allTablesOk = Object.values(checks.tables).every(t => t.exists && !t.error);
    checks.status = checks.database.connected && allTablesOk ? 'healthy' : 'degraded';

    return NextResponse.json(checks, { 
      status: checks.status === 'healthy' ? 200 : 503 
    });
  } catch (error) {
    checks.database.error = error instanceof Error ? error.message : 'Unknown error';
    checks.status = 'error';
    return NextResponse.json(checks, { status: 500 });
  }
}

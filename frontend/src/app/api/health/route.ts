import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

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
    // Test database connection
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      checks.database.error = 'Supabase admin client not initialized';
      checks.status = 'error';
      return NextResponse.json(checks, { status: 500 });
    }

    // Check each table
    for (const tableName of Object.keys(checks.tables)) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          checks.tables[tableName as keyof typeof checks.tables].error = error.message;
        } else {
          checks.tables[tableName as keyof typeof checks.tables].exists = true;
          checks.tables[tableName as keyof typeof checks.tables].count = count || 0;
        }
      } catch (e) {
        checks.tables[tableName as keyof typeof checks.tables].error = 
          e instanceof Error ? e.message : 'Unknown error';
      }
    }

    // Check RLS status
    try {
      const { data: rlsData } = await supabase.rpc('check_rls_enabled', {
        table_names: ['activities', 'transactions']
      }).select();
      
      if (rlsData) {
        checks.database.connected = true;
      }
    } catch (e) {
      // RPC might not exist, but if we got here, DB is connected
      checks.database.connected = true;
    }

    // Determine overall status
    const hasErrors = Object.values(checks.tables).some(t => t.error !== null);
    checks.status = hasErrors ? 'degraded' : 'healthy';

    return NextResponse.json(checks);
  } catch (error) {
    checks.status = 'error';
    checks.database.error = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(checks, { status: 500 });
  }
} 
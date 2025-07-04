import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const results: any = {
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    // 1. Check activities table
    const { count: activityCount, error: activityCountError } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true });

    results.checks.activities = {
      count: activityCount || 0,
      error: activityCountError?.message || null
    };

    // 2. Try to query each IATI field individually
    const activityFields = ['default_aid_type', 'default_finance_type', 'default_flow_type', 'tied_status'];
    results.checks.activityFields = {};

    for (const field of activityFields) {
      try {
        const { data, error } = await supabase
          .from('activities')
          .select(`id, ${field}`)
          .limit(1);
        
        results.checks.activityFields[field] = {
          exists: !error,
          error: error?.message || null,
          sampleValue: data?.[0]?.[field] || null
        };
      } catch (e) {
        results.checks.activityFields[field] = {
          exists: false,
          error: e instanceof Error ? e.message : 'Unknown error'
        };
      }
    }

    // 3. Check transactions table
    const { count: transactionCount, error: transactionCountError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    results.checks.transactions = {
      count: transactionCount || 0,
      error: transactionCountError?.message || null
    };

    // 4. Check transaction fields
    const transactionFields = ['finance_type', 'aid_type', 'flow_type'];
    results.checks.transactionFields = {};

    for (const field of transactionFields) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select(`uuid, ${field}`)
          .limit(1);
        
        results.checks.transactionFields[field] = {
          exists: !error,
          error: error?.message || null,
          sampleValue: data?.[0]?.[field] || null
        };
      } catch (e) {
        results.checks.transactionFields[field] = {
          exists: false,
          error: e instanceof Error ? e.message : 'Unknown error'
        };
      }
    }

    // 5. Check organizations table
    const { count: orgCount, error: orgCountError } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });

    results.checks.organizations = {
      count: orgCount || 0,
      error: orgCountError?.message || null
    };

    // 6. Check organization fields
    const orgFields = ['identifier', 'acronym', 'default_currency', 'total_budget', 'recipient_org_budget'];
    results.checks.organizationFields = {};

    for (const field of orgFields) {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select(`id, ${field}`)
          .limit(1);
        
        results.checks.organizationFields[field] = {
          exists: !error,
          error: error?.message || null,
          sampleValue: data?.[0]?.[field] || null
        };
      } catch (e) {
        results.checks.organizationFields[field] = {
          exists: false,
          error: e instanceof Error ? e.message : 'Unknown error'
        };
      }
    }

    // 7. Check change_log table
    const { count: changeLogCount, error: changeLogError } = await supabase
      .from('change_log')
      .select('*', { count: 'exact', head: true });

    results.checks.changeLog = {
      exists: !changeLogError,
      count: changeLogCount || 0,
      error: changeLogError?.message || null
    };

    // 8. Summary
    results.summary = {
      allFieldsExist: 
        Object.values(results.checks.activityFields).every((f: any) => f.exists) &&
        Object.values(results.checks.transactionFields).every((f: any) => f.exists) &&
        Object.values(results.checks.organizationFields).every((f: any) => f.exists),
      migrationRequired: 
        Object.values(results.checks.activityFields).some((f: any) => !f.exists) ||
        Object.values(results.checks.transactionFields).some((f: any) => !f.exists) ||
        Object.values(results.checks.organizationFields).some((f: any) => !f.exists) ||
        !results.checks.changeLog.exists,
      recommendations: []
    };

    // Add recommendations
    if (results.summary.migrationRequired) {
      results.summary.recommendations.push('Run the migration: frontend/sql/add_data_clinic_fields.sql');
    }

    if (results.checks.activities.count === 0) {
      results.summary.recommendations.push('No activities found - create some activities first');
    }

    if (results.checks.transactions.count === 0) {
      results.summary.recommendations.push('No transactions found - add transactions to activities');
    }

    if (results.checks.organizations.count === 0) {
      results.summary.recommendations.push('No organizations found - create some organizations first');
    }

    return NextResponse.json(results, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Debug check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      results
    }, { status: 500 });
  }
} 
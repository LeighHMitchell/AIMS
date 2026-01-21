import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/iati-import-logs
 * Fetch IATI import logs with analytics for admin dashboard
 */
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const userId = searchParams.get('userId');
    const orgRef = searchParams.get('orgRef');
    const status = searchParams.get('status');
    const source = searchParams.get('source');

    // Calculate date ranges
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Build query for paginated logs
    let query = supabase
      .from('iati_import_logs')
      .select('*', { count: 'exact' })
      .order('import_date', { ascending: false });

    // Apply filters
    if (userId) {
      query = query.eq('imported_by', userId);
    }
    if (orgRef) {
      query = query.eq('reporting_org_ref', orgRef);
    }
    if (status) {
      query = query.eq('import_status', status);
    }
    if (source) {
      query = query.eq('import_source', source);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: logs, error: logsError, count } = await query;

    if (logsError) {
      console.error('[IATI Import Logs] Error fetching logs:', logsError);
      return NextResponse.json({ error: logsError.message }, { status: 500 });
    }

    // Fetch all logs for analytics (could optimize with separate aggregate queries)
    const { data: allLogs, error: allLogsError } = await supabase
      .from('iati_import_logs')
      .select('id, import_date, imported_by, imported_by_name, imported_by_email, reporting_org_ref, reporting_org_name, importing_org_name, import_status');

    if (allLogsError) {
      console.error('[IATI Import Logs] Error fetching all logs for analytics:', allLogsError);
    }

    // Calculate analytics
    const analytics = {
      // Time period counts
      last7Days: 0,
      last1Month: 0,
      last3Months: 0,
      last6Months: 0,
      last12Months: 0,
      total: allLogs?.length || 0,

      // Trend calculation (compare last 30 days vs previous 30 days)
      trend: 'stable' as 'increasing' | 'decreasing' | 'stable',
      trendPercent: 0,

      // Status breakdown
      successCount: 0,
      partialCount: 0,
      failedCount: 0,
    };

    // User and org breakdowns
    const userImports: Record<string, { name: string; email: string; count: number }> = {};
    const orgImports: Record<string, { name: string; count: number }> = {};

    let currentPeriodCount = 0;
    let previousPeriodCount = 0;

    if (allLogs) {
      allLogs.forEach((log: any) => {
        const importDate = new Date(log.import_date);

        // Time period counts
        if (importDate >= sevenDaysAgo) analytics.last7Days++;
        if (importDate >= oneMonthAgo) analytics.last1Month++;
        if (importDate >= threeMonthsAgo) analytics.last3Months++;
        if (importDate >= sixMonthsAgo) analytics.last6Months++;
        if (importDate >= twelveMonthsAgo) analytics.last12Months++;

        // Trend calculation
        if (importDate >= oneMonthAgo) {
          currentPeriodCount++;
        } else if (importDate >= previousPeriodStart && importDate < oneMonthAgo) {
          previousPeriodCount++;
        }

        // Status breakdown
        if (log.import_status === 'success') analytics.successCount++;
        else if (log.import_status === 'partial') analytics.partialCount++;
        else if (log.import_status === 'failed') analytics.failedCount++;

        // User breakdown
        if (log.imported_by) {
          const userId = log.imported_by;
          if (!userImports[userId]) {
            userImports[userId] = {
              name: log.imported_by_name || 'Unknown User',
              email: log.imported_by_email || '',
              count: 0,
            };
          }
          userImports[userId].count++;
        }

        // Organisation breakdown
        const orgKey = log.reporting_org_ref || log.importing_org_name || 'Unknown';
        if (!orgImports[orgKey]) {
          orgImports[orgKey] = {
            name: log.reporting_org_name || log.importing_org_name || 'Unknown Organisation',
            count: 0,
          };
        }
        orgImports[orgKey].count++;
      });
    }

    // Calculate trend
    if (previousPeriodCount > 0) {
      const change = ((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100;
      analytics.trendPercent = Math.round(change);
      if (change > 10) {
        analytics.trend = 'increasing';
      } else if (change < -10) {
        analytics.trend = 'decreasing';
      } else {
        analytics.trend = 'stable';
      }
    } else if (currentPeriodCount > 0) {
      analytics.trend = 'increasing';
      analytics.trendPercent = 100;
    }

    // Sort and limit user/org breakdowns
    const topUsers = Object.entries(userImports)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topOrgs = Object.entries(orgImports)
      .map(([ref, data]) => ({ ref, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get recent imports (last 20 for stream)
    const { data: recentLogs, error: recentError } = await supabase
      .from('iati_import_logs')
      .select('*')
      .order('import_date', { ascending: false })
      .limit(20);

    if (recentError) {
      console.error('[IATI Import Logs] Error fetching recent logs:', recentError);
    }

    return NextResponse.json({
      success: true,
      data: logs || [],
      recentStream: recentLogs || [],
      pagination: {
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
      analytics,
      topUsers,
      topOrgs,
    });
  } catch (error) {
    console.error('[IATI Import Logs] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/iati-import-logs
 * Create a new import log entry
 */
export async function POST(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const {
      importSource,
      importFileName,
      activityId,
      iatiIdentifier,
      activityTitle,
      importedBy,
      importedByName,
      importedByEmail,
      reportingOrgRef,
      reportingOrgName,
      importingOrgName,
      importType,
      importStatus = 'success',
      transactionsImported = 0,
      budgetsImported = 0,
      sectorsImported = 0,
      locationsImported = 0,
      documentsImported = 0,
      contactsImported = 0,
      resultsImported = 0,
      errorMessage,
      warnings = [],
      iatiDatastoreUrl,
    } = body;

    // Validation
    if (!importSource) {
      return NextResponse.json({ error: 'Import source is required' }, { status: 400 });
    }
    if (!importType) {
      return NextResponse.json({ error: 'Import type is required' }, { status: 400 });
    }

    // Generate IATI Datastore URL if not provided
    let datastoreUrl = iatiDatastoreUrl;
    if (!datastoreUrl && iatiIdentifier) {
      // Format: https://datastore.iatistandard.org/search/activity?q=iati-identifier:{identifier}
      datastoreUrl = `https://datastore.iatistandard.org/search/activity?q=iati-identifier:${encodeURIComponent(iatiIdentifier)}`;
    }

    const { data, error } = await supabase
      .from('iati_import_logs')
      .insert({
        import_source: importSource,
        import_file_name: importFileName,
        activity_id: activityId,
        iati_identifier: iatiIdentifier,
        activity_title: activityTitle,
        imported_by: importedBy,
        imported_by_name: importedByName,
        imported_by_email: importedByEmail,
        reporting_org_ref: reportingOrgRef,
        reporting_org_name: reportingOrgName,
        importing_org_name: importingOrgName,
        import_type: importType,
        import_status: importStatus,
        transactions_imported: transactionsImported,
        budgets_imported: budgetsImported,
        sectors_imported: sectorsImported,
        locations_imported: locationsImported,
        documents_imported: documentsImported,
        contacts_imported: contactsImported,
        results_imported: resultsImported,
        error_message: errorMessage,
        warnings: warnings,
        iati_datastore_url: datastoreUrl,
      })
      .select()
      .single();

    if (error) {
      console.error('[IATI Import Logs] Error creating log:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
    }, { status: 201 });
  } catch (error) {
    console.error('[IATI Import Logs] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

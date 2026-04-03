import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// In-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const organizationFilter = searchParams.get('organization');
    const sectorFilter = searchParams.get('sector');
    const regionFilter = searchParams.get('region');
    const statusFilter = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Check cache
    const cacheKey = `${organizationFilter}|${sectorFilter}|${regionFilter}|${statusFilter}|${dateFrom}|${dateTo}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    // 1. Fetch published activities with their organizations
    let activityQuery = supabase
      .from('activities')
      .select(`
        id,
        title_narrative,
        activity_status,
        reporting_org_id,
        actual_start_date,
        actual_end_date,
        planned_start_date,
        planned_end_date,
        description_target_groups,
        organizations!activities_reporting_org_id_fkey (
          id,
          name,
          acronym,
          type
        )
      `)
      .eq('publication_status', 'published');

    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      activityQuery = activityQuery.eq('activity_status', statusFilter);
    }

    // Apply date filters
    if (dateFrom) {
      activityQuery = activityQuery.or(`actual_start_date.gte.${dateFrom},planned_start_date.gte.${dateFrom}`);
    }
    if (dateTo) {
      activityQuery = activityQuery.or(`actual_end_date.lte.${dateTo},planned_end_date.lte.${dateTo}`);
    }

    const { data: activities, error: activitiesError } = await activityQuery;

    if (activitiesError) {
      console.error('[5W Dashboard] Error fetching activities:', activitiesError);
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }

    if (!activities || activities.length === 0) {
      const emptyResult = {
        summary: { totalActivities: 0, totalOrganizations: 0, totalSectors: 0, totalRegions: 0, totalBudget: 0 },
        byOrganization: [],
        bySector: [],
        byRegion: [],
        byStatus: [],
        byYear: [],
        crossTab: [],
        filterOptions: { organizations: [], sectors: [], regions: [], statuses: [] },
      };
      return NextResponse.json(emptyResult);
    }

    const activityIds = activities.map(a => a.id);

    // Apply organization filter - narrow down activity IDs
    let filteredActivities = activities;
    if (organizationFilter && organizationFilter !== 'all') {
      filteredActivities = activities.filter(a => {
        const org = a.organizations as any;
        return org?.id === organizationFilter;
      });
      if (filteredActivities.length === 0) {
        const emptyResult = {
          summary: { totalActivities: 0, totalOrganizations: 0, totalSectors: 0, totalRegions: 0, totalBudget: 0 },
          byOrganization: [],
          bySector: [],
          byRegion: [],
          byStatus: [],
          byYear: [],
          crossTab: [],
          filterOptions: { organizations: [], sectors: [], regions: [], statuses: [] },
        };
        return NextResponse.json(emptyResult);
      }
    }

    const filteredActivityIds = filteredActivities.map(a => a.id);

    // 2. Fetch sectors, regions, and budgets in parallel
    // Batch activity IDs to avoid query size limits (Supabase .in() can handle ~1000)
    const batchSize = 500;
    const batches: string[][] = [];
    for (let i = 0; i < filteredActivityIds.length; i += batchSize) {
      batches.push(filteredActivityIds.slice(i, i + batchSize));
    }

    // Fetch all sectors
    let allSectors: any[] = [];
    for (const batch of batches) {
      const { data, error } = await supabase
        .from('activity_sectors')
        .select('activity_id, sector_code, sector_name, percentage')
        .in('activity_id', batch);
      if (error) {
        console.error('[5W Dashboard] Error fetching sectors:', error);
      } else if (data) {
        allSectors = allSectors.concat(data);
      }
    }

    // Apply sector filter
    if (sectorFilter && sectorFilter !== 'all') {
      const sectorActivityIds = new Set(
        allSectors.filter(s => s.sector_code === sectorFilter).map(s => s.activity_id)
      );
      filteredActivities = filteredActivities.filter(a => sectorActivityIds.has(a.id));
    }

    // Fetch subnational breakdowns
    let allRegions: any[] = [];
    for (const batch of batches) {
      const { data, error } = await supabase
        .from('subnational_breakdowns')
        .select('activity_id, region_name, st_pcode, percentage')
        .in('activity_id', batch);
      if (error) {
        console.error('[5W Dashboard] Error fetching regions:', error);
      } else if (data) {
        allRegions = allRegions.concat(data);
      }
    }

    // Apply region filter
    if (regionFilter && regionFilter !== 'all') {
      const regionActivityIds = new Set(
        allRegions.filter(r => r.st_pcode === regionFilter || r.region_name === regionFilter).map(r => r.activity_id)
      );
      filteredActivities = filteredActivities.filter(a => regionActivityIds.has(a.id));
    }

    // Fetch budgets for total budget calculation
    let allBudgets: any[] = [];
    for (const batch of batches) {
      const { data, error } = await supabase
        .from('budgets')
        .select('activity_id, value_usd')
        .in('activity_id', batch);
      if (!error && data) {
        allBudgets = allBudgets.concat(data);
      }
    }

    // Build budget map by activity
    const budgetByActivity = new Map<string, number>();
    for (const b of allBudgets) {
      const current = budgetByActivity.get(b.activity_id) || 0;
      budgetByActivity.set(b.activity_id, current + (b.value_usd || 0));
    }

    // ─── Aggregate: WHO (By Organization) ───
    const orgMap = new Map<string, { id: string; name: string; acronym: string; type: string; activityCount: number; totalBudget: number }>();
    for (const activity of filteredActivities) {
      const org = activity.organizations as any;
      if (!org) continue;
      const existing = orgMap.get(org.id) || {
        id: org.id,
        name: org.name || 'Unknown',
        acronym: org.acronym || '',
        type: org.type || '',
        activityCount: 0,
        totalBudget: 0,
      };
      existing.activityCount++;
      existing.totalBudget += budgetByActivity.get(activity.id) || 0;
      orgMap.set(org.id, existing);
    }
    const byOrganization = Array.from(orgMap.values()).sort((a, b) => b.activityCount - a.activityCount);

    // ─── Aggregate: WHAT (By Sector) ───
    const finalActivityIdSet = new Set(filteredActivities.map(a => a.id));
    const sectorMap = new Map<string, { code: string; name: string; activityCount: number; percentage: number }>();
    const sectorActivitySets = new Map<string, Set<string>>();
    for (const s of allSectors) {
      if (!finalActivityIdSet.has(s.activity_id)) continue;
      const key = s.sector_code || 'unknown';
      if (!sectorActivitySets.has(key)) {
        sectorActivitySets.set(key, new Set());
        sectorMap.set(key, {
          code: key,
          name: s.sector_name || 'Unknown Sector',
          activityCount: 0,
          percentage: 0,
        });
      }
      sectorActivitySets.get(key)!.add(s.activity_id);
    }
    for (const [key, actSet] of sectorActivitySets) {
      const entry = sectorMap.get(key)!;
      entry.activityCount = actSet.size;
    }
    const bySector = Array.from(sectorMap.values()).sort((a, b) => b.activityCount - a.activityCount);
    const totalSectorActivities = bySector.reduce((sum, s) => sum + s.activityCount, 0);
    for (const s of bySector) {
      s.percentage = totalSectorActivities > 0 ? Math.round((s.activityCount / totalSectorActivities) * 1000) / 10 : 0;
    }

    // ─── Aggregate: WHERE (By Region) ───
    const regionMap = new Map<string, { name: string; pcode: string; activityCount: number; percentage: number }>();
    const regionActivitySets = new Map<string, Set<string>>();
    for (const r of allRegions) {
      if (!finalActivityIdSet.has(r.activity_id)) continue;
      const key = r.st_pcode || r.region_name || 'unknown';
      if (!regionActivitySets.has(key)) {
        regionActivitySets.set(key, new Set());
        regionMap.set(key, {
          name: r.region_name || key,
          pcode: r.st_pcode || '',
          activityCount: 0,
          percentage: 0,
        });
      }
      regionActivitySets.get(key)!.add(r.activity_id);
    }
    for (const [key, actSet] of regionActivitySets) {
      const entry = regionMap.get(key)!;
      entry.activityCount = actSet.size;
    }
    const byRegion = Array.from(regionMap.values()).sort((a, b) => b.activityCount - a.activityCount);
    const totalRegionActivities = byRegion.reduce((sum, r) => sum + r.activityCount, 0);
    for (const r of byRegion) {
      r.percentage = totalRegionActivities > 0 ? Math.round((r.activityCount / totalRegionActivities) * 1000) / 10 : 0;
    }

    // ─── Aggregate: WHEN (By Status and Year) ───
    const statusMap = new Map<string, number>();
    const yearMap = new Map<number, { count: number; budget: number }>();
    for (const activity of filteredActivities) {
      // By status
      const status = activity.activity_status || 'Unknown';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);

      // By year (use actual_start_date or planned_start_date)
      const startDate = activity.actual_start_date || activity.planned_start_date;
      if (startDate) {
        const year = new Date(startDate).getFullYear();
        if (!isNaN(year)) {
          const existing = yearMap.get(year) || { count: 0, budget: 0 };
          existing.count++;
          existing.budget += budgetByActivity.get(activity.id) || 0;
          yearMap.set(year, existing);
        }
      }
    }

    const statusLabels: Record<string, string> = {
      '1': 'Pipeline/Identification',
      '2': 'Implementation',
      '3': 'Completion',
      '4': 'Post-completion',
      '5': 'Cancelled',
      '6': 'Suspended',
    };

    const byStatus = Array.from(statusMap.entries())
      .map(([status, count]) => ({
        status: statusLabels[status] || status,
        statusCode: status,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const byYear = Array.from(yearMap.entries())
      .map(([year, data]) => ({
        year,
        count: data.count,
        budget: Math.round(data.budget),
      }))
      .sort((a, b) => a.year - b.year);

    // ─── Cross-tabulation (top combinations) ───
    const crossTabMap = new Map<string, { orgName: string; sectorName: string; regionName: string; activityCount: number }>();
    for (const activity of filteredActivities) {
      const org = activity.organizations as any;
      const orgName = org?.name || 'Unknown';
      const actSectors = allSectors.filter(s => s.activity_id === activity.id);
      const actRegions = allRegions.filter(r => r.activity_id === activity.id);

      // Create cross-tab entries for each sector-region combo
      const sectors = actSectors.length > 0 ? actSectors : [{ sector_name: 'Unspecified' }];
      const regions = actRegions.length > 0 ? actRegions : [{ region_name: 'Unspecified' }];

      for (const sector of sectors) {
        for (const region of regions) {
          const key = `${orgName}|${sector.sector_name}|${region.region_name}`;
          const existing = crossTabMap.get(key) || {
            orgName,
            sectorName: sector.sector_name || 'Unknown',
            regionName: region.region_name || 'Unknown',
            activityCount: 0,
          };
          existing.activityCount++;
          crossTabMap.set(key, existing);
        }
      }
    }
    const crossTab = Array.from(crossTabMap.values())
      .sort((a, b) => b.activityCount - a.activityCount)
      .slice(0, 50);

    // ─── Summary ───
    const totalBudget = Array.from(budgetByActivity.values()).reduce((sum, v) => sum + v, 0);
    const uniqueOrgs = new Set(filteredActivities.map(a => (a.organizations as any)?.id).filter(Boolean));
    const uniqueSectors = new Set(allSectors.filter(s => finalActivityIdSet.has(s.activity_id)).map(s => s.sector_code));
    const uniqueRegions = new Set(allRegions.filter(r => finalActivityIdSet.has(r.activity_id)).map(r => r.st_pcode || r.region_name));

    // ─── Filter options (for dropdowns) ───
    const allActivitiesOrgs = activities.map(a => a.organizations as any).filter(Boolean);
    const orgOptions = Array.from(new Map(allActivitiesOrgs.map((o: any) => [o.id, { id: o.id, name: o.name }])).values());
    const sectorOptions = Array.from(new Map(allSectors.map(s => [s.sector_code, { code: s.sector_code, name: s.sector_name }])).values());
    const regionOptions = Array.from(new Map(allRegions.map(r => [r.st_pcode || r.region_name, { pcode: r.st_pcode, name: r.region_name }])).values());
    const allStatuses = Array.from(new Set(activities.map(a => a.activity_status))).map(s => ({
      code: s,
      label: statusLabels[s] || s,
    }));

    const result = {
      summary: {
        totalActivities: filteredActivities.length,
        totalOrganizations: uniqueOrgs.size,
        totalSectors: uniqueSectors.size,
        totalRegions: uniqueRegions.size,
        totalBudget: Math.round(totalBudget),
      },
      byOrganization,
      bySector,
      byRegion,
      byStatus,
      byYear,
      crossTab,
      filterOptions: {
        organizations: orgOptions,
        sectors: sectorOptions,
        regions: regionOptions,
        statuses: allStatuses,
      },
    };

    // Store in cache
    if (cache.size >= 20) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[5W Dashboard] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

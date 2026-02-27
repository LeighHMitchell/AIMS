import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  // Fetch all parcels for aggregation — fall back if line_ministries table is missing
  let { data: parcels, error } = await supabase!
    .from('land_parcels')
    .select('id, status, state_region, classification, size_hectares, created_at, asset_type, title_status, controlling_ministry_id, line_ministries(name)')
    .order('created_at', { ascending: false });

  if (error) {
    // Retry without line_ministries join
    const fallback = await supabase!
      .from('land_parcels')
      .select('id, status, state_region, classification, size_hectares, created_at, asset_type, title_status, controlling_ministry_id')
      .order('created_at', { ascending: false });
    parcels = fallback.data;
    error = fallback.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const all = parcels || [];

  // Status counts
  const byStatus: Record<string, number> = { available: 0, reserved: 0, allocated: 0, disputed: 0 };
  all.forEach(p => {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  });

  // Totals
  const totalHectares = all.reduce((sum, p) => sum + (p.size_hectares || 0), 0);
  const allocatedCount = byStatus.allocated || 0;
  const allocatedPercent = all.length > 0 ? Math.round((allocatedCount / all.length) * 100) : 0;

  // By region
  const regionMap = new Map<string, { count: number; hectares: number }>();
  all.forEach(p => {
    const key = p.state_region || 'Unknown';
    const existing = regionMap.get(key) || { count: 0, hectares: 0 };
    existing.count++;
    existing.hectares += p.size_hectares || 0;
    regionMap.set(key, existing);
  });
  const byRegion = Array.from(regionMap.entries()).map(([region, data]) => ({
    region, ...data,
  })).sort((a, b) => b.count - a.count);

  // By classification
  const classMap = new Map<string, { count: number; hectares: number }>();
  all.forEach(p => {
    const key = p.classification || 'Unclassified';
    const existing = classMap.get(key) || { count: 0, hectares: 0 };
    existing.count++;
    existing.hectares += p.size_hectares || 0;
    classMap.set(key, existing);
  });
  const byClassification = Array.from(classMap.entries()).map(([classification, data]) => ({
    classification, ...data,
  })).sort((a, b) => b.count - a.count);

  // By asset type
  const assetMap = new Map<string, { count: number; hectares: number }>();
  all.forEach((p: any) => {
    const key = p.asset_type || 'Unspecified';
    const existing = assetMap.get(key) || { count: 0, hectares: 0 };
    existing.count++;
    existing.hectares += p.size_hectares || 0;
    assetMap.set(key, existing);
  });
  const byAssetType = Array.from(assetMap.entries()).map(([asset_type, data]) => ({
    asset_type, ...data,
  })).sort((a, b) => b.count - a.count);

  // By title status
  const titleMap = new Map<string, number>();
  all.forEach((p: any) => {
    const key = p.title_status || 'Unregistered';
    titleMap.set(key, (titleMap.get(key) || 0) + 1);
  });
  const byTitleStatus = Array.from(titleMap.entries()).map(([title_status, count]) => ({
    title_status, count,
  })).sort((a, b) => b.count - a.count);

  // By ministry
  const ministryMap = new Map<string, { count: number; hectares: number }>();
  all.forEach((p: any) => {
    const key = p.line_ministries?.name || 'Unassigned';
    const existing = ministryMap.get(key) || { count: 0, hectares: 0 };
    existing.count++;
    existing.hectares += p.size_hectares || 0;
    ministryMap.set(key, existing);
  });
  const byMinistry = Array.from(ministryMap.entries()).map(([ministry, data]) => ({
    ministry, ...data,
  })).sort((a, b) => b.count - a.count);

  // Recent parcels (last 5)
  const recentParcels = all.slice(0, 5);

  // Recent activity
  const { data: recentActivity } = await supabase!
    .from('land_parcel_history')
    .select('*, users(id, first_name, last_name)')
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    totalParcels: all.length,
    totalHectares,
    allocatedPercent,
    availableCount: byStatus.available || 0,
    byStatus,
    byRegion,
    byClassification,
    byAssetType,
    byTitleStatus,
    byMinistry,
    recentParcels,
    recentActivity: recentActivity || [],
  });
}

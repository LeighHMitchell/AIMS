import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { buildCsvFromArrays, dateIso, type Cell } from '@/lib/exports';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const region = searchParams.get('region');

  let query = supabase!
    .from('land_parcels')
    .select(
      'id, parcel_code, name, description, state_region, township, size_hectares, classification, status, lease_start_date, lease_end_date, latitude, longitude, area_geojson, created_at, updated_at'
    )
    .order('parcel_code', { ascending: true });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  if (region && region !== 'all') {
    query = query.eq('state_region', region);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const headers: Cell[] = [
    'parcel_id',
    'parcel_code',
    'name',
    'description',
    'state_region',
    'township',
    'size_hectares',
    'classification',
    'status',
    'lease_start_date',
    'lease_end_date',
    'latitude',
    'longitude',
    'has_geojson',
    'created_at',
    'updated_at',
  ];

  const body: Cell[][] = rows.map((r: any) => [
    r.id,
    r.parcel_code,
    r.name,
    r.description ?? '',
    r.state_region,
    r.township ?? '',
    r.size_hectares ?? '',
    r.classification ?? '',
    r.status ?? '',
    dateIso(r.lease_start_date),
    dateIso(r.lease_end_date),
    r.latitude ?? '',
    r.longitude ?? '',
    r.area_geojson ? 'Yes' : 'No',
    dateIso(r.created_at),
    dateIso(r.updated_at),
  ]);

  // Pass options.bom = false here — Node-side route, prepend manually for the
  // download response so the same UTF-8 BOM Excel expects shows up.
  const csv = '\ufeff' + buildCsvFromArrays([headers, ...body]);
  const today = new Date().toISOString().split('T')[0];

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="land-parcels-export-${today}.csv"`,
    },
  });
}

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const region = searchParams.get('region');

  let query = supabase!
    .from('land_parcels')
    .select('parcel_code, name, state_region, township, size_hectares, classification, status, lease_start_date, lease_end_date, created_at')
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

  const rows = data || [];

  // Build CSV
  const headers = [
    'Parcel Code', 'Name', 'State/Region', 'Township',
    'Size (Hectares)', 'Classification', 'Status',
    'Lease Start', 'Lease End', 'Created At',
  ];

  const csvRows = [
    headers.join(','),
    ...rows.map(r => [
      csvEscape(r.parcel_code),
      csvEscape(r.name),
      csvEscape(r.state_region),
      csvEscape(r.township),
      r.size_hectares ?? '',
      csvEscape(r.classification),
      r.status,
      r.lease_start_date || '',
      r.lease_end_date || '',
      r.created_at,
    ].join(',')),
  ];

  const csv = csvRows.join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="land-parcels-export-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}

function csvEscape(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

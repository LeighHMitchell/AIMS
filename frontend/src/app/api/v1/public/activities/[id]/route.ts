import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  applyPublishedFilter,
  mapPublicActivity,
  mapPublicOrg,
  mapPublicSector,
  mapPublicTransaction,
  withPublicHeaders,
  publicApiError,
} from '@/lib/api/public-api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/public/activities/[id]
 *
 * Public, unauthenticated detail for a single PUBLISHED activity, including
 * safe child collections: sectors, participating organisations, locations,
 * and transactions. Returns 404 for drafts, soft-deleted, or unknown ids
 * (we never reveal that a non-public activity exists).
 *
 * `id` may be the internal UUID or the IATI identifier.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const id = decodeURIComponent(params.id);

    // Resolve by UUID or IATI identifier, but always behind the publish gate.
    let query = supabase.from('activities').select('*');
    // UUIDs contain hyphens in a fixed pattern; IATI ids also can. Match either
    // column with an OR so callers can use whichever they have.
    query = query.or(`id.eq.${id},iati_identifier.eq.${id}`);
    query = applyPublishedFilter(query);

    const { data: rows, error } = await query.limit(1);
    if (error) {
      return publicApiError('Failed to fetch activity', 500, error.message);
    }
    const activity = rows?.[0];
    if (!activity) {
      return publicApiError('Activity not found', 404);
    }

    const activityId = activity.id;

    // Reporting org (name/ref only).
    let reportingOrg = null;
    if (activity.reporting_org_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, acronym, iati_org_id')
        .eq('id', activity.reporting_org_id)
        .maybeSingle();
      reportingOrg = mapPublicOrg(org);
    }

    // Child collections, each fetched defensively so one missing table/column
    // never breaks the whole response.
    const safeFetch = async (
      table: string,
      mapFn: (row: any) => any
    ): Promise<any[]> => {
      try {
        const { data, error: e } = await supabase
          .from(table)
          .select('*')
          .eq('activity_id', activityId);
        if (e || !data) return [];
        return data.map(mapFn);
      } catch {
        return [];
      }
    };

    const [sectors, participatingOrgs, locations, transactions] = await Promise.all([
      safeFetch('activity_sectors', mapPublicSector),
      safeFetch('activity_participating_organizations', (p) => ({
        role: p.role_type ?? p.role ?? null,
        name: p.narrative ?? p.org_name ?? p.name ?? null,
        ref: p.ref ?? p.iati_org_id ?? null,
        type: p.org_type ?? p.type ?? null,
      })),
      safeFetch('activity_locations', (l) => ({
        name: l.location_name ?? l.name ?? null,
        description: l.location_description ?? l.description ?? null,
        countryCode: l.country_code ?? null,
        adminLevel: l.admin_level ?? l.administrative_level ?? null,
        adminCode: l.admin_code ?? null,
        latitude: l.latitude ?? null,
        longitude: l.longitude ?? null,
      })),
      safeFetch('transactions', mapPublicTransaction),
    ]);

    const response = NextResponse.json({
      data: {
        ...mapPublicActivity(activity, reportingOrg),
        sectors,
        participatingOrgs,
        locations,
        transactions,
      },
    });
    return withPublicHeaders(response);
  } catch (err) {
    return publicApiError(
      'Internal error',
      500,
      err instanceof Error ? err.message : 'Unknown error'
    );
  }
}

export async function OPTIONS() {
  return withPublicHeaders(new NextResponse(null, { status: 204 }));
}

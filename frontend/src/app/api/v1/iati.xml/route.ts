import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { generateMultipleActivitiesIATIXML } from '@/lib/iati-xml-generator';
import { applyPublishedFilter, withPublicHeaders, publicApiError } from '@/lib/api/public-api';

export const dynamic = 'force-dynamic';

// IATI publishing files can be large; bound how many activities we emit per
// request so a single document stays harvestable. Registry harvesters expect a
// stable URL, not an unbounded dump.
const MAX_ACTIVITIES = 1000;

/**
 * GET /api/v1/iati.xml
 *
 * Public IATI 2.03 publishing file: a single `<iati-activities>` document of
 * PUBLISHED, non-deleted activities, suitable for the IATI Registry, d-portal,
 * and partner harvesters. Reuses the existing multi-activity generator.
 *
 * Query params:
 *   - reporting_org (optional) restrict to one reporting organisation (UUID)
 *
 * Returns Content-Type: application/xml. Cached at the edge for 1 hour.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const reportingOrg = request.nextUrl.searchParams.get('reporting_org')?.trim();

    let idQuery = supabase
      .from('activities')
      .select('id')
      .order('updated_at', { ascending: false })
      .range(0, MAX_ACTIVITIES - 1);
    idQuery = applyPublishedFilter(idQuery);
    if (reportingOrg) {
      idQuery = idQuery.eq('reporting_org_id', reportingOrg);
    }

    const { data: idRows, error } = await idQuery;
    if (error) {
      return publicApiError('Failed to resolve published activities', 500, error.message);
    }

    const ids = (idRows ?? []).map((r: any) => r.id);

    // generateMultipleActivitiesIATIXML emits a valid empty <iati-activities/>
    // wrapper for an empty id list, so this is safe even with zero results.
    const xml = await generateMultipleActivitiesIATIXML(ids);

    const response = new NextResponse(xml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
    return withPublicHeaders(response as unknown as NextResponse, 3600);
  } catch (err) {
    return publicApiError(
      'Failed to generate IATI file',
      500,
      err instanceof Error ? err.message : 'Unknown error'
    );
  }
}

export async function OPTIONS() {
  return withPublicHeaders(new NextResponse(null, { status: 204 }));
}

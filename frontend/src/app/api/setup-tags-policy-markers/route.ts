import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * DEPRECATED — this endpoint used to seed 18 app-invented "custom" policy
 * markers (text codes like gender_equality, human_rights, rural_development…).
 * That set duplicated and conflicted with the official 12 OECD-DAC / IATI v2.03
 * markers, so the seed data has been removed (2026-06-03).
 *
 * The canonical IATI standard markers are seeded by /api/setup-iati-policy-markers.
 * This route is now a no-op kept only so any old caller gets a clear message
 * instead of silently re-introducing duplicate/non-standard markers.
 */
export async function POST() {
  const { response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  return NextResponse.json(
    {
      success: false,
      deprecated: true,
      message:
        'This setup endpoint has been retired. It previously created non-standard custom policy markers that duplicated the official OECD-DAC / IATI markers. Use /api/setup-iati-policy-markers to seed the standard 12.',
    },
    { status: 410 }
  );
}

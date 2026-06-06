import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { FRAMEWORK_PRESETS } from '@/lib/program-logic/presets';
import { unauthorized } from '@/lib/program-logic/route-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/program-logics/presets
 * Returns the framework presets (label, description, seeded tiers) for the setup
 * picker. Read-only reference data; requires an authenticated session.
 */
export async function GET() {
  const { user, response } = await requireAuth();
  if (response || !user) return response ?? unauthorized();
  return NextResponse.json({ presets: Object.values(FRAMEWORK_PRESETS) });
}

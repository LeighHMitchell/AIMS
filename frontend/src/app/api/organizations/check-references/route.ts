import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getOrganizationReferences } from '@/lib/organization-references';

// Force dynamic rendering to ensure environment variables are always loaded
export const dynamic = 'force-dynamic';

const MAX_IDS = 200;

/**
 * POST /api/organizations/check-references
 * Body: { ids: string[] }
 *
 * Read-only pre-flight: returns, per organization, whether it is referenced by
 * activities / transactions / users (and a human-readable list). The org list
 * UI uses this to decide which selected orgs can be deleted without a modal and
 * which must be shown in the read-only "cannot delete" dialog.
 */
export async function POST(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => null);
    const ids: string[] = Array.isArray(body?.ids)
      ? body.ids.filter((v: unknown) => typeof v === 'string' && v.length > 0)
      : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'No organization IDs provided' },
        { status: 400 }
      );
    }

    if (ids.length > MAX_IDS) {
      return NextResponse.json(
        { error: `Cannot check more than ${MAX_IDS} organizations at once` },
        { status: 400 }
      );
    }

    // Names/acronyms so the UI can label blocked orgs
    const { data: orgRows } = await supabase
      .from('organizations')
      .select('id, name, acronym')
      .in('id', ids);
    const labelById = new Map<string, string>(
      (orgRows || []).map((o: any) => [o.id, o.acronym || o.name || o.id])
    );

    const results: Record<
      string,
      { name: string; hasReferences: boolean; references: string[]; error?: string }
    > = {};

    for (const id of ids) {
      const refResult = await getOrganizationReferences(supabase, id);
      if ('error' in refResult) {
        results[id] = {
          name: labelById.get(id) || id,
          hasReferences: true, // fail safe: don't allow deletion if we couldn't verify
          references: [],
          error: refResult.error,
        };
        continue;
      }
      results[id] = {
        name: labelById.get(id) || id,
        hasReferences: refResult.references.length > 0,
        references: refResult.references,
      };
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[AIMS] Error checking organization references:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/organizations/migrate-country
 *
 * Migrates country data to country_represented field for organizations
 * that have country set but not country_represented
 */
export async function POST() {
  try {
    const supabase = getSupabaseAdmin();

    console.log('[Migrate Country] Starting migration...');

    // Get all organizations with country but no country_represented
    const { data: orgsToMigrate, error: fetchError } = await supabase
      .from('organizations')
      .select('id, name, country, country_represented')
      .not('country', 'is', null)
      .or('country_represented.is.null,country_represented.eq.');

    if (fetchError) {
      console.error('[Migrate Country] Error fetching organizations:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
    }

    const orgCount = orgsToMigrate?.length || 0;
    console.log(`[Migrate Country] Found ${orgCount} organizations to migrate`);

    let updatedCount = 0;

    for (const org of orgsToMigrate || []) {
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ country_represented: org.country })
        .eq('id', org.id);

      if (updateError) {
        console.error(`[Migrate Country] Error updating organization ${org.name}:`, updateError);
      } else {
        updatedCount++;
        console.log(`[Migrate Country] Updated ${org.name}: country_represented = ${org.country}`);
      }
    }

    console.log(`[Migrate Country] Complete: ${updatedCount} organizations updated`);

    return NextResponse.json({
      success: true,
      checked: orgCount,
      updated: updatedCount
    });

  } catch (error) {
    console.error('[Migrate Country] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

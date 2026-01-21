import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

/**
 * Sync external activity links - check if activities with the external IATI identifiers
 * now exist in the database and resolve the links
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: activityId } = await params;

  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    // 1. Get all unresolved external links for this activity
    const { data: externalLinks, error: fetchError } = await supabase
      .from('activity_relationships')
      .select('*')
      .eq('activity_id', activityId)
      .eq('is_resolved', false)
      .not('external_iati_identifier', 'is', null);

    if (fetchError) {
      console.error('Error fetching external links:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch external links' },
        { status: 500 }
      );
    }

    if (!externalLinks || externalLinks.length === 0) {
      return NextResponse.json({
        message: 'No unresolved external links found',
        resolvedCount: 0
      });
    }

    let resolvedCount = 0;

    // 2. For each external link, try to find the activity by IATI identifier
    for (const link of externalLinks) {
      const { data: matchingActivity, error: searchError } = await supabase
        .from('activities')
        .select('id')
        .eq('iati_identifier', link.external_iati_identifier)
        .single();

      if (searchError) {
        console.log(`No match found for ${link.external_iati_identifier}`);
        continue;
      }

      if (matchingActivity) {
        // 3. Update the link to point to the actual activity
        const { error: updateError } = await supabase
          .from('activity_relationships')
          .update({
            related_activity_id: matchingActivity.id,
            is_resolved: true,
            // Keep the external fields for reference
          })
          .eq('id', link.id);

        if (updateError) {
          console.error(`Error updating link ${link.id}:`, updateError);
        } else {
          resolvedCount++;
        }
      }
    }

    return NextResponse.json({
      message: `Successfully resolved ${resolvedCount} external link(s)`,
      resolvedCount,
      totalChecked: externalLinks.length
    });

  } catch (error: any) {
    console.error('Error syncing external links:', error);
    return NextResponse.json(
      { error: 'Failed to sync external links' },
      { status: 500 }
    );
  }
}

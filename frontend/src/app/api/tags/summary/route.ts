import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Lists every tag with the number of activities it is applied to, for the
// /tags listing page. Activity counts come from the activity_tags junction
// (UNIQUE(activity_id, tag_id) guarantees one row per activity per tag, so a
// raw row count == distinct activities).
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not initialized' }, { status: 500 });
    }

    const { data: tags, error: tagsError } = await supabase
      .from('tags')
      .select('id, name, code, vocabulary, description, created_at')
      .order('name');

    if (tagsError) {
      console.error('[Tags Summary] Error fetching tags:', tagsError);
      return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
    }

    if (!tags || tags.length === 0) {
      return NextResponse.json({ tags: [], totalActivities: 0 });
    }

    const { data: tagLinks, error: linksError } = await supabase
      .from('activity_tags')
      .select('tag_id, activity_id');

    if (linksError) {
      console.error('[Tags Summary] Error fetching activity_tags:', linksError);
    }

    const countMap = new Map<string, number>();
    (tagLinks || []).forEach((row: any) => {
      const key = String(row.tag_id);
      countMap.set(key, (countMap.get(key) || 0) + 1);
    });

    const enrichedTags = tags.map(t => ({
      ...t,
      activityCount: countMap.get(String(t.id)) || 0,
    }));

    const totalActivities = new Set(
      (tagLinks || []).map((r: any) => r.activity_id).filter(Boolean)
    ).size;

    return NextResponse.json({ tags: enrichedTags, totalActivities });
  } catch (error: any) {
    console.error('[Tags Summary] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

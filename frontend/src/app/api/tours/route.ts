import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/tours?route=/dashboard&locale=en
 * Returns the tour and steps for the current route, plus completion status for the user.
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;
    if (!supabase || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const route = searchParams.get('route') || '';
    const locale = searchParams.get('locale') || 'en';

    if (!route) {
      return NextResponse.json({ error: 'route is required' }, { status: 400 });
    }

    // Fetch all active tours to match route (exact first, then prefix for patterns ending with *)
    const { data: tours, error: toursError } = await supabase
      .from('tours')
      .select('id, slug, route_pattern, title, description, sort_order')
      .eq('is_active', true)
      .order('sort_order');

    if (toursError) {
      console.error('[Tours API] Error fetching tours:', toursError);
      return NextResponse.json({ error: 'Failed to fetch tours' }, { status: 500 });
    }

    // Match route: exact match first, then prefix match for patterns like /organizations/*
    let matched = (tours || []).find((t: { route_pattern: string }) => t.route_pattern === route);
    if (!matched) {
      matched = (tours || []).find((t: { route_pattern: string }) => {
        if (t.route_pattern.endsWith('*')) {
          const prefix = t.route_pattern.slice(0, -1);
          return route === prefix || route.startsWith(prefix);
        }
        return false;
      });
    }

    if (!matched) {
      return NextResponse.json({ tour: null, steps: [], isCompleted: false, isDismissed: false });
    }

    const tourId = matched.id;
    const tourSlug = matched.slug;

    // Fetch steps for this tour and locale
    const { data: steps, error: stepsError } = await supabase
      .from('tour_steps')
      .select('id, step_order, target_selector, title, content, placement, spotlight_padding, disable_beacon')
      .eq('tour_id', tourId)
      .eq('locale', locale)
      .order('step_order');

    if (stepsError) {
      console.error('[Tours API] Error fetching steps:', stepsError);
      return NextResponse.json({ error: 'Failed to fetch steps' }, { status: 500 });
    }

    // Fetch user completion for this tour
    const { data: completion, error: compError } = await supabase
      .from('user_tour_completions')
      .select('completed_at, dismissed')
      .eq('user_id', user.id)
      .eq('tour_slug', tourSlug)
      .maybeSingle();

    if (compError) {
      console.error('[Tours API] Error fetching completion:', compError);
    }

    const isCompleted = !!completion && !completion.dismissed;
    const isDismissed = !!completion?.dismissed;

    return NextResponse.json({
      tour: matched,
      steps: steps || [],
      isCompleted,
      isDismissed,
    });
  } catch (error) {
    console.error('[Tours API] Error in GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

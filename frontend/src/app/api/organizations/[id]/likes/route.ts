import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/organizations/[id]/likes
// Get likes info for an organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const { id: organizationId } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get organization with likes count
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, likes_count')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get users who liked this organization
    const { data: likes, error: likesError } = await supabase
      .from('entity_likes')
      .select(`
        id,
        user_id,
        created_at,
        users!inner (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('entity_type', 'organization')
      .eq('entity_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (likesError) {
      console.error('Error fetching likes:', likesError);
      return NextResponse.json(
        { error: 'Failed to fetch likes' },
        { status: 500 }
      );
    }

    // Check if current user has liked
    let isLiked = false;
    if (userId) {
      const { data: userLike } = await supabase
        .from('entity_likes')
        .select('id')
        .eq('entity_type', 'organization')
        .eq('entity_id', organizationId)
        .eq('user_id', userId)
        .single();

      isLiked = !!userLike;
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('entity_likes')
      .select('id', { count: 'exact', head: true })
      .eq('entity_type', 'organization')
      .eq('entity_id', organizationId);

    // Transform users data
    const users = likes?.map((like: any) => ({
      id: like.users.id,
      name: `${like.users.first_name || ''} ${like.users.last_name || ''}`.trim() || 'Unknown User',
      avatar: like.users.avatar_url,
    })) || [];

    return NextResponse.json({
      count: organization.likes_count || 0,
      users,
      isLiked,
      hasMore: (totalCount || 0) > offset + limit,
      totalCount: totalCount || 0,
    });
  } catch (error) {
    console.error('Error in GET /api/organizations/[id]/likes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/organizations/[id]/likes
// Toggle like on an organization
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const { id: organizationId } = params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify organization exists
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, likes_count')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if user already liked this organization
    const { data: existingLike, error: likeCheckError } = await supabase
      .from('entity_likes')
      .select('id')
      .eq('entity_type', 'organization')
      .eq('entity_id', organizationId)
      .eq('user_id', userId)
      .single();

    if (likeCheckError && likeCheckError.code !== 'PGRST116') {
      console.error('Error checking like status:', likeCheckError);
      return NextResponse.json(
        { error: 'Failed to check like status' },
        { status: 500 }
      );
    }

    let isLiked: boolean;
    let newLikesCount: number;

    if (existingLike) {
      // Unlike: remove the like
      const { error: deleteError } = await supabase
        .from('entity_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        console.error('Error removing like:', deleteError);
        return NextResponse.json(
          { error: 'Failed to unlike organization' },
          { status: 500 }
        );
      }

      isLiked = false;
      newLikesCount = Math.max(0, (organization.likes_count || 0) - 1);
    } else {
      // Like: add the like
      const { error: insertError } = await supabase
        .from('entity_likes')
        .insert({
          entity_type: 'organization',
          entity_id: organizationId,
          user_id: userId,
        });

      if (insertError) {
        console.error('Error adding like:', insertError);
        return NextResponse.json(
          { error: 'Failed to like organization' },
          { status: 500 }
        );
      }

      isLiked = true;
      newLikesCount = (organization.likes_count || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      isLiked,
      likesCount: newLikesCount,
    });
  } catch (error) {
    console.error('Error in POST /api/organizations/[id]/likes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

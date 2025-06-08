import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const activityId = searchParams.get('activityId');
    const popular = searchParams.get('popular') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    let tagsQuery = supabaseAdmin.from('tags').select('*');

    // Search tags by name
    if (query) {
      tagsQuery = tagsQuery.ilike('name', `%${query}%`);
    }

    // Get popular tags
    if (popular) {
      tagsQuery = tagsQuery.order('usage_count', { ascending: false });
    } else {
      tagsQuery = tagsQuery.order('name');
    }

    tagsQuery = tagsQuery.limit(limit);

    const { data: tags, error } = await tagsQuery;

    if (error) {
      console.error('[AIMS] Error fetching tags:', error);
      
      // Check if it's a missing table error
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'Tags feature not available. Please run the tags database migration.',
          details: 'The tags tables have not been created in the database yet.'
        }, { status: 503 });
      }
      
      return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
    }

    // If activityId is provided, also get tags for that activity
    if (activityId) {
      const { data: activityTags, error: activityTagsError } = await supabaseAdmin
        .from('activity_tags')
        .select(`
          tag_id,
          tagged_by,
          tagged_at,
          tags (*)
        `)
        .eq('activity_id', activityId);

      if (activityTagsError) {
        console.error('[AIMS] Error fetching activity tags:', activityTagsError);
      }

      return NextResponse.json({
        allTags: tags || [],
        activityTags: activityTags || []
      });
    }

    return NextResponse.json(tags || []);
  } catch (error) {
    console.error('[AIMS] Error in tags GET:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Create a new tag
    if (body.action === 'create') {
      const { name, vocabulary = '99', description } = body;
      
      if (!name || name.trim() === '') {
        return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
      }
      
      // Generate code from name (lowercase, replace spaces with hyphens)
      const code = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const { data: tag, error } = await supabaseAdmin
        .from('tags')
        .insert([{ name, vocabulary, code, description }])
        .select()
        .single();

      if (error) {
        console.error('[AIMS] Error creating tag:', {
          code: error.code,
          message: error.message,
          details: error.details
        });
        
        // Check if it's a missing table error
        if (error.code === '42P01') {
          return NextResponse.json({ 
            error: 'Tags feature not available. Please run the tags database migration.',
            details: 'The tags tables have not been created in the database yet.'
          }, { status: 503 });
        }
        
        if (error.code === '23505') { // Unique constraint violation
          // Tag already exists, fetch it
          const { data: existingTag, error: fetchError } = await supabaseAdmin
            .from('tags')
            .select('*')
            .eq('name', name)
            .single();
          
          if (fetchError) {
            return NextResponse.json({ error: 'Tag already exists but could not fetch it' }, { status: 500 });
          }
          
          return NextResponse.json(existingTag);
        }
        
        return NextResponse.json({ 
          error: error.message || 'Failed to create tag',
          code: error.code 
        }, { status: 500 });
      }

      return NextResponse.json(tag);
    }

    // Add tag to activity
    if (body.action === 'addToActivity') {
      const { activityId, tagId, userId } = body;
      
      if (!activityId || !tagId) {
        return NextResponse.json({ error: 'Activity ID and Tag ID are required' }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from('activity_tags')
        .insert([{
          activity_id: activityId,
          tag_id: tagId,
          tagged_by: userId
        }])
        .select()
        .single();

      if (error) {
        console.error('[AIMS] Error adding tag to activity:', {
          code: error.code,
          message: error.message,
          details: error.details
        });
        
        // Check if it's a missing table error
        if (error.code === '42P01') {
          return NextResponse.json({ 
            error: 'Tags feature not available. Please run the tags database migration.',
            details: 'The tags tables have not been created in the database yet.'
          }, { status: 503 });
        }
        
        if (error.code === '23505') { // Already tagged
          return NextResponse.json({ message: 'Activity already has this tag' }, { status: 200 });
        }
        
        return NextResponse.json({ 
          error: error.message || 'Failed to add tag to activity',
          code: error.code 
        }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    // Remove tag from activity
    if (body.action === 'removeFromActivity') {
      const { activityId, tagId } = body;

      const { error } = await supabaseAdmin
        .from('activity_tags')
        .delete()
        .eq('activity_id', activityId)
        .eq('tag_id', tagId);

      if (error) {
        console.error('[AIMS] Error removing tag from activity:', error);
        return NextResponse.json({ error: 'Failed to remove tag from activity' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Tag removed successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[AIMS] Error in tags POST:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to process request' 
    }, { status: 500 });
  }
}

// Get recommended tags based on activity data
async function getRecommendedTags(activityId: string, sectors: any[]) {
  try {
    // Get tags from activities with similar sectors
    const sectorCodes = sectors.map(s => s.code);
    
    if (sectorCodes.length > 0) {
      const { data: similarActivities } = await supabaseAdmin
        .from('activity_sectors')
        .select('activity_id')
        .in('sector_code', sectorCodes)
        .neq('activity_id', activityId)
        .limit(50);

      if (similarActivities && similarActivities.length > 0) {
        const similarActivityIds = similarActivities.map((a: any) => a.activity_id);
        
        const { data: recommendedTags } = await supabaseAdmin
          .from('activity_tags')
          .select(`
            tags (*)
          `)
          .in('activity_id', similarActivityIds)
          .limit(10);

        return recommendedTags?.map((t: any) => t.tags).filter(Boolean) || [];
      }
    }

    return [];
  } catch (error) {
    console.error('[AIMS] Error getting recommended tags:', error);
    return [];
  }
} 
import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchQuery = request.nextUrl.searchParams.get('q');
    
    let query = getSupabaseAdmin()
      .from('tags')
      .select('*');
    
    if (searchQuery) {
      query = query.ilike('name', `%${searchQuery}%`);
    }
    
    // Order by usage (most recently created first, then alphabetically)
    query = query.order('created_at', { ascending: false });
    
    // Limit to 20 suggestions
    query = query.limit(20);
    
    const { data: tags, error } = await query;

    if (error) {
      console.error('Error fetching tags:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tags' },
        { status: 500 }
      );
    }

    return NextResponse.json(tags || []);
  } catch (error) {
    console.error('Error in tags API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }
    
    const normalizedName = name.toLowerCase().trim();
    
    // Check if tag already exists
    const { data: existingTag } = await getSupabaseAdmin()
      .from('tags')
      .select('*')
      .eq('name', normalizedName)
      .single();
    
    if (existingTag) {
      return NextResponse.json(existingTag);
    }
    
    // Create new tag
    const { data: newTag, error } = await getSupabaseAdmin()
      .from('tags')
      .insert([{
        name: normalizedName
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating tag:', error);
      return NextResponse.json(
        { error: 'Failed to create tag' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(newTag, { status: 201 });
  } catch (error) {
    console.error('Error in tags POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
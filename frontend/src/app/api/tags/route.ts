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
    const { name, created_by } = await request.json();
    
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }
    
    const normalizedName = name.toLowerCase().trim();
    
    // Generate a code from the name (alphanumeric, replace spaces/special chars with hyphens)
    const code = normalizedName
      .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, '')      // Remove leading/trailing hyphens
      .substring(0, 50);            // Limit length
    
    // Check if tag already exists by name or code
    const { data: existingTag, error: fetchError } = await getSupabaseAdmin()
      .from('tags')
      .select('*')
      .or(`name.eq.${normalizedName},code.eq.${code}`)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Error checking existing tag:', fetchError);
      return NextResponse.json(
        { error: 'Database query failed' },
        { status: 500 }
      );
    }
    
    if (existingTag) {
      return NextResponse.json(existingTag);
    }
    
    // Create new tag - try with created_by first, fallback to basic structure
    const baseTagData = {
      name: normalizedName,
      code: code
    };
    
    // First attempt: try with created_by if provided
    if (created_by) {
      try {
        const { data: newTag, error: createError } = await getSupabaseAdmin()
          .from('tags')
          .insert([{ ...baseTagData, created_by }])
          .select()
          .single();
        
        if (!createError) {
          return NextResponse.json(newTag, { status: 201 });
        }
        
        // If error contains schema cache message, try without created_by
        if (createError.message.includes('created_by') || createError.message.includes('schema cache')) {
          console.log('created_by column not found, trying without it...');
        } else {
          throw createError;
        }
      } catch (error) {
        console.log('First attempt failed, trying without created_by field...');
      }
    }
    
    // Fallback: create tag without created_by field but with code
    const { data: newTag, error: createError } = await getSupabaseAdmin()
      .from('tags')
      .insert([baseTagData])
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating tag (fallback):', createError);
      console.error('Tag data attempted:', baseTagData);
      return NextResponse.json(
        { 
          error: 'Failed to create tag',
          details: createError.message 
        },
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
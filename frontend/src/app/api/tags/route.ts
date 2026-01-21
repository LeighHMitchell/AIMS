import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const searchQuery = request.nextUrl.searchParams.get('q');

    let query = supabase
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

// Helper function to validate URL format
function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { name, created_by, vocabulary, code: providedCode, vocabulary_uri } = await request.json();

    // === INPUT VALIDATION ===

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }
    
    const normalizedName = name.toLowerCase().trim();
    
    // Validate name length
    if (normalizedName.length > 255) {
      return NextResponse.json(
        { error: 'Tag name too long (max 255 characters)' },
        { status: 400 }
      );
    }
    
    // Use provided code or generate one from the name
    const code = providedCode || normalizedName
      .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, '')      // Remove leading/trailing hyphens
      .substring(0, 50);            // Limit length
    
    // Validate code format (allow uppercase and lowercase)
    if (code && !/^[a-zA-Z0-9-]+$/.test(code)) {
      return NextResponse.json(
        { error: 'Tag code must be alphanumeric with hyphens only' },
        { status: 400 }
      );
    }
    
    // Normalize vocabulary to string
    const normalizedVocabulary = vocabulary ? String(vocabulary) : '99';
    
    // Validate vocabulary code
    const validVocabularies = ['1', '2', '3', '98', '99'];
    if (!validVocabularies.includes(normalizedVocabulary)) {
      return NextResponse.json(
        { error: `Invalid vocabulary code: ${normalizedVocabulary}. Must be one of: ${validVocabularies.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Validate vocabulary_uri format if provided
    if (vocabulary_uri && !isValidUrl(vocabulary_uri)) {
      return NextResponse.json(
        { error: 'Invalid vocabulary URI format' },
        { status: 400 }
      );
    }
    
    // === CHECK FOR EXISTING TAG ===
    // Use separate queries to avoid SQL injection
    
    // First, check for exact match on name + vocabulary
    const { data: exactMatch, error: exactError } = await supabase
      .from('tags')
      .select('*')
      .eq('name', normalizedName)
      .eq('vocabulary', normalizedVocabulary)
      .maybeSingle();
    
    if (exactError && exactError.code !== 'PGRST116') {
      console.error('Error checking exact tag match:', exactError);
      return NextResponse.json(
        { error: 'Database query failed' },
        { status: 500 }
      );
    }
    
    // If exact match exists, update metadata if different and return it
    if (exactMatch) {
      const needsUpdate = exactMatch.code !== code || 
                         exactMatch.vocabulary_uri !== vocabulary_uri;
      
      if (needsUpdate) {
        const { data: updatedTag, error: updateError } = await supabase
          .from('tags')
          .update({ 
            code, 
            vocabulary_uri: vocabulary_uri || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', exactMatch.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('Error updating tag metadata:', updateError);
          // Return existing tag even if update fails
          return NextResponse.json(exactMatch);
        }
        
        return NextResponse.json(updatedTag);
      }
      
      return NextResponse.json(exactMatch);
    }
    
    // Check if code exists with different name (potential conflict)
    if (code) {
      const { data: codeConflict } = await supabase
        .from('tags')
        .select('*')
        .eq('code', code)
        .eq('vocabulary', normalizedVocabulary)
        .neq('name', normalizedName)
        .maybeSingle();
      
      if (codeConflict) {
        return NextResponse.json(
          { 
            error: 'Tag code already exists with different name', 
            existingTag: codeConflict 
          },
          { status: 409 }
        );
      }
    }
    
    // === CREATE NEW TAG ===
    
    // Create new tag with IATI fields
    const baseTagData: any = {
      name: normalizedName,
      code: code,
      vocabulary: normalizedVocabulary
    };
    
    // Add vocabulary_uri if provided
    if (vocabulary_uri) {
      baseTagData.vocabulary_uri = vocabulary_uri;
    }
    
    // First attempt: try with created_by if provided
    if (created_by) {
      try {
        const { data: newTag, error: createError } = await supabase
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
          // If it's a race condition (duplicate), try fetching again
          if (createError.code === '23505') {
            const { data: raceTag } = await supabase
              .from('tags')
              .select('*')
              .eq('name', normalizedName)
              .eq('vocabulary', normalizedVocabulary)
              .single();
            
            if (raceTag) {
              return NextResponse.json(raceTag);
            }
          }
          throw createError;
        }
      } catch (error) {
        console.log('First attempt failed, trying without created_by field...');
      }
    }
    
    // Fallback: create tag without created_by field
    const { data: newTag, error: createError } = await supabase
      .from('tags')
      .insert([baseTagData])
      .select()
      .single();
    
    if (createError) {
      // Handle race condition - tag was created between our check and insert
      if (createError.code === '23505') {
        const { data: raceTag } = await supabase
          .from('tags')
          .select('*')
          .eq('name', normalizedName)
          .eq('vocabulary', normalizedVocabulary)
          .single();
        
        if (raceTag) {
          return NextResponse.json(raceTag);
        }
      }
      
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
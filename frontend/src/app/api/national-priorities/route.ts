import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { 
  NationalPriorityRow, 
  nationalPriorityFromRow,
  buildPriorityTree,
  buildPriorityPath
} from '@/types/national-priorities';

/**
 * GET /api/national-priorities
 * List all national priorities (optionally as a tree structure)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const searchParams = request.nextUrl.searchParams;
    
    // Query parameters
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const asTree = searchParams.get('asTree') !== 'false'; // Default to tree
    const parentId = searchParams.get('parentId');
    const level = searchParams.get('level');
    
    // Build query
    let query = supabase
      .from('national_priorities')
      .select('*')
      .order('display_order', { ascending: true })
      .order('code', { ascending: true });
    
    // Filter by active status
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    
    // Filter by parent
    if (parentId) {
      query = query.eq('parent_id', parentId);
    }
    
    // Filter by level
    if (level) {
      query = query.eq('level', parseInt(level));
    }
    
    const { data: rows, error } = await query;
    
    if (error) {
      console.error('[National Priorities API] Error fetching priorities:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    // Convert to frontend format
    const priorities = (rows as NationalPriorityRow[]).map(nationalPriorityFromRow);
    
    // Build paths for each priority
    priorities.forEach(p => {
      p.fullPath = buildPriorityPath(p.id, priorities);
    });
    
    // Return as tree or flat list
    const data = asTree ? buildPriorityTree(priorities) : priorities;
    
    return NextResponse.json({
      success: true,
      data,
      count: priorities.length,
    });
    
  } catch (error) {
    console.error('[National Priorities API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/national-priorities
 * Create a new national priority
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    
    const { code, name, nameLocal, description, parentId, isActive = true } = body;
    
    // Validate required fields
    if (!code?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Code is required' },
        { status: 400 }
      );
    }
    
    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }
    
    // Determine level based on parent
    let level = 1;
    if (parentId) {
      const { data: parent, error: parentError } = await supabase
        .from('national_priorities')
        .select('level')
        .eq('id', parentId)
        .single();
      
      if (parentError || !parent) {
        return NextResponse.json(
          { success: false, error: 'Parent priority not found' },
          { status: 400 }
        );
      }
      
      level = parent.level + 1;
      
      if (level > 5) {
        return NextResponse.json(
          { success: false, error: 'Maximum nesting level (5) exceeded' },
          { status: 400 }
        );
      }
    }
    
    // Get next display order
    const { data: maxOrder } = await supabase
      .from('national_priorities')
      .select('display_order')
      .eq('parent_id', parentId || null)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();
    
    const displayOrder = (maxOrder?.display_order || 0) + 1;
    
    // Insert new priority
    const { data: newPriority, error: insertError } = await supabase
      .from('national_priorities')
      .insert({
        code: code.trim(),
        name: name.trim(),
        name_local: nameLocal?.trim() || null,
        description: description?.trim() || null,
        parent_id: parentId || null,
        level,
        display_order: displayOrder,
        is_active: isActive,
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('[National Priorities API] Insert error:', insertError);
      
      // Handle unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'A priority with this code already exists at this level' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }
    
    const priority = nationalPriorityFromRow(newPriority as NationalPriorityRow);
    
    return NextResponse.json({
      success: true,
      data: priority,
    }, { status: 201 });
    
  } catch (error) {
    console.error('[National Priorities API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}


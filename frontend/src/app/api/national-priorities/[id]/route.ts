import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { 
  NationalPriorityRow, 
  nationalPriorityFromRow,
  buildPriorityPath
} from '@/types/national-priorities';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/national-priorities/[id]
 * Get a single national priority by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    
    // Get the priority
    const { data: row, error } = await supabase
      .from('national_priorities')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'National priority not found' },
          { status: 404 }
        );
      }
      console.error('[National Priority API] Error fetching priority:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    const priority = nationalPriorityFromRow(row as NationalPriorityRow);
    
    // Get all priorities to build full path
    const { data: allRows } = await supabase
      .from('national_priorities')
      .select('*');
    
    if (allRows) {
      const allPriorities = (allRows as NationalPriorityRow[]).map(nationalPriorityFromRow);
      priority.fullPath = buildPriorityPath(priority.id, allPriorities);
      
      // Get parent name
      if (priority.parentId) {
        const parent = allPriorities.find(p => p.id === priority.parentId);
        priority.parentName = parent?.name;
      }
    }
    
    // Get children count
    const { count: childrenCount } = await supabase
      .from('national_priorities')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', id);
    
    return NextResponse.json({
      success: true,
      data: priority,
      childrenCount: childrenCount || 0,
    });
    
  } catch (error) {
    console.error('[National Priority API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/national-priorities/[id]
 * Update a national priority
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    
    const { code, name, nameLocal, description, parentId, isActive, displayOrder } = body;
    
    // Check if priority exists
    const { data: existing, error: existingError } = await supabase
      .from('national_priorities')
      .select('*')
      .eq('id', id)
      .single();
    
    if (existingError || !existing) {
      return NextResponse.json(
        { success: false, error: 'National priority not found' },
        { status: 404 }
      );
    }
    
    // Build update object
    const updates: Partial<NationalPriorityRow> = {};
    
    if (code !== undefined) {
      if (!code?.trim()) {
        return NextResponse.json(
          { success: false, error: 'Code cannot be empty' },
          { status: 400 }
        );
      }
      updates.code = code.trim();
    }
    
    if (name !== undefined) {
      if (!name?.trim()) {
        return NextResponse.json(
          { success: false, error: 'Name cannot be empty' },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }
    
    if (nameLocal !== undefined) {
      updates.name_local = nameLocal?.trim() || null;
    }
    
    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }
    
    if (isActive !== undefined) {
      updates.is_active = isActive;
    }
    
    if (displayOrder !== undefined) {
      updates.display_order = displayOrder;
    }
    
    // Handle parent change (recalculate level)
    if (parentId !== undefined && parentId !== existing.parent_id) {
      // Prevent setting self as parent
      if (parentId === id) {
        return NextResponse.json(
          { success: false, error: 'A priority cannot be its own parent' },
          { status: 400 }
        );
      }
      
      // Check for circular reference
      if (parentId) {
        let currentParent = parentId;
        while (currentParent) {
          const { data: parent } = await supabase
            .from('national_priorities')
            .select('id, parent_id')
            .eq('id', currentParent)
            .single();
          
          if (parent?.id === id) {
            return NextResponse.json(
              { success: false, error: 'Circular reference detected' },
              { status: 400 }
            );
          }
          currentParent = parent?.parent_id;
        }
      }
      
      // Calculate new level
      let newLevel = 1;
      if (parentId) {
        const { data: parent } = await supabase
          .from('national_priorities')
          .select('level')
          .eq('id', parentId)
          .single();
        
        if (!parent) {
          return NextResponse.json(
            { success: false, error: 'Parent priority not found' },
            { status: 400 }
          );
        }
        
        newLevel = parent.level + 1;
        if (newLevel > 5) {
          return NextResponse.json(
            { success: false, error: 'Maximum nesting level (5) exceeded' },
            { status: 400 }
          );
        }
      }
      
      updates.parent_id = parentId || null;
      updates.level = newLevel;
      
      // Update children levels recursively
      await updateChildrenLevels(supabase, id, newLevel);
    }
    
    // Perform update
    const { data: updated, error: updateError } = await supabase
      .from('national_priorities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      console.error('[National Priority API] Update error:', updateError);
      
      if (updateError.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'A priority with this code already exists at this level' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }
    
    const priority = nationalPriorityFromRow(updated as NationalPriorityRow);
    
    return NextResponse.json({
      success: true,
      data: priority,
    });
    
  } catch (error) {
    console.error('[National Priority API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/national-priorities/[id]
 * Delete a national priority (and its children via CASCADE)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    
    // Check if priority exists
    const { data: existing, error: existingError } = await supabase
      .from('national_priorities')
      .select('id, name')
      .eq('id', id)
      .single();
    
    if (existingError || !existing) {
      return NextResponse.json(
        { success: false, error: 'National priority not found' },
        { status: 404 }
      );
    }
    
    // Check for children
    const { count: childrenCount } = await supabase
      .from('national_priorities')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', id);
    
    // Check for linked activities
    const { count: activitiesCount } = await supabase
      .from('activity_national_priorities')
      .select('*', { count: 'exact', head: true })
      .eq('national_priority_id', id);
    
    // If has children or activities, require confirmation
    const forceDelete = request.nextUrl.searchParams.get('force') === 'true';
    
    if (!forceDelete && ((childrenCount && childrenCount > 0) || (activitiesCount && activitiesCount > 0))) {
      return NextResponse.json({
        success: false,
        error: 'This priority has children or linked activities. Use force=true to delete anyway.',
        childrenCount: childrenCount || 0,
        activitiesCount: activitiesCount || 0,
        requiresConfirmation: true,
      }, { status: 400 });
    }
    
    // Delete the priority (children will cascade)
    const { error: deleteError } = await supabase
      .from('national_priorities')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      console.error('[National Priority API] Delete error:', deleteError);
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Priority "${existing.name}" deleted successfully`,
      deletedId: id,
    });
    
  } catch (error) {
    console.error('[National Priority API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Recursively update children levels when parent changes
 */
async function updateChildrenLevels(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  parentId: string,
  parentLevel: number
): Promise<void> {
  const { data: children } = await supabase
    .from('national_priorities')
    .select('id')
    .eq('parent_id', parentId);
  
  if (!children || children.length === 0) return;
  
  const childLevel = parentLevel + 1;
  
  for (const child of children) {
    await supabase
      .from('national_priorities')
      .update({ level: childLevel })
      .eq('id', child.id);
    
    await updateChildrenLevels(supabase, child.id, childLevel);
  }
}


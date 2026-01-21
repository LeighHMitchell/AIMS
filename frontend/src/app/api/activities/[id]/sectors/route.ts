import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { applyAutoMapping } from '@/lib/sector-budget-mapping-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: activityId } = await params;
    
    // Fetch existing sector allocations for this activity
    const { data: sectors, error } = await supabase
      .from('activity_sectors')
      .select('*')
      .eq('activity_id', activityId)
      .order('percentage', { ascending: false });

    if (error) {
      console.error('Error fetching sectors:', error);
      return NextResponse.json({ error: 'Failed to fetch sectors' }, { status: 500 });
    }

    return NextResponse.json({ sectors: sectors || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: activityId } = await params;
    const { sectors } = await request.json();

    // Validate total percentage
    const total = sectors.reduce((sum: number, s: any) => sum + s.percentage, 0);
    if (Math.abs(total - 100) > 0.01) {
      return NextResponse.json(
        { error: 'Sector allocations must sum to 100%' },
        { status: 400 }
      );
    }

    // Start a transaction to update sectors
    // First, delete existing sectors for this activity
    const { error: deleteError } = await supabase
      .from('activity_sectors')
      .delete()
      .eq('activity_id', activityId);

    if (deleteError) {
      console.error('Error deleting existing sectors:', deleteError);
      return NextResponse.json({ error: 'Failed to update sectors' }, { status: 500 });
    }

    // Insert new sectors
    const sectorsToInsert = sectors.map((s: any) => ({
      activity_id: activityId,
      dac5_code: s.dac5_code,
      dac5_name: s.dac5_name,
      dac3_code: s.dac3_code,
      dac3_name: s.dac3_name,
      percentage: s.percentage
    }));

    const { data: insertedSectors, error: insertError } = await supabase
      .from('activity_sectors')
      .insert(sectorsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting sectors:', insertError);
      return NextResponse.json({ error: 'Failed to save sectors' }, { status: 500 });
    }

    // Update activity updated_at timestamp
    const { error: updateError } = await supabase
      .from('activities')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', activityId);

    if (updateError) {
      console.error('Error updating activity timestamp:', updateError);
    }

    // Trigger auto-mapping from sectors to budget classifications
    // This runs async and doesn't block the response
    let autoMappingResult = null;
    try {
      // Get user ID from auth header if available, otherwise use a system user ID
      const userId = 'system'; // Auto-mapping triggered by sector change

      autoMappingResult = await applyAutoMapping(activityId, userId, {
        overwriteExisting: true, // When sectors change, update auto-mapped items
      });

      console.log('[Sectors API] Auto-mapping result:', {
        created: autoMappingResult.created,
        suggestions: autoMappingResult.suggestions.length,
        coverage: autoMappingResult.coveragePercent,
      });
    } catch (autoMapError) {
      // Log but don't fail - auto-mapping is a nice-to-have
      console.error('[Sectors API] Auto-mapping failed (non-blocking):', autoMapError);
    }

    return NextResponse.json({
      success: true,
      sectors: insertedSectors,
      message: 'Sectors saved successfully',
      autoMapping: autoMappingResult ? {
        created: autoMappingResult.created,
        coveragePercent: autoMappingResult.coveragePercent,
      } : null,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: activityId } = await params;
    const { sectors, replace = false } = await request.json();

    console.log('[Sectors API] POST request for activity:', activityId);
    console.log('[Sectors API] Sectors to import:', sectors);
    console.log('[Sectors API] Replace existing:', replace);

    // Validate total percentage
    const total = sectors.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      console.error('[Sectors API] Invalid total percentage:', total);
      return NextResponse.json(
        { error: `Sector allocations must sum to 100% (current: ${total}%)` },
        { status: 400 }
      );
    }

    // If replace is true, delete existing sectors first
    if (replace) {
      const { error: deleteError } = await supabase
        .from('activity_sectors')
        .delete()
        .eq('activity_id', activityId);

      if (deleteError) {
        console.error('[Sectors API] Error deleting existing sectors:', deleteError);
        return NextResponse.json({ error: 'Failed to clear existing sectors' }, { status: 500 });
      }
    }

    // Prepare sectors for insertion using the correct schema
    const sectorsToInsert = sectors.map((s: any) => {
      // Extract 3-digit category code from 5-digit sector code
      const categoryCode = s.sector_code?.substring(0, 3) || s.sector_code;
      
      return {
        activity_id: activityId,
        sector_code: s.sector_code,
        sector_name: s.sector_name,
        percentage: s.percentage,
        level: s.level || 'subsector', // Default to subsector for 5-digit codes
        category_code: categoryCode,
        category_name: s.category_name || `${categoryCode} - Category`, // Fallback
        type: s.type || 'secondary' // Default type
      };
    });

    console.log('[Sectors API] Prepared sectors for insertion:', sectorsToInsert);

    // Insert new sectors
    const { data: insertedSectors, error: insertError } = await supabase
      .from('activity_sectors')
      .insert(sectorsToInsert)
      .select();

    if (insertError) {
      console.error('[Sectors API] Error inserting sectors:', insertError);
      return NextResponse.json({ error: 'Failed to save sectors' }, { status: 500 });
    }

    // Update activity updated_at timestamp
    const { error: updateError } = await supabase
      .from('activities')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', activityId);

    if (updateError) {
      console.error('[Sectors API] Error updating activity timestamp:', updateError);
    }

    console.log('[Sectors API] Successfully inserted sectors:', insertedSectors);

    // Trigger auto-mapping from sectors to budget classifications
    let autoMappingResult = null;
    try {
      const userId = 'system'; // Auto-mapping triggered by sector import

      autoMappingResult = await applyAutoMapping(activityId, userId, {
        overwriteExisting: replace, // Only overwrite if replacing sectors
      });

      console.log('[Sectors API] Auto-mapping result:', {
        created: autoMappingResult.created,
        suggestions: autoMappingResult.suggestions.length,
        coverage: autoMappingResult.coveragePercent,
      });
    } catch (autoMapError) {
      // Log but don't fail - auto-mapping is a nice-to-have
      console.error('[Sectors API] Auto-mapping failed (non-blocking):', autoMapError);
    }

    return NextResponse.json({
      success: true,
      sectors: insertedSectors,
      message: `Successfully imported ${insertedSectors.length} sectors`,
      autoMapping: autoMappingResult ? {
        created: autoMappingResult.created,
        coveragePercent: autoMappingResult.coveragePercent,
      } : null,
    });
  } catch (error) {
    console.error('[Sectors API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
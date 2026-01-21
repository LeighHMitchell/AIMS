import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/admin/country-sectors
 * Get country sectors, optionally filtered by vocabulary
 */
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const vocabularyId = searchParams.get("vocabularyId");
    const activeOnly = searchParams.get("activeOnly") !== "false";
    const includeMappings = searchParams.get("includeMappings") === "true";

    let query = supabase
      .from("country_sectors")
      .select(includeMappings ? `
        *,
        vocabulary:country_sector_vocabularies(id, code, name),
        dac_mappings:country_sector_dac_mappings(*)
      ` : `
        *,
        vocabulary:country_sector_vocabularies(id, code, name)
      `)
      .order("sort_order")
      .order("code");

    if (vocabularyId) {
      query = query.eq("vocabulary_id", vocabularyId);
    }

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data: sectors, error } = await query;

    if (error) {
      console.error("[Country Sectors] Error fetching:", error);
      return NextResponse.json(
        { error: "Failed to fetch sectors", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: sectors || [],
      total: (sectors || []).length,
    });
  } catch (error) {
    console.error("[Country Sectors] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/country-sectors
 * Create a new country sector
 */
export async function POST(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { vocabularyId, code, name, description, parentCode, level, sortOrder } = body;

    if (!vocabularyId || !code || !name) {
      return NextResponse.json(
        { error: "Vocabulary ID, code, and name are required" },
        { status: 400 }
      );
    }

    // Verify vocabulary exists
    const { data: vocab } = await supabase
      .from("country_sector_vocabularies")
      .select("id")
      .eq("id", vocabularyId)
      .single();

    if (!vocab) {
      return NextResponse.json(
        { error: "Vocabulary not found" },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("country_sectors")
      .insert({
        vocabulary_id: vocabularyId,
        code: code.trim(),
        name: name.trim(),
        description: description?.trim() || null,
        parent_code: parentCode?.trim() || null,
        level: level || 1,
        sort_order: sortOrder || 0,
        is_active: true,
      })
      .select(`
        *,
        vocabulary:country_sector_vocabularies(id, code, name)
      `)
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A sector with this code already exists in this vocabulary" },
          { status: 409 }
        );
      }
      console.error("[Country Sectors] Error creating:", error);
      return NextResponse.json(
        { error: "Failed to create sector", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[Country Sectors] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/country-sectors (bulk update)
 * Update multiple sectors at once (for reordering)
 */
export async function PUT(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { sectors } = body;

    if (!Array.isArray(sectors) || sectors.length === 0) {
      return NextResponse.json(
        { error: "Sectors array is required" },
        { status: 400 }
      );
    }

    // Update each sector's sort order
    const updates = sectors.map((s: any, index: number) =>
      supabase
        .from("country_sectors")
        .update({ sort_order: s.sortOrder ?? index })
        .eq("id", s.id)
    );

    await Promise.all(updates);

    return NextResponse.json({
      success: true,
      message: `Updated ${sectors.length} sectors`,
    });
  } catch (error) {
    console.error("[Country Sectors] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

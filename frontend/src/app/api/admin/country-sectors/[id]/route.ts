import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/admin/country-sectors/:id
 * Get a single sector with its DAC mappings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const { data: sector, error } = await supabase
      .from("country_sectors")
      .select(`
        *,
        vocabulary:country_sector_vocabularies(id, code, name),
        dac_mappings:country_sector_dac_mappings(*)
      `)
      .eq("id", id)
      .single();

    if (error || !sector) {
      return NextResponse.json(
        { error: "Sector not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: sector,
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
 * PUT /api/admin/country-sectors/:id
 * Update a sector
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { code, name, description, parentCode, level, sortOrder, isActive } = body;

    const updateData: any = {};
    if (code !== undefined) updateData.code = code.trim();
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (parentCode !== undefined) updateData.parent_code = parentCode?.trim() || null;
    if (level !== undefined) updateData.level = level;
    if (sortOrder !== undefined) updateData.sort_order = sortOrder;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data, error } = await supabase
      .from("country_sectors")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        vocabulary:country_sector_vocabularies(id, code, name),
        dac_mappings:country_sector_dac_mappings(*)
      `)
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A sector with this code already exists in this vocabulary" },
          { status: 409 }
        );
      }
      console.error("[Country Sectors] Error updating:", error);
      return NextResponse.json(
        { error: "Failed to update sector", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Sector not found" },
        { status: 404 }
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
 * DELETE /api/admin/country-sectors/:id
 * Delete a sector (and its DAC mappings via cascade)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const { error } = await supabase
      .from("country_sectors")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Country Sectors] Error deleting:", error);
      return NextResponse.json(
        { error: "Failed to delete sector", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Sector deleted successfully",
    });
  } catch (error) {
    console.error("[Country Sectors] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

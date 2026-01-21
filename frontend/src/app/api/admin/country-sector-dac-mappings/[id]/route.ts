import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth';

/**
 * PUT /api/admin/country-sector-dac-mappings/:id
 * Update a single DAC mapping
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { dacSectorCode, dacSectorName, percentage, isPrimary, notes } = body;

    const updateData: any = {};
    if (dacSectorCode !== undefined) updateData.dac_sector_code = dacSectorCode.trim();
    if (dacSectorName !== undefined) updateData.dac_sector_name = dacSectorName?.trim() || null;
    if (percentage !== undefined) updateData.percentage = percentage;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    // Handle primary flag
    if (isPrimary !== undefined) {
      updateData.is_primary = isPrimary;

      // If setting as primary, unset any existing primary for this sector
      if (isPrimary) {
        // Get the country_sector_id first
        const { data: existingMapping } = await supabase
          .from("country_sector_dac_mappings")
          .select("country_sector_id")
          .eq("id", id)
          .single();

        if (existingMapping) {
          await supabase
            .from("country_sector_dac_mappings")
            .update({ is_primary: false })
            .eq("country_sector_id", existingMapping.country_sector_id)
            .eq("is_primary", true)
            .neq("id", id);
        }
      }
    }

    const { data, error } = await supabase
      .from("country_sector_dac_mappings")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        country_sector:country_sectors(
          id,
          code,
          name,
          vocabulary:country_sector_vocabularies(id, code, name)
        )
      `)
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "This DAC sector is already mapped to this country sector" },
          { status: 409 }
        );
      }
      console.error("[Country Sector DAC Mappings] Error updating:", error);
      return NextResponse.json(
        { error: "Failed to update mapping", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Mapping not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[Country Sector DAC Mappings] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/country-sector-dac-mappings/:id
 * Delete a DAC mapping
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const { error } = await supabase
      .from("country_sector_dac_mappings")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Country Sector DAC Mappings] Error deleting:", error);
      return NextResponse.json(
        { error: "Failed to delete mapping", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Mapping deleted successfully",
    });
  } catch (error) {
    console.error("[Country Sector DAC Mappings] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

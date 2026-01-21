import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/admin/country-sector-dac-mappings
 * Get DAC mappings, optionally filtered by country sector
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
    const countrySectorId = searchParams.get("countrySectorId");
    const vocabularyId = searchParams.get("vocabularyId");

    let query = supabase
      .from("country_sector_dac_mappings")
      .select(`
        *,
        country_sector:country_sectors(
          id,
          code,
          name,
          vocabulary_id,
          vocabulary:country_sector_vocabularies(id, code, name)
        )
      `)
      .order("is_primary", { ascending: false })
      .order("percentage", { ascending: false });

    if (countrySectorId) {
      query = query.eq("country_sector_id", countrySectorId);
    }

    // If filtering by vocabulary, need to join through country_sectors
    if (vocabularyId && !countrySectorId) {
      // Get sector IDs for this vocabulary first
      const { data: sectors } = await supabase
        .from("country_sectors")
        .select("id")
        .eq("vocabulary_id", vocabularyId);

      if (sectors && sectors.length > 0) {
        const sectorIds = sectors.map((s: any) => s.id);
        query = query.in("country_sector_id", sectorIds);
      } else {
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
        });
      }
    }

    const { data: mappings, error } = await query;

    if (error) {
      console.error("[Country Sector DAC Mappings] Error fetching:", error);
      return NextResponse.json(
        { error: "Failed to fetch mappings", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: mappings || [],
      total: (mappings || []).length,
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
 * POST /api/admin/country-sector-dac-mappings
 * Create a new DAC mapping for a country sector
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
    const { countrySectorId, dacSectorCode, dacSectorName, percentage, isPrimary, notes } = body;

    if (!countrySectorId || !dacSectorCode) {
      return NextResponse.json(
        { error: "Country sector ID and DAC sector code are required" },
        { status: 400 }
      );
    }

    // Verify country sector exists
    const { data: sector } = await supabase
      .from("country_sectors")
      .select("id")
      .eq("id", countrySectorId)
      .single();

    if (!sector) {
      return NextResponse.json(
        { error: "Country sector not found" },
        { status: 404 }
      );
    }

    // If setting as primary, unset any existing primary for this sector
    if (isPrimary) {
      await supabase
        .from("country_sector_dac_mappings")
        .update({ is_primary: false })
        .eq("country_sector_id", countrySectorId)
        .eq("is_primary", true);
    }

    const { data, error } = await supabase
      .from("country_sector_dac_mappings")
      .insert({
        country_sector_id: countrySectorId,
        dac_sector_code: dacSectorCode.trim(),
        dac_sector_name: dacSectorName?.trim() || null,
        percentage: percentage || 100,
        is_primary: isPrimary ?? true,
        notes: notes?.trim() || null,
      })
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
      console.error("[Country Sector DAC Mappings] Error creating:", error);
      return NextResponse.json(
        { error: "Failed to create mapping", details: error.message },
        { status: 500 }
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
 * PUT /api/admin/country-sector-dac-mappings (bulk operations)
 * Replace all DAC mappings for a country sector
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
    const { countrySectorId, mappings } = body;

    if (!countrySectorId || !Array.isArray(mappings)) {
      return NextResponse.json(
        { error: "Country sector ID and mappings array are required" },
        { status: 400 }
      );
    }

    // Validate percentages sum to 100 if there are multiple mappings
    if (mappings.length > 0) {
      const totalPercentage = mappings.reduce((sum: number, m: any) => sum + (m.percentage || 100), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        return NextResponse.json(
          { error: `Mapping percentages must sum to 100% (currently ${totalPercentage}%)` },
          { status: 400 }
        );
      }
    }

    // Delete existing mappings
    await supabase
      .from("country_sector_dac_mappings")
      .delete()
      .eq("country_sector_id", countrySectorId);

    // Insert new mappings
    if (mappings.length > 0) {
      const mappingsToInsert = mappings.map((m: any, index: number) => ({
        country_sector_id: countrySectorId,
        dac_sector_code: m.dacSectorCode.trim(),
        dac_sector_name: m.dacSectorName?.trim() || null,
        percentage: m.percentage || 100,
        is_primary: index === 0, // First mapping is primary
        notes: m.notes?.trim() || null,
      }));

      const { error: insertError } = await supabase
        .from("country_sector_dac_mappings")
        .insert(mappingsToInsert);

      if (insertError) {
        console.error("[Country Sector DAC Mappings] Error inserting:", insertError);
        return NextResponse.json(
          { error: "Failed to create mappings", details: insertError.message },
          { status: 500 }
        );
      }
    }

    // Fetch updated mappings
    const { data: updatedMappings } = await supabase
      .from("country_sector_dac_mappings")
      .select("*")
      .eq("country_sector_id", countrySectorId)
      .order("is_primary", { ascending: false });

    return NextResponse.json({
      success: true,
      data: updatedMappings || [],
      message: `Updated ${mappings.length} mapping(s)`,
    });
  } catch (error) {
    console.error("[Country Sector DAC Mappings] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

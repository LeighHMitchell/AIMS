import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/admin/country-sector-vocabularies
 * Get all country-specific sector vocabularies
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const includeStats = searchParams.get("includeStats") === "true";

    let query = supabase
      .from("country_sector_vocabularies")
      .select("*")
      .order("name");

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data: vocabularies, error } = await query;

    if (error) {
      console.error("[Country Sector Vocabularies] Error fetching:", error);
      return NextResponse.json(
        { error: "Failed to fetch vocabularies", details: error.message },
        { status: 500 }
      );
    }

    // Optionally include sector counts
    if (includeStats && vocabularies && vocabularies.length > 0) {
      const vocabIds = vocabularies.map((v: any) => v.id);

      const { data: sectorCounts, error: countError } = await supabase
        .from("country_sectors")
        .select("vocabulary_id")
        .in("vocabulary_id", vocabIds)
        .eq("is_active", true);

      if (!countError && sectorCounts) {
        const countMap: Record<string, number> = {};
        sectorCounts.forEach((s: any) => {
          countMap[s.vocabulary_id] = (countMap[s.vocabulary_id] || 0) + 1;
        });

        vocabularies.forEach((v: any) => {
          v.sector_count = countMap[v.id] || 0;
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: vocabularies || [],
      total: (vocabularies || []).length,
    });
  } catch (error) {
    console.error("[Country Sector Vocabularies] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/country-sector-vocabularies
 * Create a new country-specific vocabulary
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { code, name, description, countryCode, version, vocabularyType, vocabularyUri, isDefault } = body;

    if (!code || !name) {
      return NextResponse.json(
        { error: "Code and name are required" },
        { status: 400 }
      );
    }

    const vocabType = vocabularyType || "sector";

    // If setting as default, unset any existing default for THIS vocabulary type only
    if (isDefault) {
      await supabase
        .from("country_sector_vocabularies")
        .update({ is_default: false })
        .eq("is_default", true)
        .eq("vocabulary_type", vocabType);
    }

    const { data, error } = await supabase
      .from("country_sector_vocabularies")
      .insert({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description?.trim() || null,
        country_code: countryCode?.trim().toUpperCase() || null,
        version: version?.trim() || null,
        vocabulary_type: vocabType,
        vocabulary_uri: vocabularyUri?.trim() || null,
        is_default: isDefault || false,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A vocabulary with this code already exists" },
          { status: 409 }
        );
      }
      console.error("[Country Sector Vocabularies] Error creating:", error);
      return NextResponse.json(
        { error: "Failed to create vocabulary", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[Country Sector Vocabularies] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/admin/country-sector-vocabularies/:id
 * Get a single vocabulary with its sectors
 */
export async function GET(
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

    const { searchParams } = new URL(request.url);
    const includeSectors = searchParams.get("includeSectors") !== "false";

    // Get vocabulary
    const { data: vocabulary, error: vocabError } = await supabase
      .from("country_sector_vocabularies")
      .select("*")
      .eq("id", id)
      .single();

    if (vocabError || !vocabulary) {
      return NextResponse.json(
        { error: "Vocabulary not found" },
        { status: 404 }
      );
    }

    // Optionally get sectors
    if (includeSectors) {
      const { data: sectors, error: sectorsError } = await supabase
        .from("country_sectors")
        .select(`
          *,
          dac_mappings:country_sector_dac_mappings(*)
        `)
        .eq("vocabulary_id", id)
        .eq("is_active", true)
        .order("sort_order")
        .order("code");

      if (!sectorsError) {
        vocabulary.sectors = sectors || [];
      }
    }

    return NextResponse.json({
      success: true,
      data: vocabulary,
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
 * PUT /api/admin/country-sector-vocabularies/:id
 * Update a vocabulary
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
    const { code, name, description, countryCode, version, vocabularyType, vocabularyUri, isActive, isDefault } = body;

    // Get current vocabulary to know its type
    const { data: current } = await supabase
      .from("country_sector_vocabularies")
      .select("vocabulary_type")
      .eq("id", id)
      .single();

    const vocabType = vocabularyType || current?.vocabulary_type || "sector";

    const updateData: any = {};
    if (code !== undefined) updateData.code = code.trim().toUpperCase();
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (countryCode !== undefined) updateData.country_code = countryCode?.trim().toUpperCase() || null;
    if (version !== undefined) updateData.version = version?.trim() || null;
    if (vocabularyType !== undefined) updateData.vocabulary_type = vocabularyType;
    if (vocabularyUri !== undefined) updateData.vocabulary_uri = vocabularyUri?.trim() || null;
    if (isActive !== undefined) updateData.is_active = isActive;
    if (isDefault !== undefined) {
      updateData.is_default = isDefault;
      // If setting as default, unset any existing default for THIS vocabulary type only
      if (isDefault) {
        await supabase
          .from("country_sector_vocabularies")
          .update({ is_default: false })
          .eq("is_default", true)
          .eq("vocabulary_type", vocabType)
          .neq("id", id);
      }
    }

    const { data, error } = await supabase
      .from("country_sector_vocabularies")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A vocabulary with this code already exists" },
          { status: 409 }
        );
      }
      console.error("[Country Sector Vocabularies] Error updating:", error);
      return NextResponse.json(
        { error: "Failed to update vocabulary", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Vocabulary not found" },
        { status: 404 }
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

/**
 * DELETE /api/admin/country-sector-vocabularies/:id
 * Delete a vocabulary (and all its sectors via cascade)
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

    // Check if vocabulary has sectors
    const { data: sectors } = await supabase
      .from("country_sectors")
      .select("id")
      .eq("vocabulary_id", id)
      .limit(1);

    if (sectors && sectors.length > 0) {
      // Soft delete by marking inactive, or warn user
      const { searchParams } = new URL(request.url);
      const force = searchParams.get("force") === "true";

      if (!force) {
        return NextResponse.json(
          {
            error: "Vocabulary has sectors. Use force=true to delete everything, or remove sectors first.",
            hasSectors: true,
          },
          { status: 400 }
        );
      }
    }

    const { error } = await supabase
      .from("country_sector_vocabularies")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Country Sector Vocabularies] Error deleting:", error);
      return NextResponse.json(
        { error: "Failed to delete vocabulary", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Vocabulary deleted successfully",
    });
  } catch (error) {
    console.error("[Country Sector Vocabularies] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

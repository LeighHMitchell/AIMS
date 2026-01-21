import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth';
import {
  SectorBudgetMappingRow,
  toSectorBudgetMapping,
} from "@/types/aid-on-budget";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/sector-mappings/[id]
 * Get a single sector-to-budget mapping by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("sector_budget_mappings")
      .select(`
        *,
        budget_classifications (
          id,
          code,
          name,
          name_local,
          description,
          classification_type,
          parent_id,
          level,
          is_active,
          sort_order
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { success: false, error: "Mapping not found" },
          { status: 404 }
        );
      }
      console.error("[sector-mappings] Error fetching mapping:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: toSectorBudgetMapping(data as SectorBudgetMappingRow),
    });
  } catch (error: any) {
    console.error("[sector-mappings] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/sector-mappings/[id]
 * Update a sector-to-budget mapping
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const {
      sectorCode,
      sectorName,
      budgetClassificationId,
      percentage,
      isDefault,
      isCategoryLevel,
      notes,
    } = body;

    // Check if mapping exists
    const { data: existing, error: existError } = await supabase
      .from("sector_budget_mappings")
      .select("id")
      .eq("id", id)
      .single();

    if (existError || !existing) {
      return NextResponse.json(
        { success: false, error: "Mapping not found" },
        { status: 404 }
      );
    }

    // If changing budget classification, verify it exists
    if (budgetClassificationId) {
      const { data: classification, error: classError } = await supabase
        .from("budget_classifications")
        .select("id")
        .eq("id", budgetClassificationId)
        .single();

      if (classError || !classification) {
        return NextResponse.json(
          { success: false, error: "Budget classification not found" },
          { status: 404 }
        );
      }
    }

    // Build update object
    const updateData: Partial<SectorBudgetMappingRow> = {};
    if (sectorCode !== undefined) updateData.sector_code = sectorCode;
    if (sectorName !== undefined) updateData.sector_name = sectorName;
    if (budgetClassificationId !== undefined)
      updateData.budget_classification_id = budgetClassificationId;
    if (percentage !== undefined) updateData.percentage = percentage;
    if (isDefault !== undefined) updateData.is_default = isDefault;
    if (isCategoryLevel !== undefined)
      updateData.is_category_level = isCategoryLevel;
    if (notes !== undefined) updateData.notes = notes;

    // Update
    const { data, error } = await supabase
      .from("sector_budget_mappings")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        budget_classifications (
          id,
          code,
          name,
          name_local,
          description,
          classification_type,
          parent_id,
          level,
          is_active,
          sort_order
        )
      `)
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: "A mapping already exists for this sector and budget classification combination",
          },
          { status: 409 }
        );
      }

      console.error("[sector-mappings] Error updating mapping:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: toSectorBudgetMapping(data as SectorBudgetMappingRow),
    });
  } catch (error: any) {
    console.error("[sector-mappings] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/sector-mappings/[id]
 * Delete a sector-to-budget mapping
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id } = await params;
    // Check if mapping exists
    const { data: existing, error: existError } = await supabase
      .from("sector_budget_mappings")
      .select("id, sector_code")
      .eq("id", id)
      .single();

    if (existError || !existing) {
      return NextResponse.json(
        { success: false, error: "Mapping not found" },
        { status: 404 }
      );
    }

    // Delete the mapping
    const { error } = await supabase
      .from("sector_budget_mappings")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[sector-mappings] Error deleting mapping:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Mapping for sector ${existing.sector_code} deleted successfully`,
    });
  } catch (error: any) {
    console.error("[sector-mappings] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

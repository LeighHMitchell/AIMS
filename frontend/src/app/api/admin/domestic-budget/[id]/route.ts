import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * DELETE /api/admin/domestic-budget/[id]
 * Delete a domestic budget entry by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    // Verify the entry exists
    const { data: existing, error: findError } = await supabase
      .from("domestic_budget_data")
      .select("id, fiscal_year, budget_classifications(code, name)")
      .eq("id", id)
      .single();

    if (findError || !existing) {
      return NextResponse.json(
        { error: "Domestic budget entry not found" },
        { status: 404 }
      );
    }

    // Delete the entry
    const { error } = await supabase
      .from("domestic_budget_data")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Domestic Budget] Error deleting:", error);
      return NextResponse.json(
        { error: "Failed to delete domestic budget entry", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Domestic budget entry deleted successfully",
    });
  } catch (error) {
    console.error("[Domestic Budget] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/domestic-budget/[id]
 * Get a specific domestic budget entry by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("domestic_budget_data")
      .select(`
        *,
        budget_classifications (
          id,
          code,
          name,
          classification_type,
          level
        )
      `)
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Domestic budget entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[Domestic Budget] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

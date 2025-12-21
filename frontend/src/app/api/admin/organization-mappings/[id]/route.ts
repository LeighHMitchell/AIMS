import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * PUT /api/admin/organization-mappings/[id]
 * Update an organization funding source mapping
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
    const { budgetClassificationId, notes } = body;

    if (!budgetClassificationId) {
      return NextResponse.json(
        { error: "Budget classification ID is required" },
        { status: 400 }
      );
    }

    // Verify the classification is a funding_sources type
    const { data: classification } = await supabase
      .from("budget_classifications")
      .select("classification_type")
      .eq("id", budgetClassificationId)
      .single();

    if (!classification || classification.classification_type !== "funding_sources") {
      return NextResponse.json(
        { error: "Budget classification must be of type 'funding_sources'" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("organization_funding_source_mappings")
      .update({
        budget_classification_id: budgetClassificationId,
        notes,
      })
      .eq("id", id)
      .select(`
        id,
        organization_id,
        budget_classification_id,
        notes,
        budget_classifications (
          id,
          code,
          name,
          classification_type
        )
      `)
      .single();

    if (error) {
      console.error("[Organization Mappings] Error updating:", error);
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
      data: {
        id: data.id,
        organizationId: data.organization_id,
        budgetClassificationId: data.budget_classification_id,
        budgetClassification: data.budget_classifications,
        notes: data.notes,
      },
    });
  } catch (error) {
    console.error("[Organization Mappings] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/organization-mappings/[id]
 * Delete an organization funding source mapping
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
      .from("organization_funding_source_mappings")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Organization Mappings] Error deleting:", error);
      return NextResponse.json(
        { error: "Failed to delete mapping", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Mapping deleted",
    });
  } catch (error) {
    console.error("[Organization Mappings] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

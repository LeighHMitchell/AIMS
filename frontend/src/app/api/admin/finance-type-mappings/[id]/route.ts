import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * PUT /api/admin/finance-type-mappings/[id]
 * Update a finance type mapping
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

    // Get existing mapping to check classification type
    const { data: existing } = await supabase
      .from("finance_type_classification_mappings")
      .select("classification_type")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Mapping not found" },
        { status: 404 }
      );
    }

    // Verify the classification matches the type
    const { data: classification } = await supabase
      .from("budget_classifications")
      .select("classification_type")
      .eq("id", budgetClassificationId)
      .single();

    if (!classification || classification.classification_type !== existing.classification_type) {
      return NextResponse.json(
        { error: `Budget classification must be of type '${existing.classification_type}'` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("finance_type_classification_mappings")
      .update({
        budget_classification_id: budgetClassificationId,
        notes,
      })
      .eq("id", id)
      .select(`
        id,
        finance_type_code,
        finance_type_name,
        budget_classification_id,
        classification_type,
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
      console.error("[Finance Type Mappings] Error updating:", error);
      return NextResponse.json(
        { error: "Failed to update mapping", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        financeTypeCode: data.finance_type_code,
        financeTypeName: data.finance_type_name,
        budgetClassificationId: data.budget_classification_id,
        budgetClassification: data.budget_classifications,
        classificationType: data.classification_type,
        notes: data.notes,
      },
    });
  } catch (error) {
    console.error("[Finance Type Mappings] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/finance-type-mappings/[id]
 * Delete a finance type mapping
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
      .from("finance_type_classification_mappings")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Finance Type Mappings] Error deleting:", error);
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
    console.error("[Finance Type Mappings] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

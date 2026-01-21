import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth';
import {
  BudgetClassificationRow,
  toBudgetClassification,
  ClassificationType,
} from "@/types/aid-on-budget";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/budget-classifications/[id]
 * Get a single budget classification by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { id } = await params;
    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from("budget_classifications")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Budget classification not found" },
          { status: 404 }
        );
      }
      console.error("[Budget Classifications] Error fetching:", error);
      return NextResponse.json(
        { error: "Failed to fetch budget classification", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: toBudgetClassification(data as BudgetClassificationRow),
    });
  } catch (error) {
    console.error("[Budget Classifications] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/budget-classifications/[id]
 * Update a budget classification
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { id } = await params;
    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      code,
      name,
      nameLocal,
      description,
      classificationType,
      parentId,
      isActive,
      sortOrder,
    } = body;

    // Build update object with only provided fields
    const updateData: Partial<BudgetClassificationRow> = {};

    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (nameLocal !== undefined) updateData.name_local = nameLocal;
    if (description !== undefined) updateData.description = description;
    if (classificationType !== undefined) {
      const validTypes: ClassificationType[] = ["administrative", "functional", "economic", "programme"];
      if (!validTypes.includes(classificationType)) {
        return NextResponse.json(
          { error: `Invalid classification type. Must be one of: ${validTypes.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.classification_type = classificationType;
    }
    if (parentId !== undefined) updateData.parent_id = parentId || undefined;
    if (isActive !== undefined) updateData.is_active = isActive;
    if (sortOrder !== undefined) updateData.sort_order = sortOrder;

    // Recalculate level if parent changed
    if (parentId !== undefined) {
      if (parentId) {
        const { data: parent } = await supabase
          .from("budget_classifications")
          .select("level")
          .eq("id", parentId)
          .single();

        if (parent) {
          updateData.level = parent.level + 1;
        }
      } else {
        updateData.level = 1;
      }
    }

    const { data, error } = await supabase
      .from("budget_classifications")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Budget classification not found" },
          { status: 404 }
        );
      }
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A classification with this code and type already exists" },
          { status: 409 }
        );
      }
      console.error("[Budget Classifications] Error updating:", error);
      return NextResponse.json(
        { error: "Failed to update budget classification", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: toBudgetClassification(data as BudgetClassificationRow),
    });
  } catch (error) {
    console.error("[Budget Classifications] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/budget-classifications/[id]
 * Delete a budget classification (will cascade to children)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { id } = await params;
    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    // Check if there are any sector mappings using this classification
    const { data: mappings } = await supabase
      .from("sector_budget_mappings")
      .select("id")
      .eq("budget_classification_id", id)
      .limit(1);

    if (mappings && mappings.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete classification that has sector mappings. Remove the mappings first." },
        { status: 409 }
      );
    }

    // Check if there are any country_budget_items using this code
    // Note: This check is approximate since budget_items uses code, not id
    const { data: classification } = await supabase
      .from("budget_classifications")
      .select("code")
      .eq("id", id)
      .single();

    if (classification) {
      const { data: budgetItems } = await supabase
        .from("budget_items")
        .select("id")
        .eq("code", classification.code)
        .limit(1);

      if (budgetItems && budgetItems.length > 0) {
        return NextResponse.json(
          { error: "Cannot delete classification that is used in activity budget items." },
          { status: 409 }
        );
      }
    }

    const { error } = await supabase
      .from("budget_classifications")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Budget Classifications] Error deleting:", error);
      return NextResponse.json(
        { error: "Failed to delete budget classification", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Budget classification deleted successfully",
    });
  } catch (error) {
    console.error("[Budget Classifications] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/admin/aid-effectiveness-options/[id]
 * Update an option
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
    const { label, description, sortOrder, isActive } = body;

    const updateData: Record<string, unknown> = {};

    if (label !== undefined) {
      if (!label.trim()) {
        return NextResponse.json(
          { error: "Label cannot be empty" },
          { status: 400 }
        );
      }
      updateData.label = label.trim();
    }

    if (description !== undefined) {
      updateData.description = description || null;
    }

    if (sortOrder !== undefined) {
      updateData.sort_order = sortOrder;
    }

    if (isActive !== undefined) {
      updateData.is_active = isActive;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("aid_effectiveness_options")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Option not found" },
          { status: 404 }
        );
      }
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "An option with this label already exists in this category" },
          { status: 409 }
        );
      }
      console.error("[AE Options] Error updating:", error);
      return NextResponse.json(
        { error: "Failed to update option", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[AE Options] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/aid-effectiveness-options/[id]
 * Delete an option
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

    const { error } = await supabase
      .from("aid_effectiveness_options")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[AE Options] Error deleting:", error);
      return NextResponse.json(
        { error: "Failed to delete option", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Option deleted successfully",
    });
  } catch (error) {
    console.error("[AE Options] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { CustomYearRow, toCustomYear } from "@/types/custom-years";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/custom-years/[id]
 * Get a single custom year by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from("custom_years")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Custom year not found" },
          { status: 404 }
        );
      }
      console.error("[Custom Years] Error fetching:", error);
      return NextResponse.json(
        { error: "Failed to fetch custom year", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: toCustomYear(data as CustomYearRow),
    });
  } catch (error) {
    console.error("[Custom Years] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/custom-years/[id]
 * Update a custom year
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const {
      name,
      shortName,
      startMonth,
      startDay,
      endMonth,
      endDay,
      isActive,
      isDefault,
      displayOrder,
    } = body;

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { error: "Name cannot be empty" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (shortName !== undefined) {
      updateData.short_name = shortName?.trim() || null;
    }

    if (startMonth !== undefined) {
      if (startMonth < 1 || startMonth > 12) {
        return NextResponse.json(
          { error: "Start month must be between 1 and 12" },
          { status: 400 }
        );
      }
      updateData.start_month = startMonth;
    }

    if (startDay !== undefined) {
      if (startDay < 1 || startDay > 31) {
        return NextResponse.json(
          { error: "Start day must be between 1 and 31" },
          { status: 400 }
        );
      }
      updateData.start_day = startDay;
    }

    if (endMonth !== undefined) {
      if (endMonth < 1 || endMonth > 12) {
        return NextResponse.json(
          { error: "End month must be between 1 and 12" },
          { status: 400 }
        );
      }
      updateData.end_month = endMonth;
    }

    if (endDay !== undefined) {
      if (endDay < 1 || endDay > 31) {
        return NextResponse.json(
          { error: "End day must be between 1 and 31" },
          { status: 400 }
        );
      }
      updateData.end_day = endDay;
    }

    if (isActive !== undefined) {
      updateData.is_active = isActive;
    }

    if (displayOrder !== undefined) {
      updateData.display_order = displayOrder;
    }

    // Handle default setting - must unset others first
    if (isDefault !== undefined) {
      if (isDefault) {
        // Unset any existing default
        await supabase
          .from("custom_years")
          .update({ is_default: false })
          .eq("is_default", true)
          .neq("id", id);
      }
      updateData.is_default = isDefault;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("custom_years")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Custom year not found" },
          { status: 404 }
        );
      }
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A custom year with this name already exists" },
          { status: 409 }
        );
      }
      console.error("[Custom Years] Error updating:", error);
      return NextResponse.json(
        { error: "Failed to update custom year", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: toCustomYear(data as CustomYearRow),
    });
  } catch (error) {
    console.error("[Custom Years] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/custom-years/[id]
 * Delete a custom year
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    // Check if this is the default year
    const { data: existing } = await supabase
      .from("custom_years")
      .select("is_default, name")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Custom year not found" },
        { status: 404 }
      );
    }

    if (existing.is_default) {
      return NextResponse.json(
        { error: "Cannot delete the default custom year. Set another year as default first." },
        { status: 400 }
      );
    }

    // Check if this is the last active year
    const { count } = await supabase
      .from("custom_years")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (count !== null && count <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last active custom year" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("custom_years")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Custom Years] Error deleting:", error);
      return NextResponse.json(
        { error: "Failed to delete custom year", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Custom year deleted successfully",
    });
  } catch (error) {
    console.error("[Custom Years] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

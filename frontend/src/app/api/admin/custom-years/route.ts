import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { CustomYearRow, toCustomYear } from "@/types/custom-years";

/**
 * GET /api/admin/custom-years
 * List all custom years ordered by display_order
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

    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get("activeOnly") !== "false";

    let query = supabase
      .from("custom_years")
      .select("*")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Custom Years] Error fetching:", error);
      return NextResponse.json(
        { error: "Failed to fetch custom years", details: error.message },
        { status: 500 }
      );
    }

    const customYears = (data as CustomYearRow[]).map(toCustomYear);

    return NextResponse.json({
      success: true,
      data: customYears,
      total: customYears.length,
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
 * POST /api/admin/custom-years
 * Create a new custom year
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
    const {
      name,
      shortName,
      startMonth,
      startDay,
      endMonth,
      endDay,
      isActive = true,
      isDefault = false,
      displayOrder = 0,
    } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!startMonth || !endMonth || !startDay || !endDay) {
      return NextResponse.json(
        { error: "Start month, start day, end month, and end day are required" },
        { status: 400 }
      );
    }

    if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12) {
      return NextResponse.json(
        { error: "Month values must be between 1 and 12" },
        { status: 400 }
      );
    }

    if (startDay < 1 || startDay > 31 || endDay < 1 || endDay > 31) {
      return NextResponse.json(
        { error: "Day values must be between 1 and 31" },
        { status: 400 }
      );
    }

    // If setting as default, first unset any existing default
    if (isDefault) {
      await supabase
        .from("custom_years")
        .update({ is_default: false })
        .eq("is_default", true);
    }

    const { data, error } = await supabase
      .from("custom_years")
      .insert({
        name: name.trim(),
        short_name: shortName?.trim() || null,
        start_month: startMonth,
        start_day: startDay,
        end_month: endMonth,
        end_day: endDay,
        is_active: isActive,
        is_default: isDefault,
        display_order: displayOrder,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A custom year with this name already exists" },
          { status: 409 }
        );
      }
      console.error("[Custom Years] Error creating:", error);
      return NextResponse.json(
        { error: "Failed to create custom year", details: error.message },
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

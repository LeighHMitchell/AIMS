import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/admin/aid-effectiveness-options
 * List aid effectiveness dropdown options, optionally filtered by category
 */
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const activeOnly = searchParams.get("activeOnly") !== "false";

    let query = supabase
      .from("aid_effectiveness_options")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });

    if (category) {
      query = query.eq("category", category);
    }

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[AE Options] Error fetching:", error);
      return NextResponse.json(
        { error: "Failed to fetch options", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total: data?.length || 0,
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
 * POST /api/admin/aid-effectiveness-options
 * Create a new option
 */
export async function POST(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      category,
      label,
      description,
      sortOrder = 0,
      isActive = true,
      responsibleMinistries,
      acronym,
      startDate,
      startDatePrecision,
      endDate,
      endDatePrecision,
    } = body;

    if (!category || !category.trim()) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    if (!label || !label.trim()) {
      return NextResponse.json(
        { error: "Label is required" },
        { status: 400 }
      );
    }

    const validCategories = [
      "includedInNationalPlan",
      "linkedToGovFramework",
      "mutualAccountabilityFramework",
      "capacityDevFromNationalPlan",
    ];

    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate precision values
    const validPrecisions = ["year", "month", "day"];
    if (startDatePrecision && !validPrecisions.includes(startDatePrecision)) {
      return NextResponse.json(
        { error: "Invalid startDatePrecision. Must be year, month, or day" },
        { status: 400 }
      );
    }
    if (endDatePrecision && !validPrecisions.includes(endDatePrecision)) {
      return NextResponse.json(
        { error: "Invalid endDatePrecision. Must be year, month, or day" },
        { status: 400 }
      );
    }

    // Build the JSONB array for the denormalized column
    const ministriesJson = Array.isArray(responsibleMinistries)
      ? responsibleMinistries.map((m: { id: string; code: string; name: string }) => ({
          id: m.id,
          code: m.code,
          name: m.name,
        }))
      : [];

    const { data, error } = await supabase
      .from("aid_effectiveness_options")
      .insert({
        category: category.trim(),
        label: label.trim(),
        description: description || null,
        sort_order: sortOrder,
        is_active: isActive,
        responsible_ministries: ministriesJson,
        acronym: acronym?.trim() || null,
        start_date: startDate || null,
        start_date_precision: startDate ? (startDatePrecision || "day") : null,
        end_date: endDate || null,
        end_date_precision: endDate ? (endDatePrecision || "day") : null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "An option with this label already exists in this category" },
          { status: 409 }
        );
      }
      console.error("[AE Options] Error creating:", error);
      return NextResponse.json(
        { error: "Failed to create option", details: error.message },
        { status: 500 }
      );
    }

    // Sync junction table
    if (data && ministriesJson.length > 0) {
      const junctionRows = ministriesJson.map((m: { id: string }) => ({
        ae_option_id: data.id,
        budget_classification_id: m.id,
      }));
      await supabase.from("ae_option_ministries").insert(junctionRows);
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

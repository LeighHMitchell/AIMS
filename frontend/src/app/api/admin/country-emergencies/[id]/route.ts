import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  CountryEmergencyRow,
  toCountryEmergency,
} from "@/types/country-emergency";

/**
 * GET /api/admin/country-emergencies/[id]
 * Get a single country emergency by ID
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

    const { data, error } = await supabase
      .from("country_emergencies")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Country emergency not found" },
          { status: 404 }
        );
      }
      console.error("[Country Emergencies] Error fetching:", error);
      return NextResponse.json(
        { error: "Failed to fetch country emergency", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: toCountryEmergency(data as CountryEmergencyRow),
    });
  } catch (error) {
    console.error("[Country Emergencies] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/country-emergencies/[id]
 * Update a country emergency
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
    const { name, code, startDate, endDate, location, description, isActive } = body;

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (startDate !== undefined) updateData.start_date = startDate || null;
    if (endDate !== undefined) updateData.end_date = endDate || null;
    if (location !== undefined) updateData.location = location || null;
    if (description !== undefined) updateData.description = description || null;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data, error } = await supabase
      .from("country_emergencies")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "An emergency with this code already exists" },
          { status: 409 }
        );
      }
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Country emergency not found" },
          { status: 404 }
        );
      }
      console.error("[Country Emergencies] Error updating:", error);
      return NextResponse.json(
        { error: "Failed to update country emergency", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: toCountryEmergency(data as CountryEmergencyRow),
    });
  } catch (error) {
    console.error("[Country Emergencies] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/country-emergencies/[id]
 * Delete a country emergency
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

    const { error } = await supabase
      .from("country_emergencies")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Country Emergencies] Error deleting:", error);
      return NextResponse.json(
        { error: "Failed to delete country emergency", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Country emergency deleted successfully",
    });
  } catch (error) {
    console.error("[Country Emergencies] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

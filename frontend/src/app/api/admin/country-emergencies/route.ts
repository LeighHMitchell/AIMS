import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  CountryEmergencyRow,
  toCountryEmergency,
} from "@/types/country-emergency";

/**
 * GET /api/admin/country-emergencies
 * List all country emergencies with optional filters
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
    const active = searchParams.get("active");
    const search = searchParams.get("search");

    let query = supabase
      .from("country_emergencies")
      .select("*")
      .order("name", { ascending: true });

    if (active === "true") {
      query = query.eq("is_active", true);
    } else if (active === "false") {
      query = query.eq("is_active", false);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Country Emergencies] Error fetching:", error);
      return NextResponse.json(
        { error: "Failed to fetch country emergencies", details: error.message },
        { status: 500 }
      );
    }

    let emergencies = (data || []).map((row: CountryEmergencyRow) =>
      toCountryEmergency(row)
    );

    // Apply search filter (client-side for flexibility)
    if (search) {
      const searchLower = search.toLowerCase();
      emergencies = emergencies.filter(
        (e) =>
          e.name.toLowerCase().includes(searchLower) ||
          e.code.toLowerCase().includes(searchLower) ||
          e.location?.toLowerCase().includes(searchLower) ||
          e.description?.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      success: true,
      data: emergencies,
      total: emergencies.length,
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
 * POST /api/admin/country-emergencies
 * Create a new country emergency
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
    const { name, code, startDate, endDate, location, description, isActive } = body;

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("country_emergencies")
      .insert({
        name,
        code,
        start_date: startDate || null,
        end_date: endDate || null,
        location: location || null,
        description: description || null,
        is_active: isActive ?? true,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "An emergency with this code already exists" },
          { status: 409 }
        );
      }
      console.error("[Country Emergencies] Error creating:", error);
      return NextResponse.json(
        { error: "Failed to create country emergency", details: error.message },
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

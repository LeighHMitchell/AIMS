import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  CountryEmergencyRow,
  toCountryEmergency,
} from "@/types/country-emergency";

/**
 * GET /api/emergencies
 * Public endpoint: return only active emergencies, sorted by name
 * Used by the activity editor dropdown (any authenticated user)
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

    const { data, error } = await supabase
      .from("country_emergencies")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("[Emergencies] Error fetching:", error);
      return NextResponse.json(
        { error: "Failed to fetch emergencies", details: error.message },
        { status: 500 }
      );
    }

    const emergencies = (data || []).map((row: CountryEmergencyRow) =>
      toCountryEmergency(row)
    );

    return NextResponse.json({
      success: true,
      data: emergencies,
    });
  } catch (error) {
    console.error("[Emergencies] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

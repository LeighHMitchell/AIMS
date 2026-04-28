import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  CountryEmergencyRow,
  toCountryEmergency,
} from "@/types/country-emergency";

/**
 * GET /api/emergencies
 * Default: returns active emergencies for the picker dropdown.
 * With `?codes=A,B,C`: returns those specific emergencies regardless of
 * is_active, so already-attached scopes can still resolve metadata after
 * the underlying emergency has been retired.
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

    const codesParam = request.nextUrl.searchParams.get("codes");
    const codes = codesParam
      ? codesParam.split(",").map(c => c.trim()).filter(Boolean)
      : null;

    let query = supabase
      .from("country_emergencies")
      .select("*")
      .order("name", { ascending: true });

    if (codes && codes.length > 0) {
      query = query.in("code", codes);
    } else {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

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

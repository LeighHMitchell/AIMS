import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth';
import { CustomYearRow, toCustomYear } from "@/types/custom-years";

// Disable caching to ensure fresh data
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/custom-years
 * Public read-only endpoint for active custom years
 * Returns all active custom years with the system default identified
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

    // Fetch only active custom years, ordered by display_order then name
    const { data, error } = await supabase
      .from("custom_years")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("[Custom Years Public] Error fetching:", error);
      return NextResponse.json(
        { error: "Failed to fetch custom years", details: error.message },
        { status: 500 }
      );
    }

    const customYears = (data as CustomYearRow[]).map(toCustomYear);
    
    // Find the system default
    const defaultYear = customYears.find(cy => cy.isDefault);

    return NextResponse.json({
      success: true,
      data: customYears,
      defaultId: defaultYear?.id || null,
    });
  } catch (error) {
    console.error("[Custom Years Public] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

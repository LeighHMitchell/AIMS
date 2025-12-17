import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  SectorBudgetMappingRow,
  toSectorBudgetMapping,
  ClassificationType,
} from "@/types/aid-on-budget";

/**
 * GET /api/admin/sector-mappings
 * List all sector-to-budget mappings with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const sectorCode = searchParams.get("sectorCode");
    const categoryCode = searchParams.get("categoryCode"); // 3-digit filter
    const classificationType = searchParams.get("classificationType") as ClassificationType | null;
    const isCategoryLevel = searchParams.get("isCategoryLevel");
    const grouped = searchParams.get("grouped") === "true"; // Group by sector code

    // Build query
    let query = supabase
      .from("sector_budget_mappings")
      .select(`
        *,
        budget_classifications (
          id,
          code,
          name,
          name_local,
          description,
          classification_type,
          parent_id,
          level,
          is_active,
          sort_order
        )
      `)
      .order("sector_code", { ascending: true });

    // Apply filters
    if (sectorCode) {
      query = query.eq("sector_code", sectorCode);
    }

    if (categoryCode) {
      // Match all sectors starting with this 3-digit category
      query = query.like("sector_code", `${categoryCode}%`);
    }

    if (classificationType) {
      query = query.eq("budget_classifications.classification_type", classificationType);
    }

    if (isCategoryLevel !== null) {
      query = query.eq("is_category_level", isCategoryLevel === "true");
    }

    const { data, error } = await query;

    if (error) {
      console.error("[sector-mappings] Error fetching mappings:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Convert to frontend format
    const mappings = (data as SectorBudgetMappingRow[]).map(toSectorBudgetMapping);

    // Optionally group by sector code
    if (grouped) {
      const groupedMappings = groupBySector(mappings);
      return NextResponse.json({
        success: true,
        data: groupedMappings,
        total: Object.keys(groupedMappings).length,
      });
    }

    return NextResponse.json({
      success: true,
      data: mappings,
      total: mappings.length,
    });
  } catch (error: any) {
    console.error("[sector-mappings] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/sector-mappings
 * Create a new sector-to-budget mapping
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const {
      sectorCode,
      sectorName,
      budgetClassificationId,
      percentage = 100,
      isDefault = true,
      isCategoryLevel = false,
      notes,
    } = body;

    // Validation
    if (!sectorCode) {
      return NextResponse.json(
        { success: false, error: "Sector code is required" },
        { status: 400 }
      );
    }

    if (!budgetClassificationId) {
      return NextResponse.json(
        { success: false, error: "Budget classification ID is required" },
        { status: 400 }
      );
    }

    // Verify budget classification exists
    const { data: classification, error: classError } = await supabase
      .from("budget_classifications")
      .select("id, code, name, classification_type")
      .eq("id", budgetClassificationId)
      .single();

    if (classError || !classification) {
      return NextResponse.json(
        { success: false, error: "Budget classification not found" },
        { status: 404 }
      );
    }

    // Determine if this is a category-level mapping based on code length
    const actualIsCategoryLevel = isCategoryLevel || sectorCode.length === 3;

    // Insert the mapping
    const { data, error } = await supabase
      .from("sector_budget_mappings")
      .insert({
        sector_code: sectorCode,
        sector_name: sectorName,
        budget_classification_id: budgetClassificationId,
        percentage,
        is_default: isDefault,
        is_category_level: actualIsCategoryLevel,
        notes,
      })
      .select(`
        *,
        budget_classifications (
          id,
          code,
          name,
          name_local,
          description,
          classification_type,
          parent_id,
          level,
          is_active,
          sort_order
        )
      `)
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: `A mapping already exists for sector ${sectorCode} to this budget classification`,
          },
          { status: 409 }
        );
      }

      console.error("[sector-mappings] Error creating mapping:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: toSectorBudgetMapping(data as SectorBudgetMappingRow),
    });
  } catch (error: any) {
    console.error("[sector-mappings] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Helper function to group mappings by sector code
 */
function groupBySector(mappings: ReturnType<typeof toSectorBudgetMapping>[]) {
  const grouped: Record<
    string,
    {
      sectorCode: string;
      sectorName: string;
      isCategoryLevel: boolean;
      mappings: {
        functional?: ReturnType<typeof toSectorBudgetMapping>;
        functional_cofog?: ReturnType<typeof toSectorBudgetMapping>;
        administrative?: ReturnType<typeof toSectorBudgetMapping>;
        economic?: ReturnType<typeof toSectorBudgetMapping>;
        programme?: ReturnType<typeof toSectorBudgetMapping>;
      };
    }
  > = {};

  for (const mapping of mappings) {
    if (!grouped[mapping.sectorCode]) {
      grouped[mapping.sectorCode] = {
        sectorCode: mapping.sectorCode,
        sectorName: mapping.sectorName || "",
        isCategoryLevel: mapping.isCategoryLevel,
        mappings: {},
      };
    }

    const classificationType = mapping.budgetClassification?.classificationType;
    if (classificationType) {
      grouped[mapping.sectorCode].mappings[classificationType] = mapping;
    }
  }

  return grouped;
}

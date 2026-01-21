import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth';
import financeTypesData from "@/data/finance-types.json";

interface FinanceType {
  code: string;
  name: string;
  description: string;
  group: string;
  withdrawn: boolean;
}

/**
 * GET /api/admin/finance-type-mappings
 * Get all finance type mappings for a specific classification type (revenue or liabilities)
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
    const classificationType = searchParams.get("classificationType") || "revenue";

    if (!["revenue", "liabilities"].includes(classificationType)) {
      return NextResponse.json(
        { error: "Classification type must be 'revenue' or 'liabilities'" },
        { status: 400 }
      );
    }

    // Get finance types (exclude withdrawn)
    const financeTypes = (financeTypesData as FinanceType[]).filter(ft => !ft.withdrawn);

    // Get all mappings for this classification type with classification details
    const { data: mappings, error: mappingError } = await supabase
      .from("finance_type_classification_mappings")
      .select(`
        id,
        finance_type_code,
        finance_type_name,
        budget_classification_id,
        classification_type,
        notes,
        budget_classifications (
          id,
          code,
          name,
          classification_type
        )
      `)
      .eq("classification_type", classificationType);

    if (mappingError) {
      console.error("[Finance Type Mappings] Error fetching mappings:", mappingError);
      return NextResponse.json(
        { error: "Failed to fetch mappings", details: mappingError.message },
        { status: 500 }
      );
    }

    // Create a lookup map for mappings
    const mappingsByCode: Record<string, any> = {};
    (mappings || []).forEach((m: any) => {
      mappingsByCode[m.finance_type_code] = {
        id: m.id,
        budgetClassificationId: m.budget_classification_id,
        budgetClassification: m.budget_classifications,
        notes: m.notes,
      };
    });

    // Group finance types by their group
    const groupedFinanceTypes: Record<string, FinanceType[]> = {};
    financeTypes.forEach((ft) => {
      if (!groupedFinanceTypes[ft.group]) {
        groupedFinanceTypes[ft.group] = [];
      }
      groupedFinanceTypes[ft.group].push(ft);
    });

    // Combine finance types with their mappings
    const result = financeTypes.map((ft) => ({
      financeTypeCode: ft.code,
      financeTypeName: ft.name,
      description: ft.description,
      group: ft.group,
      mapping: mappingsByCode[ft.code] || null,
    }));

    return NextResponse.json({
      success: true,
      data: result,
      groups: groupedFinanceTypes,
      total: result.length,
      classificationType,
    });
  } catch (error) {
    console.error("[Finance Type Mappings] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/finance-type-mappings
 * Create a new finance type mapping
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
    const { financeTypeCode, financeTypeName, budgetClassificationId, classificationType, notes } = body;

    if (!financeTypeCode || !budgetClassificationId || !classificationType) {
      return NextResponse.json(
        { error: "Finance type code, budget classification ID, and classification type are required" },
        { status: 400 }
      );
    }

    if (!["revenue", "liabilities"].includes(classificationType)) {
      return NextResponse.json(
        { error: "Classification type must be 'revenue' or 'liabilities'" },
        { status: 400 }
      );
    }

    // Verify the classification matches the type
    const { data: classification } = await supabase
      .from("budget_classifications")
      .select("classification_type")
      .eq("id", budgetClassificationId)
      .single();

    if (!classification || classification.classification_type !== classificationType) {
      return NextResponse.json(
        { error: `Budget classification must be of type '${classificationType}'` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("finance_type_classification_mappings")
      .insert({
        finance_type_code: financeTypeCode,
        finance_type_name: financeTypeName,
        budget_classification_id: budgetClassificationId,
        classification_type: classificationType,
        notes,
      })
      .select(`
        id,
        finance_type_code,
        finance_type_name,
        budget_classification_id,
        classification_type,
        notes,
        budget_classifications (
          id,
          code,
          name,
          classification_type
        )
      `)
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A mapping for this finance type already exists" },
          { status: 409 }
        );
      }
      console.error("[Finance Type Mappings] Error creating:", error);
      return NextResponse.json(
        { error: "Failed to create mapping", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        financeTypeCode: data.finance_type_code,
        financeTypeName: data.finance_type_name,
        budgetClassificationId: data.budget_classification_id,
        budgetClassification: data.budget_classifications,
        classificationType: data.classification_type,
        notes: data.notes,
      },
    });
  } catch (error) {
    console.error("[Finance Type Mappings] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

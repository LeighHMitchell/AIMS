import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth';
import {
  DomesticBudgetDataRow,
  toDomesticBudgetData,
  DomesticBudgetFormData,
} from "@/types/domestic-budget";
import { ClassificationType } from "@/types/aid-on-budget";

/**
 * GET /api/admin/domestic-budget
 * List domestic budget data with optional filtering
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
    const fiscalYear = searchParams.get("fiscalYear");
    const classificationType = searchParams.get("classificationType") as ClassificationType | "all" | null;
    const classificationId = searchParams.get("classificationId");

    let query = supabase
      .from("domestic_budget_data")
      .select(`
        *,
        budget_classifications (
          id,
          code,
          name,
          classification_type,
          level
        )
      `)
      .order("fiscal_year", { ascending: false });

    // Filter by fiscal year
    if (fiscalYear) {
      query = query.eq("fiscal_year", parseInt(fiscalYear));
    }

    // Filter by specific classification
    if (classificationId) {
      query = query.eq("budget_classification_id", classificationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Domestic Budget] Error fetching:", error);
      return NextResponse.json(
        { error: "Failed to fetch domestic budget data", details: error.message },
        { status: 500 }
      );
    }

    // Filter by classification type if provided (must do in memory due to join)
    let filteredData = data as DomesticBudgetDataRow[];
    if (classificationType && classificationType !== "all") {
      filteredData = filteredData.filter(
        (d) => d.budget_classifications?.classification_type === classificationType
      );
    }

    const budgetData = filteredData.map(toDomesticBudgetData);

    // Calculate summary
    const totalBudget = budgetData.reduce((sum, d) => sum + d.budgetAmount, 0);
    const totalExpenditure = budgetData.reduce((sum, d) => sum + d.expenditureAmount, 0);
    const executionRate = totalBudget > 0 ? (totalExpenditure / totalBudget) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: budgetData,
      summary: {
        totalBudget,
        totalExpenditure,
        executionRate: Math.round(executionRate * 100) / 100,
        count: budgetData.length,
      },
    });
  } catch (error) {
    console.error("[Domestic Budget] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/domestic-budget
 * Create or update a domestic budget entry (upsert by classification + year)
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

    const body: DomesticBudgetFormData = await request.json();
    const {
      budgetClassificationId,
      fiscalYear,
      budgetAmount,
      expenditureAmount,
      currency = "USD",
      notes,
    } = body;

    // Validation
    if (!budgetClassificationId) {
      return NextResponse.json(
        { error: "Budget classification is required" },
        { status: 400 }
      );
    }

    if (!fiscalYear || fiscalYear < 1900 || fiscalYear > 2100) {
      return NextResponse.json(
        { error: "Valid fiscal year is required (1900-2100)" },
        { status: 400 }
      );
    }

    if (budgetAmount < 0 || expenditureAmount < 0) {
      return NextResponse.json(
        { error: "Budget and expenditure amounts cannot be negative" },
        { status: 400 }
      );
    }

    // Verify the classification exists
    const { data: classification, error: classError } = await supabase
      .from("budget_classifications")
      .select("id, code, name")
      .eq("id", budgetClassificationId)
      .single();

    if (classError || !classification) {
      return NextResponse.json(
        { error: "Budget classification not found" },
        { status: 404 }
      );
    }

    // Upsert - update if exists, insert if not
    const { data, error } = await supabase
      .from("domestic_budget_data")
      .upsert(
        {
          budget_classification_id: budgetClassificationId,
          fiscal_year: fiscalYear,
          budget_amount: budgetAmount,
          expenditure_amount: expenditureAmount,
          currency,
          notes,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "budget_classification_id,fiscal_year",
        }
      )
      .select(`
        *,
        budget_classifications (
          id,
          code,
          name,
          classification_type,
          level
        )
      `)
      .single();

    if (error) {
      console.error("[Domestic Budget] Error upserting:", error);
      return NextResponse.json(
        { error: "Failed to save domestic budget data", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: toDomesticBudgetData(data as DomesticBudgetDataRow),
      message: "Domestic budget data saved successfully",
    });
  } catch (error) {
    console.error("[Domestic Budget] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/domestic-budget
 * Bulk upsert domestic budget entries
 */
export async function PUT(request: NextRequest) {
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
    const { entries } = body as { entries: DomesticBudgetFormData[] };

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: "Entries array is required" },
        { status: 400 }
      );
    }

    // Validate all entries
    for (const entry of entries) {
      if (!entry.budgetClassificationId || !entry.fiscalYear) {
        return NextResponse.json(
          { error: "Each entry must have budgetClassificationId and fiscalYear" },
          { status: 400 }
        );
      }
    }

    // Prepare upsert data
    const upsertData = entries.map((entry) => ({
      budget_classification_id: entry.budgetClassificationId,
      fiscal_year: entry.fiscalYear,
      budget_amount: entry.budgetAmount || 0,
      expenditure_amount: entry.expenditureAmount || 0,
      currency: entry.currency || "USD",
      notes: entry.notes,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("domestic_budget_data")
      .upsert(upsertData, {
        onConflict: "budget_classification_id,fiscal_year",
      })
      .select(`
        *,
        budget_classifications (
          id,
          code,
          name,
          classification_type,
          level
        )
      `);

    if (error) {
      console.error("[Domestic Budget] Error bulk upserting:", error);
      return NextResponse.json(
        { error: "Failed to save domestic budget data", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: (data as DomesticBudgetDataRow[]).map(toDomesticBudgetData),
      count: data?.length || 0,
      message: `${data?.length || 0} entries saved successfully`,
    });
  } catch (error) {
    console.error("[Domestic Budget] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

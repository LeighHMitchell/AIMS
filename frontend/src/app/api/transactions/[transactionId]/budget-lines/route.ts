import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  inferBudgetLines,
  applyBudgetLinesToTransaction,
  TransactionInferenceInput,
} from "@/lib/transaction-budget-inference";

/**
 * GET /api/transactions/:transactionId/budget-lines
 * Get budget classification lines for a transaction
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params;
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const { data: lines, error } = await supabase
      .from("transaction_budget_lines")
      .select(`
        id,
        transaction_id,
        sector_code,
        sector_name,
        sector_percentage,
        amount,
        currency,
        funding_source_classification_id,
        administrative_classification_id,
        functional_classification_id,
        economic_classification_id,
        programme_classification_id,
        revenue_classification_id,
        liabilities_classification_id,
        is_override,
        override_notes,
        inferred_at,
        funding_source:budget_classifications!funding_source_classification_id(id, code, name),
        administrative:budget_classifications!administrative_classification_id(id, code, name),
        functional:budget_classifications!functional_classification_id(id, code, name),
        economic:budget_classifications!economic_classification_id(id, code, name),
        programme:budget_classifications!programme_classification_id(id, code, name),
        revenue:budget_classifications!revenue_classification_id(id, code, name),
        liabilities:budget_classifications!liabilities_classification_id(id, code, name)
      `)
      .eq("transaction_id", transactionId)
      .order("sector_percentage", { ascending: false });

    if (error) {
      console.error("[Budget Lines] Error fetching:", error);
      return NextResponse.json(
        { error: "Failed to fetch budget lines", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: lines || [],
      total: (lines || []).length,
    });
  } catch (error) {
    console.error("[Budget Lines] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/transactions/:transactionId/budget-lines
 * Re-infer budget classifications for a transaction
 * Query params:
 * - preview=true: Return inferred lines without saving
 * - force=true: Overwrite even override lines
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params;
    const { searchParams } = new URL(request.url);
    const preview = searchParams.get("preview") === "true";
    const force = searchParams.get("force") === "true";

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    // Fetch transaction with its data
    const { data: transaction, error: txnError } = await supabase
      .from("transactions")
      .select(`
        uuid,
        value,
        currency,
        provider_org_id,
        receiver_org_id,
        finance_type,
        effective_finance_type
      `)
      .eq("uuid", transactionId)
      .single();

    if (txnError || !transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Get transaction sectors (from transaction_sector_lines)
    const { data: sectorLines } = await supabase
      .from("transaction_sector_lines")
      .select("sector_code, sector_name, percentage")
      .eq("transaction_id", transactionId)
      .is("deleted_at", null);

    // Build inference input
    const input: TransactionInferenceInput = {
      providerOrgId: transaction.provider_org_id,
      receiverOrgId: transaction.receiver_org_id,
      financeType: transaction.effective_finance_type || transaction.finance_type,
      sectors: (sectorLines || []).map((s: any) => ({
        code: s.sector_code,
        name: s.sector_name,
        percentage: s.percentage,
      })),
      value: transaction.value || 0,
      currency: transaction.currency || "USD",
    };

    // Infer budget classifications
    const inference = await inferBudgetLines(supabase, input);

    if (preview) {
      return NextResponse.json({
        success: true,
        preview: true,
        inference,
      });
    }

    // Apply to transaction
    const result = await applyBudgetLinesToTransaction(
      supabase,
      transactionId,
      inference.lines,
      { force }
    );

    return NextResponse.json({
      success: result.success,
      inference,
      linesCreated: result.linesCreated,
      linesPreserved: result.linesPreserved,
    });
  } catch (error) {
    console.error("[Budget Lines] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/transactions/:transactionId/budget-lines
 * Override a specific budget line classification
 * Body: {
 *   lineId: string,
 *   classificationField: string (e.g., "functional_classification_id"),
 *   classificationId: string | null,
 *   notes?: string
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params;
    const body = await request.json();
    const { lineId, classificationField, classificationId, notes } = body;

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    // Validate classification field
    const validFields = [
      "funding_source_classification_id",
      "administrative_classification_id",
      "functional_classification_id",
      "economic_classification_id",
      "programme_classification_id",
      "revenue_classification_id",
      "liabilities_classification_id",
    ];

    if (!validFields.includes(classificationField)) {
      return NextResponse.json(
        { error: "Invalid classification field" },
        { status: 400 }
      );
    }

    // Update the line
    const updateData: any = {
      [classificationField]: classificationId || null,
      is_override: true,
      override_notes: notes || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("transaction_budget_lines")
      .update(updateData)
      .eq("id", lineId)
      .eq("transaction_id", transactionId)
      .select()
      .single();

    if (error) {
      console.error("[Budget Lines] Error updating:", error);
      return NextResponse.json(
        { error: "Failed to update budget line", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Budget line not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[Budget Lines] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

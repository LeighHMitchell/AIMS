import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/admin/organization-administrative-mappings
 * Get all organizations that are receivers in transactions with their administrative mappings
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    // Get distinct receiver org IDs from transactions
    const { data: txnOrgs, error: txnError } = await supabase
      .from("transactions")
      .select("receiver_org_id")
      .not("receiver_org_id", "is", null);

    if (txnError) {
      console.error("[Admin Mappings] Error fetching transaction orgs:", txnError);
      return NextResponse.json(
        { error: "Failed to fetch transaction organizations", details: txnError.message },
        { status: 500 }
      );
    }

    // Get unique receiver org IDs
    const receiverOrgIds = [...new Set((txnOrgs || []).map((t: any) => t.receiver_org_id).filter(Boolean))];

    if (receiverOrgIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
      });
    }

    // Get organizations that are receivers in transactions
    const { data: organizations, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, acronym, iati_org_id, type, Organisation_Type_Name")
      .in("id", receiverOrgIds)
      .order("name");

    if (orgError) {
      console.error("[Admin Mappings] Error fetching orgs:", orgError);
      return NextResponse.json(
        { error: "Failed to fetch organizations", details: orgError.message },
        { status: 500 }
      );
    }

    // Get all administrative mappings with classification details
    const { data: mappings, error: mappingError } = await supabase
      .from("organization_administrative_mappings")
      .select(`
        id,
        organization_id,
        budget_classification_id,
        notes,
        budget_classifications (
          id,
          code,
          name,
          classification_type
        )
      `);

    if (mappingError) {
      console.error("[Admin Mappings] Error fetching mappings:", mappingError);
      return NextResponse.json(
        { error: "Failed to fetch mappings", details: mappingError.message },
        { status: 500 }
      );
    }

    // Create a lookup map for mappings
    const mappingsByOrgId: Record<string, any> = {};
    (mappings || []).forEach((m: any) => {
      mappingsByOrgId[m.organization_id] = {
        id: m.id,
        budgetClassificationId: m.budget_classification_id,
        budgetClassification: m.budget_classifications,
        notes: m.notes,
      };
    });

    // Combine orgs with their mappings
    const result = (organizations || []).map((org: any) => ({
      organizationId: org.id,
      organizationName: org.name,
      acronym: org.acronym || null,
      iatiOrgId: org.iati_org_id,
      orgType: org.type || null,
      orgTypeName: org.Organisation_Type_Name || null,
      mapping: mappingsByOrgId[org.id] || null,
    }));

    return NextResponse.json({
      success: true,
      data: result,
      total: result.length,
    });
  } catch (error) {
    console.error("[Admin Mappings] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/organization-administrative-mappings
 * Create a new organization to administrative classification mapping
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { organizationId, budgetClassificationId, notes } = body;

    if (!organizationId || !budgetClassificationId) {
      return NextResponse.json(
        { error: "Organization ID and budget classification ID are required" },
        { status: 400 }
      );
    }

    // Verify the classification is an administrative type
    const { data: classification } = await supabase
      .from("budget_classifications")
      .select("classification_type")
      .eq("id", budgetClassificationId)
      .single();

    if (!classification || classification.classification_type !== "administrative") {
      return NextResponse.json(
        { error: "Budget classification must be of type 'administrative'" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("organization_administrative_mappings")
      .insert({
        organization_id: organizationId,
        budget_classification_id: budgetClassificationId,
        notes,
      })
      .select(`
        id,
        organization_id,
        budget_classification_id,
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
          { error: "A mapping for this organization already exists" },
          { status: 409 }
        );
      }
      console.error("[Admin Mappings] Error creating:", error);
      return NextResponse.json(
        { error: "Failed to create mapping", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        organizationId: data.organization_id,
        budgetClassificationId: data.budget_classification_id,
        budgetClassification: data.budget_classifications,
        notes: data.notes,
      },
    });
  } catch (error) {
    console.error("[Admin Mappings] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

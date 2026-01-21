import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/admin/organization-mappings
 * Get organizations that are providers OR receivers in transactions, with their funding source mappings
 */
export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {


    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    // Get distinct provider and receiver org IDs from transactions
    const { data: txnOrgs, error: txnError } = await supabase
      .from("transactions")
      .select("provider_org_id, receiver_org_id");

    if (txnError) {
      console.error("[Organization Mappings] Error fetching transaction orgs:", txnError);
      return NextResponse.json(
        { error: "Failed to fetch transaction organizations", details: txnError.message },
        { status: 500 }
      );
    }

    // Get unique org IDs (both provider and receiver)
    const activeOrgIds = new Set<string>();
    (txnOrgs || []).forEach((t: any) => {
      if (t.provider_org_id) activeOrgIds.add(t.provider_org_id);
      if (t.receiver_org_id) activeOrgIds.add(t.receiver_org_id);
    });

    if (activeOrgIds.size === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
      });
    }

    // Get organizations that are providers or receivers in transactions
    const { data: organizations, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, acronym, iati_org_id, type, Organisation_Type_Name")
      .in("id", Array.from(activeOrgIds))
      .order("name");

    if (orgError) {
      console.error("[Organization Mappings] Error fetching orgs:", orgError);
      return NextResponse.json(
        { error: "Failed to fetch organizations", details: orgError.message },
        { status: 500 }
      );
    }

    // Get all mappings with classification details
    const { data: mappings, error: mappingError } = await supabase
      .from("organization_funding_source_mappings")
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
      console.error("[Organization Mappings] Error fetching mappings:", mappingError);
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
    console.error("[Organization Mappings] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/organization-mappings
 * Create a new organization to funding source mapping
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
    const { organizationId, budgetClassificationId, notes } = body;

    if (!organizationId || !budgetClassificationId) {
      return NextResponse.json(
        { error: "Organization ID and budget classification ID are required" },
        { status: 400 }
      );
    }

    // Verify the classification is a funding_sources type
    const { data: classification } = await supabase
      .from("budget_classifications")
      .select("classification_type")
      .eq("id", budgetClassificationId)
      .single();

    if (!classification || classification.classification_type !== "funding_sources") {
      return NextResponse.json(
        { error: "Budget classification must be of type 'funding_sources'" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("organization_funding_source_mappings")
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
      console.error("[Organization Mappings] Error creating:", error);
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
    console.error("[Organization Mappings] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

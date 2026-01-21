import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth';
import { AidOnBudgetMetrics, ClassificationType } from "@/types/aid-on-budget";

/**
 * GET /api/analytics/aid-on-budget
 * Get aid-on-budget analytics metrics
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
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const classificationType = searchParams.get("type") as ClassificationType | null;
    const organizationId = searchParams.get("organizationId");

    // Get total aid (all disbursements)
    let totalAidQuery = supabase
      .from("transactions")
      .select("value_usd")
      .eq("transaction_type", "3") // Disbursements
      .not("value_usd", "is", null);

    if (dateFrom) {
      totalAidQuery = totalAidQuery.gte("transaction_date", dateFrom);
    }
    if (dateTo) {
      totalAidQuery = totalAidQuery.lte("transaction_date", dateTo);
    }

    const { data: totalAidData } = await totalAidQuery;
    const totalAid = totalAidData?.reduce((sum, t) => sum + (t.value_usd || 0), 0) || 0;

    // Get all budget classifications
    let classificationsQuery = supabase
      .from("budget_classifications")
      .select("*")
      .eq("is_active", true)
      .order("classification_type")
      .order("sort_order")
      .order("code");

    if (classificationType) {
      classificationsQuery = classificationsQuery.eq("classification_type", classificationType);
    }

    const { data: classifications, error: classError } = await classificationsQuery;

    if (classError) {
      console.error("[Aid on Budget] Error fetching classifications:", classError);
      return NextResponse.json(
        { error: "Failed to fetch classifications" },
        { status: 500 }
      );
    }

    // Get all activities with budget mappings
    const { data: countryBudgetItems, error: cbiError } = await supabase
      .from("country_budget_items")
      .select(`
        id,
        activity_id,
        vocabulary,
        budget_items (
          id,
          code,
          percentage
        )
      `)
      .eq("vocabulary", "2"); // Country Chart of Accounts vocabulary

    if (cbiError) {
      console.error("[Aid on Budget] Error fetching budget items:", cbiError);
    }

    // Get activity disbursements
    let disbursementsQuery = supabase
      .from("transactions")
      .select(`
        activity_id,
        value_usd,
        transaction_date
      `)
      .eq("transaction_type", "3") // Disbursements
      .not("value_usd", "is", null);

    if (dateFrom) {
      disbursementsQuery = disbursementsQuery.gte("transaction_date", dateFrom);
    }
    if (dateTo) {
      disbursementsQuery = disbursementsQuery.lte("transaction_date", dateTo);
    }
    if (organizationId) {
      // Get activities for this organization
      const { data: orgActivities } = await supabase
        .from("activities")
        .select("id")
        .eq("reporting_org_id", organizationId);

      if (orgActivities) {
        disbursementsQuery = disbursementsQuery.in(
          "activity_id",
          orgActivities.map((a) => a.id)
        );
      }
    }

    const { data: disbursements, error: disbError } = await disbursementsQuery;

    if (disbError) {
      console.error("[Aid on Budget] Error fetching disbursements:", disbError);
    }

    // Get activity commitments
    let commitmentsQuery = supabase
      .from("transactions")
      .select(`
        activity_id,
        value_usd,
        transaction_date
      `)
      .eq("transaction_type", "2") // Commitments
      .not("value_usd", "is", null);

    if (dateFrom) {
      commitmentsQuery = commitmentsQuery.gte("transaction_date", dateFrom);
    }
    if (dateTo) {
      commitmentsQuery = commitmentsQuery.lte("transaction_date", dateTo);
    }
    if (organizationId) {
      const { data: orgActivities } = await supabase
        .from("activities")
        .select("id")
        .eq("reporting_org_id", organizationId);

      if (orgActivities) {
        commitmentsQuery = commitmentsQuery.in(
          "activity_id",
          orgActivities.map((a) => a.id)
        );
      }
    }

    const { data: commitments, error: comError } = await commitmentsQuery;

    if (comError) {
      console.error("[Aid on Budget] Error fetching commitments:", comError);
    }

    // Build activity -> budget mapping
    const activityBudgetMap = new Map<string, { code: string; percentage: number }[]>();
    const mappedActivityIds = new Set<string>();

    countryBudgetItems?.forEach((cbi: any) => {
      if (cbi.budget_items && cbi.activity_id) {
        const items = cbi.budget_items.map((bi: any) => ({
          code: bi.code,
          percentage: bi.percentage || 100,
        }));
        activityBudgetMap.set(cbi.activity_id, items);
        mappedActivityIds.add(cbi.activity_id);
      }
    });

    // Aggregate disbursements by budget classification
    const disbursementsByCode = new Map<string, number>();
    const commitmentsByCode = new Map<string, number>();
    const activitiesByCode = new Map<string, Set<string>>();

    let totalOnBudget = 0;
    let totalOffBudget = 0;

    disbursements?.forEach((d: any) => {
      const budgetItems = activityBudgetMap.get(d.activity_id);

      if (budgetItems && budgetItems.length > 0) {
        // Activity has budget mapping - distribute by percentage
        budgetItems.forEach((bi) => {
          const allocatedAmount = (d.value_usd * bi.percentage) / 100;
          disbursementsByCode.set(
            bi.code,
            (disbursementsByCode.get(bi.code) || 0) + allocatedAmount
          );

          if (!activitiesByCode.has(bi.code)) {
            activitiesByCode.set(bi.code, new Set());
          }
          activitiesByCode.get(bi.code)!.add(d.activity_id);
        });
        totalOnBudget += d.value_usd;
      } else {
        // Activity has no budget mapping
        totalOffBudget += d.value_usd;
      }
    });

    commitments?.forEach((c: any) => {
      const budgetItems = activityBudgetMap.get(c.activity_id);

      if (budgetItems && budgetItems.length > 0) {
        budgetItems.forEach((bi) => {
          const allocatedAmount = (c.value_usd * bi.percentage) / 100;
          commitmentsByCode.set(
            bi.code,
            (commitmentsByCode.get(bi.code) || 0) + allocatedAmount
          );
        });
      }
    });

    // Build metrics array
    const metrics: AidOnBudgetMetrics[] = (classifications || []).map((c: any) => {
      const disbursements = disbursementsByCode.get(c.code) || 0;
      const commitments = commitmentsByCode.get(c.code) || 0;
      const activities = activitiesByCode.get(c.code);

      return {
        budgetClassificationId: c.id,
        budgetCode: c.code,
        budgetName: c.name,
        classificationType: c.classification_type,
        level: c.level,
        parentCode: c.parent_id ? classifications?.find((p: any) => p.id === c.parent_id)?.code : undefined,
        totalCommitments: commitments,
        totalDisbursements: disbursements,
        totalBudget: 0, // Would need budget data
        totalExpenditure: 0, // Would need expenditure data
        activityCount: activities?.size || 0,
        partnerCount: 0, // Would need to count unique partners
        aidShare: totalAid > 0 ? (disbursements / totalAid) * 100 : 0,
        disbursementRate: commitments > 0 ? (disbursements / commitments) * 100 : 0,
      };
    });

    // Filter out classifications with no data
    const metricsWithData = metrics.filter(
      (m) => m.totalDisbursements > 0 || m.totalCommitments > 0 || m.activityCount > 0
    );

    // Get unique activity count
    const allActivitiesQuery = supabase
      .from("activities")
      .select("id", { count: "exact" });

    const { count: totalActivities } = await allActivitiesQuery;

    // Summary by classification type
    const byClassificationType = (["administrative", "functional", "economic", "programme"] as ClassificationType[]).map(
      (type) => {
        const typeMetrics = metricsWithData.filter((m) => m.classificationType === type);
        return {
          type,
          totalAmount: typeMetrics.reduce((sum, m) => sum + m.totalDisbursements, 0),
          count: typeMetrics.length,
        };
      }
    );

    return NextResponse.json({
      success: true,
      data: metricsWithData,
      summary: {
        totalAid,
        totalOnBudget,
        totalOffBudget,
        onBudgetPercentage: totalAid > 0 ? (totalOnBudget / totalAid) * 100 : 0,
        activityCount: totalActivities || 0,
        mappedActivityCount: mappedActivityIds.size,
        mappingCoverage: totalActivities && totalActivities > 0
          ? (mappedActivityIds.size / totalActivities) * 100
          : 0,
      },
      byClassificationType,
      // Data for the sunburst chart
      chartData: {
        centerData: {
          total: totalAid,
          breakdown: [
            { type: "On-Budget", value: totalOnBudget },
            { type: "Off-Budget", value: totalOffBudget },
          ],
        },
        // Group by top-level functional classifications
        sectorData: metricsWithData
          .filter((m) => m.classificationType === "functional" && m.level === 1)
          .map((m) => ({
            name: m.budgetName,
            code: m.budgetCode,
            value: m.totalDisbursements,
            breakdown: [
              100, // On-budget percentage (all mapped by definition)
              0,   // Off-budget percentage
            ],
          })),
      },
    });
  } catch (error) {
    console.error("[Aid on Budget] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

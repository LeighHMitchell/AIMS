import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  EnhancedAidOnBudgetSummary,
  EnhancedChartDataPoint,
  EnhancedAidOnBudgetChartData,
  ENHANCED_CHART_COLORS,
} from "@/types/aid-on-budget";
import { BudgetStatusType } from "@/types/activity-budget-status";

// Budget Support aid type codes (IATI)
const BUDGET_SUPPORT_AID_TYPES = ["A01", "A02"]; // A01: General budget support, A02: Sector budget support

interface ActivityWithBudgetStatus {
  id: string;
  budget_status: BudgetStatusType;
  on_budget_percentage: number | null;
  default_aid_type: string | null;
  total_disbursements: number;
  total_commitments: number;
  budget_classification_ids: string[];
}

/**
 * GET /api/analytics/aid-on-budget-enhanced
 * Get enhanced Aid on Budget analytics including domestic budget data
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const fiscalYear = searchParams.get("fiscalYear")
      ? parseInt(searchParams.get("fiscalYear")!)
      : new Date().getFullYear();
    const classificationType = searchParams.get("classificationType") || "all";

    // 1. Fetch domestic budget data for the fiscal year
    let domesticQuery = supabase
      .from("domestic_budget_data")
      .select(`
        budget_classification_id,
        budget_amount,
        expenditure_amount,
        currency,
        budget_classifications (
          id,
          code,
          name,
          classification_type,
          level
        )
      `)
      .eq("fiscal_year", fiscalYear);

    const { data: domesticData, error: domesticError } = await domesticQuery;

    if (domesticError) {
      console.error("[Aid on Budget Enhanced] Error fetching domestic data:", domesticError);
    }

    // 2. Fetch activities with budget status and aid type
    const { data: activities, error: activitiesError } = await supabase
      .from("activities")
      .select(`
        id,
        budget_status,
        on_budget_percentage,
        default_aid_type
      `);

    if (activitiesError) {
      console.error("[Aid on Budget Enhanced] Error fetching activities:", activitiesError);
    }

    // 3. Fetch transactions (disbursements) for calculating aid amounts
    // Group by activity to get total disbursements
    const { data: transactions, error: transactionsError } = await supabase
      .from("transactions")
      .select(`
        activity_id,
        transaction_type,
        value,
        transaction_date
      `)
      .in("transaction_type", ["3", "4"]); // Disbursement and Expenditure

    if (transactionsError) {
      console.error("[Aid on Budget Enhanced] Error fetching transactions:", transactionsError);
    }

    // 4. Fetch country budget items to map activities to classifications
    const { data: countryBudgetItems, error: cbiError } = await supabase
      .from("country_budget_items")
      .select(`
        activity_id,
        budget_items (
          code,
          percentage
        )
      `);

    if (cbiError) {
      console.error("[Aid on Budget Enhanced] Error fetching country budget items:", cbiError);
    }

    // 5. Fetch all budget classifications for aggregation
    let classQuery = supabase
      .from("budget_classifications")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (classificationType !== "all") {
      classQuery = classQuery.eq("classification_type", classificationType);
    }

    const { data: classifications, error: classError } = await classQuery;

    if (classError) {
      console.error("[Aid on Budget Enhanced] Error fetching classifications:", classError);
    }

    // Process and aggregate data
    const activityDisbursements = new Map<string, number>();
    (transactions || []).forEach((tx) => {
      const current = activityDisbursements.get(tx.activity_id) || 0;
      activityDisbursements.set(tx.activity_id, current + (Number(tx.value) || 0));
    });

    // Calculate aid totals by budget status and identify budget support
    let totalOnBudgetAid = 0;
    let totalOffBudgetAid = 0;
    let totalBudgetSupport = 0;
    let totalPartialAid = 0;
    let totalUnknownAid = 0;
    let onBudgetCount = 0;
    let offBudgetCount = 0;
    let budgetSupportCount = 0;
    let partialCount = 0;
    let unknownCount = 0;

    (activities || []).forEach((activity) => {
      const disbursements = activityDisbursements.get(activity.id) || 0;
      const status = activity.budget_status || "unknown";
      const percentage = activity.on_budget_percentage || 0;
      const aidType = activity.default_aid_type || "";

      // Check if this is budget support (A01 or A02)
      const isBudgetSupport = BUDGET_SUPPORT_AID_TYPES.includes(aidType);

      if (isBudgetSupport) {
        // Budget support is counted separately
        totalBudgetSupport += disbursements;
        budgetSupportCount++;
      } else {
        // Non-budget support aid is categorized by budget status
        switch (status) {
          case "on_budget":
            totalOnBudgetAid += disbursements;
            onBudgetCount++;
            break;
          case "off_budget":
            totalOffBudgetAid += disbursements;
            offBudgetCount++;
            break;
          case "partial":
            totalPartialAid += (disbursements * percentage) / 100;
            totalOffBudgetAid += (disbursements * (100 - percentage)) / 100;
            partialCount++;
            break;
          case "unknown":
          default:
            totalUnknownAid += disbursements;
            unknownCount++;
            break;
        }
      }
    });

    // Calculate domestic totals
    let totalDomesticBudget = 0;
    let totalDomesticExpenditure = 0;

    (domesticData || []).forEach((d) => {
      totalDomesticBudget += Number(d.budget_amount) || 0;
      totalDomesticExpenditure += Number(d.expenditure_amount) || 0;
    });

    // Build classification-level data
    const classificationData: EnhancedChartDataPoint[] = (classifications || []).map((c) => {
      // Find domestic data for this classification
      const domestic = (domesticData || []).find(
        (d) => d.budget_classification_id === c.id
      );

      // For now, we'll track aid by budget status at aggregate level
      // In a full implementation, you'd map activities to classifications via country_budget_items

      return {
        name: c.name,
        code: c.code,
        classificationType: c.classification_type,
        level: c.level,
        domesticBudget: Number(domestic?.budget_amount) || 0,
        domesticExpenditure: Number(domestic?.expenditure_amount) || 0,
        onBudgetAid: 0, // Would need activity->classification mapping
        offBudgetAid: 0,
        partialAid: 0,
        unknownAid: 0,
        totalAid: 0,
        totalSpending: Number(domestic?.expenditure_amount) || 0,
        aidShare: 0,
      };
    });

    // Calculate summary
    // Note: Budget Support is counted separately and NOT included in totalAid
    const totalAid = totalOnBudgetAid + totalOffBudgetAid + totalPartialAid + totalUnknownAid;
    const effectiveOnBudget = totalOnBudgetAid + totalPartialAid;

    const summary: EnhancedAidOnBudgetSummary = {
      totalAid,
      totalOnBudgetAid,
      totalOffBudgetAid,
      totalPartialAid,
      totalUnknownAid,
      totalBudgetSupport,
      totalDomesticBudget,
      totalDomesticExpenditure,
      domesticExecutionRate:
        totalDomesticBudget > 0
          ? Math.round((totalDomesticExpenditure / totalDomesticBudget) * 10000) / 100
          : 0,
      totalSpending: totalDomesticExpenditure + effectiveOnBudget + totalBudgetSupport,
      aidShareOfBudget:
        totalDomesticExpenditure + effectiveOnBudget + totalBudgetSupport > 0
          ? Math.round(
              ((effectiveOnBudget + totalBudgetSupport) / (totalDomesticExpenditure + effectiveOnBudget + totalBudgetSupport)) * 10000
            ) / 100
          : 0,
      onBudgetPercentage: totalAid > 0 ? Math.round((effectiveOnBudget / totalAid) * 10000) / 100 : 0,
      activityCount: activities?.length || 0,
      mappedActivityCount: countryBudgetItems?.length || 0,
      onBudgetActivityCount: onBudgetCount,
      offBudgetActivityCount: offBudgetCount,
      partialActivityCount: partialCount,
      unknownActivityCount: unknownCount,
      budgetSupportActivityCount: budgetSupportCount,
    };

    // Build chart data with 4 categories:
    // 1. Domestic Spending - government expenditure
    // 2. Aid on Budget - on-budget + partial aid (non-budget-support)
    // 3. Aid off Budget - off-budget + unknown aid (non-budget-support)
    // 4. Budget Support - A01 (General) and A02 (Sector) budget support
    const chartData: EnhancedAidOnBudgetChartData = {
      centerData: {
        total: totalDomesticExpenditure + totalAid + totalBudgetSupport,
        breakdown: [
          {
            type: "Domestic Spending",
            value: totalDomesticExpenditure,
            color: ENHANCED_CHART_COLORS.domestic,
          },
          {
            type: "Aid on Budget",
            value: effectiveOnBudget,
            color: ENHANCED_CHART_COLORS.onBudgetAid,
          },
          {
            type: "Aid off Budget",
            value: totalOffBudgetAid + totalUnknownAid,
            color: ENHANCED_CHART_COLORS.offBudgetAid,
          },
          {
            type: "Budget Support",
            value: totalBudgetSupport,
            color: ENHANCED_CHART_COLORS.budgetSupport,
          },
        ],
      },
      sectorData: classificationData,
      fiscalYear,
      currency: "USD",
    };

    return NextResponse.json({
      success: true,
      data: classificationData,
      summary,
      chartData,
      filters: {
        fiscalYear,
        classificationType,
      },
    });
  } catch (error) {
    console.error("[Aid on Budget Enhanced] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

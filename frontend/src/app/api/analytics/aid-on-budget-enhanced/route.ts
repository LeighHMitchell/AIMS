import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth';
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
    const startYearParam = searchParams.get("startYear");
    const endYearParam = searchParams.get("endYear");
    const startYear = startYearParam ? parseInt(startYearParam) : null;
    const endYear = endYearParam ? parseInt(endYearParam) : null;
    const classificationType = searchParams.get("classificationType") || "all";

    // 1. Fetch domestic budget data - filter by year range if specified, otherwise get all
    let domesticQuery = supabase
      .from("domestic_budget_data")
      .select(`
        budget_classification_id,
        budget_amount,
        expenditure_amount,
        currency,
        fiscal_year,
        budget_classifications (
          id,
          code,
          name,
          classification_type,
          level
        )
      `);

    if (startYear && endYear) {
      domesticQuery = domesticQuery.gte("fiscal_year", startYear).lte("fiscal_year", endYear);
    } else if (startYear) {
      domesticQuery = domesticQuery.gte("fiscal_year", startYear);
    } else if (endYear) {
      domesticQuery = domesticQuery.lte("fiscal_year", endYear);
    }

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
    // Group by activity to get total disbursements - use value_usd for converted USD amounts
    let transactionsQuery = supabase
      .from("transactions")
      .select(`
        activity_id,
        transaction_type,
        value,
        value_usd,
        transaction_date
      `)
      .in("transaction_type", ["3", "4"]); // Disbursement and Expenditure

    // Filter transactions by year range based on transaction_date
    if (startYear && endYear) {
      transactionsQuery = transactionsQuery
        .gte("transaction_date", `${startYear}-01-01`)
        .lte("transaction_date", `${endYear}-12-31`);
    } else if (startYear) {
      transactionsQuery = transactionsQuery.gte("transaction_date", `${startYear}-01-01`);
    } else if (endYear) {
      transactionsQuery = transactionsQuery.lte("transaction_date", `${endYear}-12-31`);
    }

    const { data: transactions, error: transactionsError } = await transactionsQuery;

    if (transactionsError) {
      console.error("[Aid on Budget Enhanced] Error fetching transactions:", transactionsError);
    }

    // 4. Fetch country budget items to map activities to classifications
    // First fetch country_budget_items
    const { data: countryBudgetItemsRaw, error: cbiError } = await supabase
      .from("country_budget_items")
      .select("id, activity_id, vocabulary");

    if (cbiError) {
      console.error("[Aid on Budget Enhanced] Error fetching country budget items:", cbiError);
    }

    // Then fetch budget_items for all country_budget_items
    const cbiIds = (countryBudgetItemsRaw || []).map(cbi => cbi.id);
    let budgetItemsRaw: any[] = [];

    if (cbiIds.length > 0) {
      const { data: biData, error: biError } = await supabase
        .from("budget_items")
        .select("id, country_budget_items_id, code, percentage")
        .in("country_budget_items_id", cbiIds);

      if (biError) {
        console.error("[Aid on Budget Enhanced] Error fetching budget items:", biError);
      } else {
        budgetItemsRaw = biData || [];
      }
    }

    // Build a map of country_budget_items_id -> budget_items
    const budgetItemsByCbiId = new Map<string, any[]>();
    budgetItemsRaw.forEach(bi => {
      const existing = budgetItemsByCbiId.get(bi.country_budget_items_id) || [];
      existing.push(bi);
      budgetItemsByCbiId.set(bi.country_budget_items_id, existing);
    });

    // Combine into the expected format
    const countryBudgetItems = (countryBudgetItemsRaw || []).map(cbi => ({
      activity_id: cbi.activity_id,
      budget_items: budgetItemsByCbiId.get(cbi.id) || []
    }));

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

    // Process and aggregate data - use value_usd for USD-converted amounts, fallback to value if not available
    const activityDisbursements = new Map<string, number>();
    (transactions || []).forEach((tx) => {
      const current = activityDisbursements.get(tx.activity_id) || 0;
      // Prefer value_usd (converted to USD) over original value
      const txValue = Number(tx.value_usd) || Number(tx.value) || 0;
      activityDisbursements.set(tx.activity_id, current + txValue);
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

    // Build a map of activity -> budget classification codes with percentages
    const activityClassificationMap = new Map<string, Array<{ code: string; percentage: number }>>();
    (countryBudgetItems || []).forEach((cbi: any) => {
      if (cbi.activity_id && cbi.budget_items) {
        const items = Array.isArray(cbi.budget_items) ? cbi.budget_items : [cbi.budget_items];
        const mappings = items
          .filter((item: any) => item && item.code)
          .map((item: any) => ({
            code: item.code,
            percentage: Number(item.percentage) || 0
          }));
        if (mappings.length > 0) {
          activityClassificationMap.set(cbi.activity_id, mappings);
        }
      }
    });

    console.log('[Aid on Budget Enhanced] Activity classification mappings:', activityClassificationMap.size);
    console.log('[Aid on Budget Enhanced] Budget items found:', budgetItemsRaw.length);
    console.log('[Aid on Budget Enhanced] Classifications available:', (classifications || []).map(c => c.code).join(', '));

    // Log the first few mappings for debugging
    let debugCount = 0;
    activityClassificationMap.forEach((mappings, activityId) => {
      if (debugCount < 5) {
        console.log(`[Aid on Budget Enhanced] Activity ${activityId} mapped to:`, mappings);
        debugCount++;
      }
    });

    // Calculate aid amounts per classification code
    const classificationAidTotals = new Map<string, {
      onBudgetAid: number;
      offBudgetAid: number;
      partialAid: number;
      unknownAid: number;
    }>();

    // Initialize totals for all classification codes
    (classifications || []).forEach((c) => {
      classificationAidTotals.set(c.code, {
        onBudgetAid: 0,
        offBudgetAid: 0,
        partialAid: 0,
        unknownAid: 0
      });
    });

    // Map activity disbursements to classifications based on budget_status and country_budget_items
    (activities || []).forEach((activity) => {
      const disbursements = activityDisbursements.get(activity.id) || 0;
      if (disbursements === 0) return;

      const status = activity.budget_status || "unknown";
      const onBudgetPct = activity.on_budget_percentage || 0;
      const aidType = activity.default_aid_type || "";
      const isBudgetSupport = BUDGET_SUPPORT_AID_TYPES.includes(aidType);

      // Skip budget support activities - they're tracked separately
      if (isBudgetSupport) return;

      // Get the classification mappings for this activity
      const mappings = activityClassificationMap.get(activity.id);
      if (!mappings || mappings.length === 0) return;

      // Distribute the activity's disbursements to each mapped classification
      mappings.forEach(({ code, percentage }) => {
        const totals = classificationAidTotals.get(code);
        if (!totals) return;

        // Calculate the aid amount for this classification
        const aidForClassification = (disbursements * percentage) / 100;

        // Categorize by budget status
        switch (status) {
          case "on_budget":
            totals.onBudgetAid += aidForClassification;
            break;
          case "off_budget":
            totals.offBudgetAid += aidForClassification;
            break;
          case "partial":
            // Partial: split by on_budget_percentage
            totals.onBudgetAid += (aidForClassification * onBudgetPct) / 100;
            totals.offBudgetAid += (aidForClassification * (100 - onBudgetPct)) / 100;
            break;
          case "unknown":
          default:
            totals.unknownAid += aidForClassification;
            break;
        }
      });
    });

    // Build classification-level data
    const classificationData: EnhancedChartDataPoint[] = (classifications || []).map((c) => {
      // Find domestic data for this classification
      const domestic = (domesticData || []).find(
        (d) => d.budget_classification_id === c.id
      );

      // Get the calculated aid totals for this classification
      const aidTotals = classificationAidTotals.get(c.code) || {
        onBudgetAid: 0,
        offBudgetAid: 0,
        partialAid: 0,
        unknownAid: 0
      };

      const totalClassificationAid = aidTotals.onBudgetAid + aidTotals.offBudgetAid + aidTotals.partialAid + aidTotals.unknownAid;
      const domesticExp = Number(domestic?.expenditure_amount) || 0;
      const totalSpending = domesticExp + aidTotals.onBudgetAid; // Only on-budget aid contributes to "total spending"

      return {
        name: c.name,
        code: c.code,
        classificationType: c.classification_type,
        level: c.level,
        domesticBudget: Number(domestic?.budget_amount) || 0,
        domesticExpenditure: domesticExp,
        onBudgetAid: aidTotals.onBudgetAid,
        offBudgetAid: aidTotals.offBudgetAid,
        partialAid: aidTotals.partialAid,
        unknownAid: aidTotals.unknownAid,
        totalAid: totalClassificationAid,
        totalSpending: totalSpending,
        aidShare: totalSpending > 0 ? Math.round((aidTotals.onBudgetAid / totalSpending) * 10000) / 100 : 0,
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

    // Build chart data with 4 categories using brand palette:
    // 1. Domestic Spending - Blue Slate (#4c5568)
    // 2. Aid on Budget - Cool Steel (#7b95a7)
    // 3. Aid off Budget - Primary Scarlet (#dc2625)
    // 4. Budget Support - Pale Slate (#cfd0d5)
    const chartData: EnhancedAidOnBudgetChartData = {
      centerData: {
        total: totalDomesticExpenditure + totalAid + totalBudgetSupport,
        breakdown: [
          {
            type: "Domestic Spending",
            value: totalDomesticExpenditure,
            color: ENHANCED_CHART_COLORS.blueSlate,
          },
          {
            type: "Aid on Budget",
            value: effectiveOnBudget,
            color: ENHANCED_CHART_COLORS.coolSteel,
          },
          {
            type: "Aid off Budget",
            value: totalOffBudgetAid + totalUnknownAid,
            color: ENHANCED_CHART_COLORS.primaryScarlet,
          },
          {
            type: "Budget Support",
            value: totalBudgetSupport,
            color: ENHANCED_CHART_COLORS.paleSlate,
          },
        ],
      },
      sectorData: classificationData,
      startYear,
      endYear,
      currency: "USD",
    };

    return NextResponse.json({
      success: true,
      data: classificationData,
      summary,
      chartData,
      filters: {
        startYear,
        endYear,
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

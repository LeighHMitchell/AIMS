import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { BudgetStatusType } from "@/types/activity-budget-status";

// Budget Support aid type codes (IATI)
const BUDGET_SUPPORT_AID_TYPES = ["A01", "A02"]; // A01: General budget support, A02: Sector budget support

interface ActivityDetail {
  id: string;
  title: string;
  iatiIdentifier: string;
  partnerName: string;
  budgetStatus: BudgetStatusType;
  onBudgetPercentage: number | null;
  defaultAidType: string | null;
  isBudgetSupport: boolean;
  totalDisbursements: number;
  onBudgetAmount: number;
  offBudgetAmount: number;
  budgetClassifications: Array<{
    code: string;
    name: string;
    percentage: number;
  }>;
}

/**
 * GET /api/analytics/aid-on-budget-activities
 * Get detailed activity-level data for Aid on Budget table view
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
    const fiscalYearParam = searchParams.get("fiscalYear");
    const fiscalYear = fiscalYearParam ? parseInt(fiscalYearParam) : null;
    const budgetStatusFilter = searchParams.get("budgetStatus"); // on_budget, off_budget, partial, unknown, budget_support, all

    // 1. Fetch activities with basic info (using same pattern as enhanced API)
    const { data: activities, error: activitiesError } = await supabase
      .from("activities")
      .select("*");

    if (activitiesError) {
      console.error("[Aid on Budget Activities] Error fetching activities:", activitiesError);
      return NextResponse.json(
        { error: "Failed to fetch activities", details: activitiesError.message },
        { status: 500 }
      );
    }

    console.log("[Aid on Budget Activities] Fetched activities:", activities?.length);

    // 2. Fetch organizations for partner names
    const orgIds = Array.from(new Set((activities || []).map((a: any) => a.reporting_org_id).filter(Boolean)));
    let organizationsMap = new Map<string, string>();

    if (orgIds.length > 0) {
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", orgIds);

      (orgs || []).forEach(org => {
        organizationsMap.set(org.id, org.name);
      });
    }

    // 3. Fetch transactions (disbursements) - filter by fiscal year if specified
    let txQuery = supabase
      .from("transactions")
      .select(`
        activity_id,
        transaction_type,
        value,
        value_usd,
        transaction_date
      `)
      .in("transaction_type", ["3", "4"]); // Disbursement and Expenditure

    // If fiscal year is specified, filter transactions by date
    if (fiscalYear) {
      // Assuming fiscal year is calendar year for simplicity
      const startDate = `${fiscalYear}-01-01`;
      const endDate = `${fiscalYear}-12-31`;
      txQuery = txQuery.gte("transaction_date", startDate).lte("transaction_date", endDate);
    }

    const { data: transactions, error: transactionsError } = await txQuery;

    if (transactionsError) {
      console.error("[Aid on Budget Activities] Error fetching transactions:", transactionsError);
    }

    console.log("[Aid on Budget Activities] Fetched transactions:", transactions?.length);

    // 4. Fetch country budget items for classification mapping
    const { data: countryBudgetItemsRaw, error: cbiError } = await supabase
      .from("country_budget_items")
      .select("id, activity_id, vocabulary");

    if (cbiError) {
      console.error("[Aid on Budget Activities] Error fetching country budget items:", cbiError);
    }

    // Fetch budget_items with joined budget_classifications
    const cbiIds = (countryBudgetItemsRaw || []).map(cbi => cbi.id);
    let budgetItemsRaw: any[] = [];

    if (cbiIds.length > 0) {
      const { data: biData, error: biError } = await supabase
        .from("budget_items")
        .select(`
          id,
          country_budget_items_id,
          code,
          percentage,
          budget_classification_id
        `)
        .in("country_budget_items_id", cbiIds);

      if (!biError && biData) {
        budgetItemsRaw = biData;
      }
    }

    // Fetch budget classifications for names
    const classificationIds = Array.from(new Set(budgetItemsRaw.map(bi => bi.budget_classification_id).filter(Boolean)));
    let classificationsMap = new Map<string, { code: string; name: string }>();

    if (classificationIds.length > 0) {
      const { data: classifications } = await supabase
        .from("budget_classifications")
        .select("id, code, name")
        .in("id", classificationIds);

      (classifications || []).forEach(c => {
        classificationsMap.set(c.id, { code: c.code, name: c.name });
      });
    }

    // Build a map of activity_id -> budget items with classification info
    const activityBudgetItemsMap = new Map<string, Array<{ code: string; name: string; percentage: number }>>();

    (countryBudgetItemsRaw || []).forEach(cbi => {
      const items = budgetItemsRaw.filter(bi => bi.country_budget_items_id === cbi.id);
      const mappings = items.map(bi => {
        const classification = classificationsMap.get(bi.budget_classification_id);
        return {
          code: bi.code || classification?.code || '',
          name: classification?.name || bi.code || '',
          percentage: Number(bi.percentage) || 0
        };
      }).filter(m => m.code);

      if (mappings.length > 0) {
        const existing = activityBudgetItemsMap.get(cbi.activity_id) || [];
        activityBudgetItemsMap.set(cbi.activity_id, [...existing, ...mappings]);
      }
    });

    // 5. Calculate disbursements per activity
    const activityDisbursements = new Map<string, number>();
    (transactions || []).forEach((tx) => {
      const current = activityDisbursements.get(tx.activity_id) || 0;
      const txValue = Number(tx.value_usd) || Number(tx.value) || 0;
      activityDisbursements.set(tx.activity_id, current + txValue);
    });

    // 6. Build activity details
    const activityDetails: ActivityDetail[] = (activities || []).map((activity: any) => {
      const disbursements = activityDisbursements.get(activity.id) || 0;
      const status = (activity.budget_status as BudgetStatusType) || "unknown";
      const percentage = activity.on_budget_percentage || 0;
      const aidType = activity.default_aid_type || "";
      const isBudgetSupport = BUDGET_SUPPORT_AID_TYPES.includes(aidType);
      const partnerName = activity.reporting_org_id ? organizationsMap.get(activity.reporting_org_id) || "Unknown Partner" : "Unknown Partner";

      // Calculate on/off budget amounts
      let onBudgetAmount = 0;
      let offBudgetAmount = 0;

      if (isBudgetSupport) {
        // Budget support is fully "on budget" by nature
        onBudgetAmount = disbursements;
      } else {
        switch (status) {
          case "on_budget":
            onBudgetAmount = disbursements;
            break;
          case "off_budget":
            offBudgetAmount = disbursements;
            break;
          case "partial":
            onBudgetAmount = (disbursements * percentage) / 100;
            offBudgetAmount = (disbursements * (100 - percentage)) / 100;
            break;
          case "unknown":
          default:
            offBudgetAmount = disbursements;
            break;
        }
      }

      return {
        id: activity.id,
        title: activity.title || "Untitled Activity",
        iatiIdentifier: activity.iati_identifier || "",
        partnerName,
        budgetStatus: status,
        onBudgetPercentage: activity.on_budget_percentage,
        defaultAidType: aidType,
        isBudgetSupport,
        totalDisbursements: disbursements,
        onBudgetAmount,
        offBudgetAmount,
        budgetClassifications: activityBudgetItemsMap.get(activity.id) || [],
      };
    }).filter(a => a.totalDisbursements > 0); // Only include activities with disbursements

    console.log("[Aid on Budget Activities] Activities with disbursements:", activityDetails.length);
    console.log("[Aid on Budget Activities] Disbursements map size:", activityDisbursements.size);

    // Debug: show a few activities with their disbursements
    let debugCount = 0;
    activityDisbursements.forEach((value, key) => {
      if (debugCount < 5 && value > 0) {
        console.log(`[Aid on Budget Activities] Activity ${key}: $${value}`);
        debugCount++;
      }
    });

    // 7. Apply budget status filter if specified
    let filteredActivities = activityDetails;
    if (budgetStatusFilter && budgetStatusFilter !== "all") {
      if (budgetStatusFilter === "budget_support") {
        filteredActivities = activityDetails.filter(a => a.isBudgetSupport);
      } else {
        filteredActivities = activityDetails.filter(a =>
          !a.isBudgetSupport && a.budgetStatus === budgetStatusFilter
        );
      }
    }

    // 8. Calculate totals
    const totals = {
      activities: filteredActivities.length,
      totalDisbursements: filteredActivities.reduce((sum, a) => sum + a.totalDisbursements, 0),
      onBudgetTotal: filteredActivities.reduce((sum, a) => sum + a.onBudgetAmount, 0),
      offBudgetTotal: filteredActivities.reduce((sum, a) => sum + a.offBudgetAmount, 0),
      onBudgetCount: filteredActivities.filter(a => a.budgetStatus === "on_budget" && !a.isBudgetSupport).length,
      offBudgetCount: filteredActivities.filter(a => a.budgetStatus === "off_budget" && !a.isBudgetSupport).length,
      partialCount: filteredActivities.filter(a => a.budgetStatus === "partial" && !a.isBudgetSupport).length,
      unknownCount: filteredActivities.filter(a => a.budgetStatus === "unknown" && !a.isBudgetSupport).length,
      budgetSupportCount: filteredActivities.filter(a => a.isBudgetSupport).length,
    };

    return NextResponse.json({
      success: true,
      activities: filteredActivities,
      totals,
      filters: {
        fiscalYear,
        budgetStatus: budgetStatusFilter || "all",
      },
    });
  } catch (error) {
    console.error("[Aid on Budget Activities] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

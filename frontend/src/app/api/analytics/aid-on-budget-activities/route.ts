import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth';
import { BudgetStatusType } from "@/types/activity-budget-status";

// Budget Support aid type codes (IATI)
const BUDGET_SUPPORT_AID_TYPES = ["A01", "A02"]; // A01: General budget support, A02: Sector budget support

interface ActivityDetail {
  id: string;
  title: string;
  iatiIdentifier: string;
  partnerName: string;
  partnerAcronym: string | null;
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
    classificationType: string;
  }>;
}

/**
 * GET /api/analytics/aid-on-budget-activities
 * Get detailed activity-level data for Aid on Budget table view
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

    // 2. Fetch organizations for partner names and acronyms
    const orgIds = Array.from(new Set((activities || []).map((a: any) => a.reporting_org_id).filter(Boolean)));
    let organizationsMap = new Map<string, { name: string; acronym: string | null }>();

    if (orgIds.length > 0) {
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name, acronym")
        .in("id", orgIds);

      (orgs || []).forEach(org => {
        organizationsMap.set(org.id, { name: org.name, acronym: org.acronym || null });
      });
    }

    // 3. Fetch transactions (disbursements) - filter by year range if specified
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

    // Filter transactions by year range based on transaction_date
    if (startYear && endYear) {
      txQuery = txQuery
        .gte("transaction_date", `${startYear}-01-01`)
        .lte("transaction_date", `${endYear}-12-31`);
    } else if (startYear) {
      txQuery = txQuery.gte("transaction_date", `${startYear}-01-01`);
    } else if (endYear) {
      txQuery = txQuery.lte("transaction_date", `${endYear}-12-31`);
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

    // Fetch budget classifications for names and types
    const classificationIds = Array.from(new Set(budgetItemsRaw.map(bi => bi.budget_classification_id).filter(Boolean)));
    let classificationsMap = new Map<string, { code: string; name: string; classificationType: string }>();

    if (classificationIds.length > 0) {
      const { data: classifications } = await supabase
        .from("budget_classifications")
        .select("id, code, name, classification_type")
        .in("id", classificationIds);

      (classifications || []).forEach(c => {
        classificationsMap.set(c.id, { code: c.code, name: c.name, classificationType: c.classification_type });
      });
    }

    // Build a map of activity_id -> budget items with classification info
    const activityBudgetItemsMap = new Map<string, Array<{ code: string; name: string; percentage: number; classificationType: string }>>();

    (countryBudgetItemsRaw || []).forEach(cbi => {
      const items = budgetItemsRaw.filter(bi => bi.country_budget_items_id === cbi.id);
      const mappings = items.map(bi => {
        const classification = classificationsMap.get(bi.budget_classification_id);
        return {
          code: bi.code || classification?.code || '',
          name: classification?.name || bi.code || '',
          percentage: Number(bi.percentage) || 0,
          classificationType: classification?.classificationType || 'functional'
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
      
      // Get organization name and acronym
      const org = activity.reporting_org_id ? organizationsMap.get(activity.reporting_org_id) : null;
      const partnerName = org?.name || "Unknown Partner";
      const partnerAcronym = org?.acronym || null;

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
        title: activity.title_narrative || activity.title || "Untitled Activity",
        iatiIdentifier: activity.iati_identifier || "",
        partnerName,
        partnerAcronym,
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
        startYear,
        endYear,
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

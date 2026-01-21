import { NextRequest, NextResponse } from "next/server";
import { getSuggestionsForActivity, applyAutoMapping } from "@/lib/sector-budget-mapping-service";
import { requireAuth } from '@/lib/auth';
import { ClassificationType } from "@/types/aid-on-budget";

/**
 * GET /api/activities/[id]/budget-suggestions
 * Get suggested budget mappings based on activity's sectors
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: activityId } = await params;
    // Get activity's sectors first (to show in response)
    const { data: sectors, error: sectorsError } = await supabase
      .from("activity_sectors")
      .select("*")
      .eq("activity_id", activityId)
      .order("percentage", { ascending: false });

    if (sectorsError) {
      console.error("[budget-suggestions] Error fetching sectors:", sectorsError);
      return NextResponse.json(
        { error: "Failed to fetch activity sectors" },
        { status: 500 }
      );
    }

    if (!sectors || sectors.length === 0) {
      return NextResponse.json({
        success: true,
        hasSectors: false,
        sectors: [],
        suggestions: [],
        suggestionsByType: {},
        unmappedSectors: [],
        coveragePercent: 0,
        message: "No sectors assigned to this activity. Add sectors first to get budget mapping suggestions.",
      });
    }

    // Get suggestions from the service
    const result = await getSuggestionsForActivity(activityId);

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to generate suggestions" },
        { status: 500 }
      );
    }

    // Group suggestions by classification type for easier display
    const suggestionsByType: Record<ClassificationType, Array<{
      sectorCode: string;
      sectorName: string;
      sectorPercentage: number;
      classificationCode: string;
      classificationName: string;
      classificationId: string;
      percentage: number;
      isFromCategory: boolean;
    }>> = {
      functional: [],
      functional_cofog: [],
      administrative: [],
      economic: [],
      programme: [],
    };

    for (const suggestion of result.suggestions) {
      if (suggestion.budgetClassification) {
        suggestionsByType[suggestion.classificationType].push({
          sectorCode: suggestion.sectorCode,
          sectorName: suggestion.sectorName,
          sectorPercentage: suggestion.sectorPercentage,
          classificationCode: suggestion.budgetClassification.code,
          classificationName: suggestion.budgetClassification.name,
          classificationId: suggestion.budgetClassification.id,
          percentage: suggestion.percentage,
          isFromCategory: suggestion.isFromCategory,
        });
      }
    }

    // Aggregate by classification type - combine same classifications from multiple sectors
    const aggregatedByType: Record<ClassificationType, Array<{
      classificationCode: string;
      classificationName: string;
      classificationId: string;
      totalPercentage: number;
      sourceSectors: Array<{
        code: string;
        name: string;
        percentage: number;
        isFromCategory: boolean;
      }>;
    }>> = {
      functional: [],
      functional_cofog: [],
      administrative: [],
      economic: [],
      programme: [],
    };

    for (const [type, suggestions] of Object.entries(suggestionsByType)) {
      const byClassification = new Map<string, {
        classificationCode: string;
        classificationName: string;
        classificationId: string;
        totalPercentage: number;
        sourceSectors: Array<{
          code: string;
          name: string;
          percentage: number;
          isFromCategory: boolean;
        }>;
      }>();

      for (const s of suggestions) {
        const key = s.classificationId;
        const existing = byClassification.get(key);

        if (existing) {
          existing.totalPercentage += s.percentage;
          existing.sourceSectors.push({
            code: s.sectorCode,
            name: s.sectorName,
            percentage: s.sectorPercentage,
            isFromCategory: s.isFromCategory,
          });
        } else {
          byClassification.set(key, {
            classificationCode: s.classificationCode,
            classificationName: s.classificationName,
            classificationId: s.classificationId,
            totalPercentage: s.percentage,
            sourceSectors: [{
              code: s.sectorCode,
              name: s.sectorName,
              percentage: s.sectorPercentage,
              isFromCategory: s.isFromCategory,
            }],
          });
        }
      }

      aggregatedByType[type as ClassificationType] = Array.from(byClassification.values());
    }

    // Check if any existing budget items already exist
    const { data: existingCbi } = await supabase
      .from("country_budget_items")
      .select(`
        id,
        vocabulary,
        budget_items (
          id,
          code,
          percentage,
          source_sector_code
        )
      `)
      .eq("activity_id", activityId)
      .eq("vocabulary", "4")
      .single();

    const existingMappings = existingCbi?.budget_items || [];
    const hasExistingAutoMappings = existingMappings.some((item: any) => item.source_sector_code);
    const hasExistingManualMappings = existingMappings.some((item: any) => !item.source_sector_code);

    return NextResponse.json({
      success: true,
      hasSectors: true,
      sectors: sectors.map((s: any) => ({
        code: s.sector_code || s.dac5_code,
        name: s.sector_name || s.dac5_name,
        percentage: s.percentage,
        categoryCode: s.category_code || s.dac3_code,
        categoryName: s.category_name || s.dac3_name,
      })),
      suggestions: result.suggestions,
      suggestionsByType: aggregatedByType,
      unmappedSectors: result.unmappedSectors,
      coveragePercent: result.coveragePercent,
      existingMappings: {
        hasAuto: hasExistingAutoMappings,
        hasManual: hasExistingManualMappings,
        count: existingMappings.length,
      },
    });
  } catch (error: any) {
    console.error("[budget-suggestions] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/activities/[id]/budget-suggestions
 * Apply the suggested budget mappings
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: activityId } = await params;
    const body = await request.json();
    const {
      overwriteExisting = false,
      classificationTypes, // Optional: only apply specific types
    } = body;

    // Apply the auto-mapping
    const result = await applyAutoMapping(activityId, "user", {
      overwriteExisting,
      classificationTypes,
    });

    return NextResponse.json({
      success: result.success,
      created: result.created,
      coveragePercent: result.coveragePercent,
      suggestions: result.suggestions.length,
      unmappedSectors: result.unmappedSectors,
    });
  } catch (error: any) {
    console.error("[budget-suggestions] Error applying mappings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to apply mappings" },
      { status: 500 }
    );
  }
}

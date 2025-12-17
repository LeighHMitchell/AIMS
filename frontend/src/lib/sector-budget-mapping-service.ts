/**
 * Sector to Budget Mapping Service
 *
 * Handles auto-mapping of activities to budget classifications based on
 * their DAC sector codes. Supports both category-level (3-digit) and
 * specific sector-level (5-digit) mappings.
 */

import { getSupabaseAdmin } from './supabase';
import {
  SectorBudgetMapping,
  SectorBudgetMappingRow,
  toSectorBudgetMapping,
  ClassificationType,
  BudgetClassification
} from '@/types/aid-on-budget';

/**
 * Activity sector as stored in database
 */
interface ActivitySector {
  id: string;
  activity_id: string;
  sector_code: string;
  sector_name: string;
  percentage: number;
  category_code?: string;
  category_name?: string;
  level?: string;
}

/**
 * Suggested budget mapping derived from sector mappings
 */
export interface SuggestedBudgetMapping {
  sectorCode: string;
  sectorName: string;
  sectorPercentage: number;
  classificationType: ClassificationType;
  budgetClassification: BudgetClassification;
  percentage: number; // Weighted by sector percentage
  isFromCategory: boolean; // True if from 3-digit category mapping, false if from 5-digit specific
  mappingId: string; // Original sector_budget_mapping ID
}

/**
 * Result from auto-mapping an activity
 */
export interface AutoMappingResult {
  success: boolean;
  activityId: string;
  suggestions: SuggestedBudgetMapping[];
  unmappedSectors: {
    code: string;
    name: string;
    percentage: number;
    missingTypes: ClassificationType[];
  }[];
  coveragePercent: number; // % of activity's sectors that have at least one mapping
  created?: number; // Number of budget items created (if apply was called)
}

/**
 * Fetch sector-to-budget mappings for given sector codes
 * Handles both specific (5-digit) and category-level (3-digit) lookups
 */
export async function getMappingsForSectors(
  sectorCodes: string[]
): Promise<Map<string, SectorBudgetMapping[]>> {
  const supabase = getSupabaseAdmin();

  if (!sectorCodes || sectorCodes.length === 0) {
    return new Map();
  }

  // Extract unique 3-digit category codes
  const categoryCodes = [...new Set(sectorCodes.map(code => code.substring(0, 3)))];

  // Query for both specific sector codes and their parent categories
  const allCodes = [...new Set([...sectorCodes, ...categoryCodes])];

  const { data, error } = await supabase
    .from('sector_budget_mappings')
    .select(`
      *,
      budget_classifications (
        id,
        code,
        name,
        name_local,
        description,
        classification_type,
        parent_id,
        level,
        is_active,
        sort_order
      )
    `)
    .in('sector_code', allCodes)
    .order('sector_code');

  if (error) {
    console.error('[SectorBudgetMapping] Error fetching mappings:', error);
    throw error;
  }

  // Group mappings by sector code
  const mappingsByCode = new Map<string, SectorBudgetMapping[]>();

  for (const row of (data || []) as SectorBudgetMappingRow[]) {
    const mapping = toSectorBudgetMapping(row);
    const code = mapping.sectorCode;

    if (!mappingsByCode.has(code)) {
      mappingsByCode.set(code, []);
    }
    mappingsByCode.get(code)!.push(mapping);
  }

  return mappingsByCode;
}

/**
 * Resolve mappings for a sector code, preferring specific over category
 * Returns mappings grouped by classification type
 */
export function resolveMappingsForSector(
  sectorCode: string,
  mappingsByCode: Map<string, SectorBudgetMapping[]>
): {
  mappings: Map<ClassificationType, { mapping: SectorBudgetMapping; isFromCategory: boolean }>;
  hasSpecific: boolean;
  hasCategory: boolean;
} {
  const result = new Map<ClassificationType, { mapping: SectorBudgetMapping; isFromCategory: boolean }>();

  // Check for specific 5-digit mappings first
  const specificMappings = mappingsByCode.get(sectorCode) || [];

  // Check for category (3-digit) mappings
  const categoryCode = sectorCode.substring(0, 3);
  const categoryMappings = sectorCode.length > 3
    ? (mappingsByCode.get(categoryCode) || []).filter(m => m.isCategoryLevel)
    : [];

  const hasSpecific = specificMappings.length > 0;
  const hasCategory = categoryMappings.length > 0;

  // First, add category mappings
  for (const mapping of categoryMappings) {
    if (mapping.budgetClassification) {
      const type = mapping.budgetClassification.classificationType;
      result.set(type, { mapping, isFromCategory: true });
    }
  }

  // Then override with specific mappings (takes precedence)
  for (const mapping of specificMappings) {
    if (mapping.budgetClassification && !mapping.isCategoryLevel) {
      const type = mapping.budgetClassification.classificationType;
      result.set(type, { mapping, isFromCategory: false });
    }
  }

  return { mappings: result, hasSpecific, hasCategory };
}

/**
 * Generate suggested budget mappings for an activity based on its sectors
 */
export async function getSuggestionsForActivity(
  activityId: string
): Promise<AutoMappingResult> {
  const supabase = getSupabaseAdmin();

  // Fetch activity's sectors
  const { data: sectors, error: sectorsError } = await supabase
    .from('activity_sectors')
    .select('*')
    .eq('activity_id', activityId)
    .order('percentage', { ascending: false });

  if (sectorsError) {
    console.error('[SectorBudgetMapping] Error fetching activity sectors:', sectorsError);
    throw sectorsError;
  }

  if (!sectors || sectors.length === 0) {
    return {
      success: true,
      activityId,
      suggestions: [],
      unmappedSectors: [],
      coveragePercent: 0,
    };
  }

  const activitySectors = sectors as ActivitySector[];
  const sectorCodes = activitySectors.map(s => s.sector_code);

  // Get all relevant mappings
  const mappingsByCode = await getMappingsForSectors(sectorCodes);

  const suggestions: SuggestedBudgetMapping[] = [];
  const unmappedSectors: AutoMappingResult['unmappedSectors'] = [];
  let mappedSectorPercentage = 0;

  const classificationTypes: ClassificationType[] = ['functional', 'administrative', 'economic', 'programme'];

  // Process each sector
  for (const sector of activitySectors) {
    const { mappings, hasSpecific, hasCategory } = resolveMappingsForSector(
      sector.sector_code,
      mappingsByCode
    );

    const missingTypes: ClassificationType[] = [];

    // Check each classification type
    for (const type of classificationTypes) {
      const resolved = mappings.get(type);

      if (resolved && resolved.mapping.budgetClassification) {
        suggestions.push({
          sectorCode: sector.sector_code,
          sectorName: sector.sector_name || '',
          sectorPercentage: sector.percentage,
          classificationType: type,
          budgetClassification: resolved.mapping.budgetClassification,
          percentage: sector.percentage, // Weighted by sector percentage
          isFromCategory: resolved.isFromCategory,
          mappingId: resolved.mapping.id,
        });
      } else {
        missingTypes.push(type);
      }
    }

    // Track coverage
    if (mappings.size > 0) {
      mappedSectorPercentage += sector.percentage;
    }

    // Track unmapped sectors (those missing at least one classification type)
    if (missingTypes.length > 0) {
      unmappedSectors.push({
        code: sector.sector_code,
        name: sector.sector_name || '',
        percentage: sector.percentage,
        missingTypes,
      });
    }
  }

  return {
    success: true,
    activityId,
    suggestions,
    unmappedSectors,
    coveragePercent: mappedSectorPercentage,
  };
}

/**
 * Apply auto-mapping to create budget items for an activity
 * Uses vocabulary "4" (Country Budget Classification) for the mappings
 */
export async function applyAutoMapping(
  activityId: string,
  userId: string,
  options: {
    overwriteExisting?: boolean; // If true, replace existing auto-mapped items
    classificationTypes?: ClassificationType[]; // Which types to apply (default: all)
  } = {}
): Promise<AutoMappingResult> {
  const supabase = getSupabaseAdmin();
  const { overwriteExisting = false, classificationTypes } = options;

  // Get suggestions first
  const result = await getSuggestionsForActivity(activityId);

  if (!result.success || result.suggestions.length === 0) {
    return result;
  }

  // Filter by classification types if specified
  let suggestionsToApply = result.suggestions;
  if (classificationTypes && classificationTypes.length > 0) {
    suggestionsToApply = suggestionsToApply.filter(s =>
      classificationTypes.includes(s.classificationType)
    );
  }

  if (suggestionsToApply.length === 0) {
    return { ...result, created: 0 };
  }

  // Check for existing country_budget_items with vocabulary "4"
  const { data: existingCbi } = await supabase
    .from('country_budget_items')
    .select('id')
    .eq('activity_id', activityId)
    .eq('vocabulary', '4')
    .single();

  let countryBudgetItemsId: string;

  if (existingCbi) {
    if (overwriteExisting) {
      // Delete existing auto-mapped budget items only
      await supabase
        .from('budget_items')
        .delete()
        .eq('country_budget_items_id', existingCbi.id)
        .not('source_sector_code', 'is', null);

      countryBudgetItemsId = existingCbi.id;
    } else {
      // Check which classification types already have manual mappings
      const { data: existingItems } = await supabase
        .from('budget_items')
        .select('code, source_sector_code')
        .eq('country_budget_items_id', existingCbi.id);

      // Filter out suggestions that would duplicate existing manual items
      const existingCodes = new Set(
        (existingItems || [])
          .filter(item => !item.source_sector_code) // Manual items don't have source_sector_code
          .map(item => item.code)
      );

      suggestionsToApply = suggestionsToApply.filter(
        s => !existingCodes.has(s.budgetClassification.code)
      );

      countryBudgetItemsId = existingCbi.id;
    }
  } else {
    // Create new country_budget_items entry
    const { data: newCbi, error: cbiError } = await supabase
      .from('country_budget_items')
      .insert({
        activity_id: activityId,
        vocabulary: '4', // Country Budget Classification
        mapping_source: 'auto',
        auto_mapped_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (cbiError || !newCbi) {
      console.error('[SectorBudgetMapping] Error creating country_budget_items:', cbiError);
      throw cbiError || new Error('Failed to create country_budget_items');
    }

    countryBudgetItemsId = newCbi.id;
  }

  if (suggestionsToApply.length === 0) {
    return { ...result, created: 0 };
  }

  // Aggregate suggestions by budget classification code
  // (combine percentages if same classification from multiple sectors)
  const aggregatedByCode = new Map<string, {
    code: string;
    name: string;
    totalPercentage: number;
    sourceSectors: { code: string; name: string; percentage: number }[];
  }>();

  for (const suggestion of suggestionsToApply) {
    const code = suggestion.budgetClassification.code;
    const existing = aggregatedByCode.get(code);

    if (existing) {
      existing.totalPercentage += suggestion.percentage;
      existing.sourceSectors.push({
        code: suggestion.sectorCode,
        name: suggestion.sectorName,
        percentage: suggestion.percentage,
      });
    } else {
      aggregatedByCode.set(code, {
        code,
        name: suggestion.budgetClassification.name,
        totalPercentage: suggestion.percentage,
        sourceSectors: [{
          code: suggestion.sectorCode,
          name: suggestion.sectorName,
          percentage: suggestion.percentage,
        }],
      });
    }
  }

  // Prepare budget items for insertion
  const budgetItemsToInsert = Array.from(aggregatedByCode.values()).map(agg => {
    // Concatenate source sector codes for tracking
    const sourceSectorCode = agg.sourceSectors.map(s => s.code).join(',');
    const sourceSectorName = agg.sourceSectors.map(s => s.name).join(', ');

    return {
      country_budget_items_id: countryBudgetItemsId,
      code: agg.code,
      percentage: Math.min(agg.totalPercentage, 100), // Cap at 100%
      description: { en: agg.name },
      source_sector_code: sourceSectorCode,
      source_sector_name: sourceSectorName,
    };
  });

  // Insert budget items
  const { data: insertedItems, error: insertError } = await supabase
    .from('budget_items')
    .insert(budgetItemsToInsert)
    .select();

  if (insertError) {
    console.error('[SectorBudgetMapping] Error inserting budget items:', insertError);
    throw insertError;
  }

  return {
    ...result,
    created: insertedItems?.length || 0,
  };
}

/**
 * Get the mapping coverage statistics for a set of sectors
 */
export async function getMappingCoverageStats(
  sectorCodes: string[]
): Promise<{
  totalSectors: number;
  mappedSectors: number;
  partiallyMappedSectors: number;
  unmappedSectors: number;
  coverageByType: Record<ClassificationType, number>;
}> {
  if (!sectorCodes || sectorCodes.length === 0) {
    return {
      totalSectors: 0,
      mappedSectors: 0,
      partiallyMappedSectors: 0,
      unmappedSectors: 0,
      coverageByType: {
        functional: 0,
        functional_cofog: 0,
        administrative: 0,
        economic: 0,
        programme: 0,
      },
    };
  }

  const mappingsByCode = await getMappingsForSectors(sectorCodes);
  const classificationTypes: ClassificationType[] = ['functional', 'functional_cofog', 'administrative', 'economic', 'programme'];

  let mappedSectors = 0;
  let partiallyMappedSectors = 0;
  let unmappedSectors = 0;
  const coverageByType: Record<ClassificationType, number> = {
    functional: 0,
    functional_cofog: 0,
    administrative: 0,
    economic: 0,
    programme: 0,
  };

  for (const code of sectorCodes) {
    const { mappings } = resolveMappingsForSector(code, mappingsByCode);

    // Count coverage by type
    for (const type of classificationTypes) {
      if (mappings.has(type)) {
        coverageByType[type]++;
      }
    }

    // Count sector coverage
    if (mappings.size === 4) {
      mappedSectors++;
    } else if (mappings.size > 0) {
      partiallyMappedSectors++;
    } else {
      unmappedSectors++;
    }
  }

  return {
    totalSectors: sectorCodes.length,
    mappedSectors,
    partiallyMappedSectors,
    unmappedSectors,
    coverageByType,
  };
}

/**
 * Check if an activity has auto-mapped budget items
 */
export async function hasAutoMappedItems(activityId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from('country_budget_items')
    .select(`
      id,
      budget_items!inner (
        id,
        source_sector_code
      )
    `)
    .eq('activity_id', activityId)
    .eq('vocabulary', '4')
    .not('budget_items.source_sector_code', 'is', null)
    .limit(1);

  return (data?.length || 0) > 0;
}

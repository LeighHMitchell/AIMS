import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { CountryBudgetItems, BudgetItem } from '@/types/country-budget-items';

/**
 * GET /api/activities/[id]/country-budget-items
 * Fetch all country budget items for an activity
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id: activityId } = await params;

    // Fetch country budget items with their budget items
    const { data: countryBudgetItems, error: cbiError } = await supabase
      .from('country_budget_items')
      .select('*')
      .eq('activity_id', activityId)
      .order('vocabulary', { ascending: true });

    if (cbiError) {
      console.error('Error fetching country budget items:', cbiError);
      return NextResponse.json(
        { error: 'Failed to fetch country budget items' },
        { status: 500 }
      );
    }

    // Fetch budget items for each country budget item
    const countryBudgetItemsWithItems = await Promise.all(
      (countryBudgetItems || []).map(async (cbi) => {
        const { data: budgetItems, error: biError } = await supabase
          .from('budget_items')
          .select('id, country_budget_items_id, code, percentage, description, source_sector_code, source_sector_name, created_at, updated_at')
          .eq('country_budget_items_id', cbi.id)
          .order('created_at', { ascending: true });

        if (biError) {
          console.error('Error fetching budget items:', biError);
          return { ...cbi, budget_items: [] };
        }

        return {
          ...cbi,
          budget_items: budgetItems || []
        };
      })
    );

    return NextResponse.json({
      country_budget_items: countryBudgetItemsWithItems
    });
  } catch (error) {
    console.error('Error in GET country-budget-items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/activities/[id]/country-budget-items
 * Create or update country budget items for an activity
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id: activityId } = await params;
    const body: CountryBudgetItems = await request.json();

    // Validate request body
    if (!body.vocabulary) {
      return NextResponse.json(
        { error: 'Vocabulary is required' },
        { status: 400 }
      );
    }

    if (!body.budget_items || body.budget_items.length === 0) {
      return NextResponse.json(
        { error: 'At least one budget item is required' },
        { status: 400 }
      );
    }

    // Validate vocabulary code (1-5 are standard, 98-99 are country-specific)
    const validVocabularies = ['1', '2', '3', '4', '5', '98', '99'];
    if (!validVocabularies.includes(body.vocabulary)) {
      return NextResponse.json(
        { error: 'Invalid vocabulary code. Must be 1-5 (standard) or 98-99 (country-specific)' },
        { status: 400 }
      );
    }

    // IATI Watch Point 1: Validate vocabulary_uri for country-specific vocabularies
    if ((body.vocabulary === '98' || body.vocabulary === '99') && !body.vocabulary_uri) {
      return NextResponse.json(
        {
          error: 'vocabulary_uri is required when using vocabulary 98 or 99 (country-specific)',
          iatiRecommendation: true
        },
        { status: 400 }
      );
    }

    // Validate budget items
    const errors: string[] = [];

    body.budget_items.forEach((item, index) => {
      if (!item.code || item.code.trim() === '') {
        errors.push(`Budget item ${index + 1}: Code is required`);
      }
      if (item.percentage === null || item.percentage === undefined) {
        errors.push(`Budget item ${index + 1}: Percentage is required`);
      }
      if (item.percentage < 0 || item.percentage > 100) {
        errors.push(`Budget item ${index + 1}: Percentage must be between 0 and 100`);
      }
    });

    // IATI Watch Point 2: Percentages must sum to exactly 100 per vocabulary
    // This is a hard IATI rule
    const percentageSum = body.budget_items.reduce((sum, item) => sum + (item.percentage || 0), 0);

    // Allow for small rounding errors (within 0.01)
    if (Math.abs(percentageSum - 100) > 0.01) {
      errors.push(
        `IATI Compliance Error: Percentages must sum to exactly 100% per vocabulary. ` +
        `Current sum: ${percentageSum.toFixed(2)}%`
      );
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', errors },
        { status: 400 }
      );
    }

    // Check if country_budget_items already exists for this vocabulary
    const { data: existing } = await supabase
      .from('country_budget_items')
      .select('id')
      .eq('activity_id', activityId)
      .eq('vocabulary', body.vocabulary)
      .single();

    let countryBudgetItemsId: string;

    if (existing) {
      // Update existing
      countryBudgetItemsId = existing.id;

      // Delete existing budget items
      await supabase
        .from('budget_items')
        .delete()
        .eq('country_budget_items_id', countryBudgetItemsId);
    } else {
      // Insert new country_budget_items with vocabulary_uri if provided
      const insertData: Record<string, string> = {
        activity_id: activityId,
        vocabulary: body.vocabulary
      };

      // Include vocabulary_uri for country-specific vocabularies (98/99)
      if (body.vocabulary_uri) {
        insertData.vocabulary_uri = body.vocabulary_uri;
      }

      const { data: newCbi, error: cbiError } = await supabase
        .from('country_budget_items')
        .insert(insertData)
        .select()
        .single();

      if (cbiError || !newCbi) {
        console.error('Error creating country budget items:', cbiError);
        return NextResponse.json(
          { error: 'Failed to create country budget items' },
          { status: 500 }
        );
      }

      countryBudgetItemsId = newCbi.id;
    }

    // Insert budget items
    // Note: description is stored as JSONB with multi-language support
    // Database constraint rejects empty objects, so we must convert {} to null
    const budgetItemsToInsert = body.budget_items.map(item => {
      let description = null;
      if (item.description) {
        if (typeof item.description === 'object') {
          // Check if the object is empty - convert to null if so
          const keys = Object.keys(item.description);
          if (keys.length > 0) {
            // Filter out empty string values
            const filteredDescription: Record<string, string> = {};
            for (const key of keys) {
              const value = (item.description as Record<string, string>)[key];
              if (value && value.trim()) {
                filteredDescription[key] = value;
              }
            }
            // Only use if there's at least one non-empty value
            if (Object.keys(filteredDescription).length > 0) {
              description = filteredDescription;
            }
          }
        } else if (typeof item.description === 'string' && item.description.trim()) {
          // Convert plain string to JSONB format with "en" as default language
          description = { en: item.description };
        }
      }
      return {
        country_budget_items_id: countryBudgetItemsId,
        code: item.code,
        percentage: item.percentage,
        description
      };
    });

    const { error: biError } = await supabase
      .from('budget_items')
      .insert(budgetItemsToInsert);

    if (biError) {
      console.error('Error creating budget items:', biError);
      return NextResponse.json(
        { error: 'Failed to create budget items' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Country budget items saved successfully'
    });
  } catch (error) {
    console.error('Error in POST country-budget-items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/activities/[id]/country-budget-items?vocabulary=X
 * Delete country budget items for a specific vocabulary
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id: activityId } = await params;
    const { searchParams } = new URL(request.url);
    const vocabulary = searchParams.get('vocabulary');

    if (!vocabulary) {
      return NextResponse.json(
        { error: 'Vocabulary parameter is required' },
        { status: 400 }
      );
    }

    // Delete country_budget_items (budget_items will cascade delete)
    const { error } = await supabase
      .from('country_budget_items')
      .delete()
      .eq('activity_id', activityId)
      .eq('vocabulary', vocabulary);

    if (error) {
      console.error('Error deleting country budget items:', error);
      return NextResponse.json(
        { error: 'Failed to delete country budget items' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Country budget items deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE country-budget-items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


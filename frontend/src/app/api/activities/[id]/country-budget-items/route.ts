import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { CountryBudgetItems, BudgetItem } from '@/types/country-budget-items';

/**
 * GET /api/activities/[id]/country-budget-items
 * Fetch all country budget items for an activity
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const activityId = params.id;

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
          .select('*')
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
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const activityId = params.id;
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

    // Validate vocabulary code
    const validVocabularies = ['1', '2', '3', '4', '5'];
    if (!validVocabularies.includes(body.vocabulary)) {
      return NextResponse.json(
        { error: 'Invalid vocabulary code' },
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
      // Insert new country_budget_items
      const { data: newCbi, error: cbiError } = await supabase
        .from('country_budget_items')
        .insert({
          activity_id: activityId,
          vocabulary: body.vocabulary
        })
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
    const budgetItemsToInsert = body.budget_items.map(item => ({
      country_budget_items_id: countryBudgetItemsId,
      code: item.code,
      percentage: item.percentage,
      description: item.description || null
    }));

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
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const activityId = params.id;
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


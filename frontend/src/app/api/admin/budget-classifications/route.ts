import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  BudgetClassificationRow,
  toBudgetClassification,
  ClassificationType,
} from "@/types/aid-on-budget";

/**
 * GET /api/admin/budget-classifications
 * List all budget classifications with optional filtering
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
    const classificationType = searchParams.get("type") as ClassificationType | null;
    const activeOnly = searchParams.get("activeOnly") !== "false";
    const parentId = searchParams.get("parentId");
    const flat = searchParams.get("flat") === "true";

    let query = supabase
      .from("budget_classifications")
      .select("*")
      .order("classification_type")
      .order("level")
      .order("sort_order")
      .order("code");

    // Filter by classification type
    if (classificationType) {
      query = query.eq("classification_type", classificationType);
    }

    // Filter active only
    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    // Filter by parent
    if (parentId) {
      query = query.eq("parent_id", parentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Budget Classifications] Error fetching:", error);
      return NextResponse.json(
        { error: "Failed to fetch budget classifications", details: error.message },
        { status: 500 }
      );
    }

    const classifications = (data as BudgetClassificationRow[]).map(toBudgetClassification);

    // Build tree structure unless flat is requested
    if (!flat) {
      const tree = buildTree(classifications);
      return NextResponse.json({
        success: true,
        data: tree,
        total: classifications.length,
      });
    }

    return NextResponse.json({
      success: true,
      data: classifications,
      total: classifications.length,
    });
  } catch (error) {
    console.error("[Budget Classifications] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/budget-classifications
 * Create a new budget classification
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      code,
      name,
      nameLocal,
      description,
      classificationType,
      parentId,
      isActive = true,
      sortOrder = 0,
    } = body;

    // Validation
    if (!code || !name || !classificationType) {
      return NextResponse.json(
        { error: "Code, name, and classification type are required" },
        { status: 400 }
      );
    }

    const validTypes: ClassificationType[] = ["administrative", "functional", "economic", "programme"];
    if (!validTypes.includes(classificationType)) {
      return NextResponse.json(
        { error: `Invalid classification type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Calculate level based on parent
    let level = 1;
    if (parentId) {
      const { data: parent } = await supabase
        .from("budget_classifications")
        .select("level")
        .eq("id", parentId)
        .single();

      if (parent) {
        level = parent.level + 1;
      }
    }

    const { data, error } = await supabase
      .from("budget_classifications")
      .insert({
        code,
        name,
        name_local: nameLocal,
        description,
        classification_type: classificationType,
        parent_id: parentId || null,
        level,
        is_active: isActive,
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A classification with this code and type already exists" },
          { status: 409 }
        );
      }
      console.error("[Budget Classifications] Error creating:", error);
      return NextResponse.json(
        { error: "Failed to create budget classification", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: toBudgetClassification(data as BudgetClassificationRow),
    });
  } catch (error) {
    console.error("[Budget Classifications] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Build hierarchical tree from flat list
 */
function buildTree(classifications: ReturnType<typeof toBudgetClassification>[]) {
  const map = new Map<string, ReturnType<typeof toBudgetClassification> & { children: ReturnType<typeof toBudgetClassification>[] }>();
  const roots: (ReturnType<typeof toBudgetClassification> & { children: ReturnType<typeof toBudgetClassification>[] })[] = [];

  // First pass: create map with empty children arrays
  classifications.forEach((c) => {
    map.set(c.id, { ...c, children: [] });
  });

  // Second pass: build tree
  classifications.forEach((c) => {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      const parent = map.get(c.parentId)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

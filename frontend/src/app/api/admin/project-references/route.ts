import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  ProjectReference,
  ProjectReferenceRow,
  toProjectReference,
} from "@/types/project-references";

/**
 * GET /api/admin/project-references
 * Get all project references with activity details
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
    const referenceType = searchParams.get("referenceType");
    const activityId = searchParams.get("activityId");
    const search = searchParams.get("search");

    // Build query - fetch project references without join
    let query = supabase
      .from("project_references")
      .select("*")
      .order("created_at", { ascending: false });

    // Apply filters
    if (referenceType) {
      query = query.eq("reference_type", referenceType);
    }

    if (activityId) {
      query = query.eq("activity_id", activityId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Project References] Error fetching:", error);
      return NextResponse.json(
        { error: "Failed to fetch project references", details: error.message },
        { status: 500 }
      );
    }

    // Get unique activity IDs to fetch activity details
    const activityIds = [...new Set((data || []).map((r: ProjectReferenceRow) => r.activity_id))];

    // Fetch activity details
    const { data: activities } = await supabase
      .from("activities")
      .select("id, iati_identifier, title")
      .in("id", activityIds);

    // Create activity lookup map
    const activityMap = new Map<string, { id: string; iati_identifier: string; title: string }>();
    (activities || []).forEach((a: { id: string; iati_identifier: string; title: string }) => {
      activityMap.set(a.id, a);
    });

    // Transform to domain models with activity details
    let references = (data || []).map((row: ProjectReferenceRow) => {
      const ref = toProjectReference(row);
      const activity = activityMap.get(row.activity_id);
      if (activity) {
        ref.activity = {
          id: activity.id,
          iatiIdentifier: activity.iati_identifier,
          title: activity.title,
        };
      }
      return ref;
    });

    // Apply search filter (client-side for flexibility)
    if (search) {
      const searchLower = search.toLowerCase();
      references = references.filter(
        (ref) =>
          ref.code.toLowerCase().includes(searchLower) ||
          ref.name?.toLowerCase().includes(searchLower) ||
          ref.activity?.iatiIdentifier?.toLowerCase().includes(searchLower) ||
          ref.activity?.title?.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      success: true,
      data: references,
      total: references.length,
    });
  } catch (error) {
    console.error("[Project References] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/project-references
 * Create a new project reference
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
      activityId,
      referenceType,
      code,
      name,
      vocabulary,
      vocabularyUri,
      isPrimary,
      notes,
    } = body;

    // Validate required fields
    if (!activityId || !referenceType || !code) {
      return NextResponse.json(
        { error: "Activity ID, reference type, and code are required" },
        { status: 400 }
      );
    }

    // Validate reference type
    if (!["government", "donor", "internal"].includes(referenceType)) {
      return NextResponse.json(
        { error: "Reference type must be 'government', 'donor', or 'internal'" },
        { status: 400 }
      );
    }

    // Verify activity exists
    const { data: activity, error: activityError } = await supabase
      .from("activities")
      .select("id")
      .eq("id", activityId)
      .single();

    if (activityError || !activity) {
      return NextResponse.json(
        { error: "Activity not found" },
        { status: 404 }
      );
    }

    // If setting as primary, unset other primaries for this activity and type
    if (isPrimary) {
      await supabase
        .from("project_references")
        .update({ is_primary: false })
        .eq("activity_id", activityId)
        .eq("reference_type", referenceType);
    }

    // Insert the new reference
    const { data, error } = await supabase
      .from("project_references")
      .insert({
        activity_id: activityId,
        reference_type: referenceType,
        code,
        name,
        vocabulary,
        vocabulary_uri: vocabularyUri,
        is_primary: isPrimary ?? false,
        notes,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A reference with this code already exists for this activity and type" },
          { status: 409 }
        );
      }
      console.error("[Project References] Error creating:", error);
      return NextResponse.json(
        { error: "Failed to create project reference", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: toProjectReference(data as ProjectReferenceRow),
    });
  } catch (error) {
    console.error("[Project References] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

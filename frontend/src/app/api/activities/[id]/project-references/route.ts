import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  ProjectReferenceRow,
  toProjectReference,
} from "@/types/project-references";

/**
 * GET /api/activities/[id]/project-references
 * Get all project references for a specific activity
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: activityId } = await params;
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from("project_references")
      .select("*")
      .eq("activity_id", activityId)
      .order("is_primary", { ascending: false })
      .order("reference_type")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Activity Project References] Error fetching:", error);
      return NextResponse.json(
        { error: "Failed to fetch project references", details: error.message },
        { status: 500 }
      );
    }

    const references = (data || []).map((row: ProjectReferenceRow) =>
      toProjectReference(row)
    );

    return NextResponse.json({
      success: true,
      data: references,
      total: references.length,
    });
  } catch (error) {
    console.error("[Activity Project References] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/activities/[id]/project-references
 * Create a new project reference for this activity
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: activityId } = await params;
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      referenceType,
      code,
      name,
      vocabulary,
      vocabularyUri,
      isPrimary,
      notes,
    } = body;

    // Validate required fields
    if (!referenceType || !code) {
      return NextResponse.json(
        { error: "Reference type and code are required" },
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
      console.error("[Activity Project References] Error creating:", error);
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
    console.error("[Activity Project References] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/activities/[id]/project-references
 * Update a project reference (pass referenceId in body)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: activityId } = await params;
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      referenceId,
      referenceType,
      code,
      name,
      vocabulary,
      vocabularyUri,
      isPrimary,
      notes,
    } = body;

    if (!referenceId) {
      return NextResponse.json(
        { error: "Reference ID is required" },
        { status: 400 }
      );
    }

    // Verify reference exists and belongs to this activity
    const { data: current, error: currentError } = await supabase
      .from("project_references")
      .select("id, reference_type")
      .eq("id", referenceId)
      .eq("activity_id", activityId)
      .single();

    if (currentError || !current) {
      return NextResponse.json(
        { error: "Project reference not found" },
        { status: 404 }
      );
    }

    // If setting as primary, unset other primaries for this activity and type
    const typeToUse = referenceType || current.reference_type;
    if (isPrimary) {
      await supabase
        .from("project_references")
        .update({ is_primary: false })
        .eq("activity_id", activityId)
        .eq("reference_type", typeToUse)
        .neq("id", referenceId);
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (referenceType !== undefined) updateData.reference_type = referenceType;
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (vocabulary !== undefined) updateData.vocabulary = vocabulary;
    if (vocabularyUri !== undefined) updateData.vocabulary_uri = vocabularyUri;
    if (isPrimary !== undefined) updateData.is_primary = isPrimary;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from("project_references")
      .update(updateData)
      .eq("id", referenceId)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A reference with this code already exists for this activity and type" },
          { status: 409 }
        );
      }
      console.error("[Activity Project References] Error updating:", error);
      return NextResponse.json(
        { error: "Failed to update project reference", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: toProjectReference(data as ProjectReferenceRow),
    });
  } catch (error) {
    console.error("[Activity Project References] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/activities/[id]/project-references
 * Delete a project reference (pass referenceId in query or body)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: activityId } = await params;
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    // Get referenceId from query string or body
    const referenceId = request.nextUrl.searchParams.get("referenceId");

    if (!referenceId) {
      return NextResponse.json(
        { error: "Reference ID is required" },
        { status: 400 }
      );
    }

    // Delete the reference (only if it belongs to this activity)
    const { error } = await supabase
      .from("project_references")
      .delete()
      .eq("id", referenceId)
      .eq("activity_id", activityId);

    if (error) {
      console.error("[Activity Project References] Error deleting:", error);
      return NextResponse.json(
        { error: "Failed to delete project reference", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Project reference deleted successfully",
    });
  } catch (error) {
    console.error("[Activity Project References] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

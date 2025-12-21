import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  ProjectReferenceRow,
  toProjectReference,
} from "@/types/project-references";

/**
 * GET /api/admin/project-references/[id]
 * Get a single project reference by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Project reference not found" },
          { status: 404 }
        );
      }
      console.error("[Project References] Error fetching:", error);
      return NextResponse.json(
        { error: "Failed to fetch project reference", details: error.message },
        { status: 500 }
      );
    }

    // Fetch activity details
    const { data: activity } = await supabase
      .from("activities")
      .select("id, iati_identifier, title")
      .eq("id", data.activity_id)
      .single();

    const ref = toProjectReference(data as ProjectReferenceRow);
    if (activity) {
      ref.activity = {
        id: activity.id,
        iatiIdentifier: activity.iati_identifier,
        title: activity.title,
      };
    }

    return NextResponse.json({
      success: true,
      data: ref,
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
 * PUT /api/admin/project-references/[id]
 * Update a project reference
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Get current reference to check activity_id
    const { data: current, error: currentError } = await supabase
      .from("project_references")
      .select("activity_id, reference_type")
      .eq("id", id)
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
        .eq("activity_id", current.activity_id)
        .eq("reference_type", typeToUse)
        .neq("id", id);
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
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A reference with this code already exists for this activity and type" },
          { status: 409 }
        );
      }
      console.error("[Project References] Error updating:", error);
      return NextResponse.json(
        { error: "Failed to update project reference", details: error.message },
        { status: 500 }
      );
    }

    // Fetch activity details
    const { data: activity } = await supabase
      .from("activities")
      .select("id, iati_identifier, title")
      .eq("id", data.activity_id)
      .single();

    const ref = toProjectReference(data as ProjectReferenceRow);
    if (activity) {
      ref.activity = {
        id: activity.id,
        iatiIdentifier: activity.iati_identifier,
        title: activity.title,
      };
    }

    return NextResponse.json({
      success: true,
      data: ref,
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
 * DELETE /api/admin/project-references/[id]
 * Delete a project reference
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const { error } = await supabase
      .from("project_references")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Project References] Error deleting:", error);
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
    console.error("[Project References] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

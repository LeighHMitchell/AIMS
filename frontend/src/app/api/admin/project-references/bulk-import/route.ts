import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth';
import {
  ReferenceType,
  ProjectReferenceBulkImportResult,
} from "@/types/project-references";

interface ImportRow {
  activity_iati_id: string;
  reference_type: string;
  code: string;
  name?: string;
  vocabulary?: string;
  is_primary?: string | boolean;
}

/**
 * POST /api/admin/project-references/bulk-import
 * Bulk import project references from CSV data
 *
 * Expected CSV columns:
 * - activity_iati_id (required): IATI identifier to match
 * - reference_type (required): 'government', 'donor', or 'internal'
 * - code (required): The project reference code
 * - name (optional): Human-readable name
 * - vocabulary (optional): Vocabulary/standard used
 * - is_primary (optional): 'true' or 'false'
 */
export async function POST(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { rows, updateExisting = false } = body as {
      rows: ImportRow[];
      updateExisting?: boolean;
    };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No data rows provided" },
        { status: 400 }
      );
    }

    const result: ProjectReferenceBulkImportResult = {
      success: true,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    // Get all unique IATI identifiers from the import
    const iatiIds = [...new Set(rows.map((r) => r.activity_iati_id).filter(Boolean))];

    // Fetch all matching activities
    const { data: activities, error: activityError } = await supabase
      .from("activities")
      .select("id, iati_identifier")
      .in("iati_identifier", iatiIds);

    if (activityError) {
      console.error("[Bulk Import] Error fetching activities:", activityError);
      return NextResponse.json(
        { error: "Failed to fetch activities", details: activityError.message },
        { status: 500 }
      );
    }

    // Create lookup map
    const activityMap = new Map<string, string>();
    (activities || []).forEach((a: { id: string; iati_identifier: string }) => {
      activityMap.set(a.iati_identifier, a.id);
    });

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      // Validate required fields
      if (!row.activity_iati_id) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          activityIatiId: row.activity_iati_id || "",
          error: "Missing activity_iati_id",
        });
        continue;
      }

      if (!row.reference_type) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          activityIatiId: row.activity_iati_id,
          error: "Missing reference_type",
        });
        continue;
      }

      if (!row.code) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          activityIatiId: row.activity_iati_id,
          error: "Missing code",
        });
        continue;
      }

      // Validate reference type
      const referenceType = row.reference_type.toLowerCase() as ReferenceType;
      if (!["government", "donor", "internal"].includes(referenceType)) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          activityIatiId: row.activity_iati_id,
          error: `Invalid reference_type: ${row.reference_type}. Must be 'government', 'donor', or 'internal'`,
        });
        continue;
      }

      // Find activity
      const activityId = activityMap.get(row.activity_iati_id);
      if (!activityId) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          activityIatiId: row.activity_iati_id,
          error: `Activity not found: ${row.activity_iati_id}`,
        });
        continue;
      }

      // Parse is_primary
      const isPrimary =
        row.is_primary === true ||
        row.is_primary === "true" ||
        row.is_primary === "1" ||
        row.is_primary === "yes";

      // Check if reference already exists
      const { data: existing } = await supabase
        .from("project_references")
        .select("id")
        .eq("activity_id", activityId)
        .eq("reference_type", referenceType)
        .eq("code", row.code)
        .single();

      if (existing) {
        if (updateExisting) {
          // Update existing reference
          const { error: updateError } = await supabase
            .from("project_references")
            .update({
              name: row.name,
              vocabulary: row.vocabulary,
              is_primary: isPrimary,
            })
            .eq("id", existing.id);

          if (updateError) {
            result.failed++;
            result.errors.push({
              row: rowNum,
              activityIatiId: row.activity_iati_id,
              error: `Update failed: ${updateError.message}`,
            });
          } else {
            result.updated++;
          }
        } else {
          // Skip - already exists
          result.failed++;
          result.errors.push({
            row: rowNum,
            activityIatiId: row.activity_iati_id,
            error: "Reference already exists (use updateExisting=true to update)",
          });
        }
        continue;
      }

      // If setting as primary, unset other primaries
      if (isPrimary) {
        await supabase
          .from("project_references")
          .update({ is_primary: false })
          .eq("activity_id", activityId)
          .eq("reference_type", referenceType);
      }

      // Insert new reference
      const { error: insertError } = await supabase
        .from("project_references")
        .insert({
          activity_id: activityId,
          reference_type: referenceType,
          code: row.code,
          name: row.name,
          vocabulary: row.vocabulary,
          is_primary: isPrimary,
        });

      if (insertError) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          activityIatiId: row.activity_iati_id,
          error: `Insert failed: ${insertError.message}`,
        });
      } else {
        result.created++;
      }
    }

    // Set success based on whether any rows failed
    result.success = result.failed === 0;

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Bulk Import] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/project-references/bulk-import
 * Get CSV template for bulk import
 */
export async function GET() {
  const template = `activity_iati_id,reference_type,code,name,vocabulary,is_primary
GB-1-123456,government,PIP-2024-001,National Health Programme,national_pip,true
GB-1-123456,donor,DFID-12345,UK Health Grant,donor_reference,false
GB-1-789012,government,MOF-2024-042,Education Infrastructure,ministry_code,true`;

  return new NextResponse(template, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="project_references_template.csv"',
    },
  });
}

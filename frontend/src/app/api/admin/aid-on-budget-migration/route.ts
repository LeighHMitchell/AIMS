import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/admin/aid-on-budget-migration
 * Check migration status for Aid on Budget tables
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Missing Supabase configuration" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if budget_classifications table exists
    const { data: classifications, error: classError } = await supabase
      .from("budget_classifications")
      .select("id, code, name, classification_type")
      .limit(5);

    // Check if sector_budget_mappings table exists
    const { data: mappings, error: mappingsError } = await supabase
      .from("sector_budget_mappings")
      .select("id")
      .limit(1);

    const projectId = supabaseUrl.split("//")[1].split(".")[0];

    const tables = {
      budget_classifications: {
        exists: !classError?.message?.includes("does not exist"),
        sampleData: classifications || [],
        error: classError?.message?.includes("does not exist") ? "Table does not exist" : classError?.message,
      },
      sector_budget_mappings: {
        exists: !mappingsError?.message?.includes("does not exist"),
        error: mappingsError?.message?.includes("does not exist") ? "Table does not exist" : mappingsError?.message,
      },
    };

    const allTablesExist = tables.budget_classifications.exists && tables.sector_budget_mappings.exists;

    if (!allTablesExist) {
      return NextResponse.json({
        success: false,
        migrationComplete: false,
        tables,
        instructions: {
          message: "Aid on Budget tables need to be created. Please run the migration SQL.",
          steps: [
            "1. Go to your Supabase Dashboard SQL Editor",
            "2. Open the file: supabase/migrations/20251215000000_create_aid_on_budget_tables.sql",
            "3. Copy the entire contents of the file",
            "4. Paste into the SQL Editor and click 'Run'",
          ],
          dashboardUrl: `https://supabase.com/dashboard/project/${projectId}/sql/new`,
          migrationFile: "supabase/migrations/20251215000000_create_aid_on_budget_tables.sql",
        },
      });
    }

    // Get counts
    const { count: classCount } = await supabase
      .from("budget_classifications")
      .select("*", { count: "exact", head: true });

    const { count: mappingsCount } = await supabase
      .from("sector_budget_mappings")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      success: true,
      migrationComplete: true,
      tables,
      counts: {
        budget_classifications: classCount || 0,
        sector_budget_mappings: mappingsCount || 0,
      },
      projectId,
      dashboardUrl: `https://supabase.com/dashboard/project/${projectId}/sql`,
    });
  } catch (error) {
    console.error("[Aid on Budget Migration Status] Error:", error);
    return NextResponse.json(
      { error: "Failed to check migration status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/aid-on-budget-migration
 * Attempt to seed data if tables exist but are empty
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Missing Supabase configuration" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if table exists
    const { error: checkError } = await supabase
      .from("budget_classifications")
      .select("id")
      .limit(1);

    if (checkError?.message?.includes("does not exist")) {
      return NextResponse.json(
        {
          error: "Table does not exist",
          message: "Please run the migration SQL first to create the tables",
        },
        { status: 400 }
      );
    }

    // Check if we already have data
    const { count } = await supabase
      .from("budget_classifications")
      .select("*", { count: "exact", head: true });

    if (count && count > 0) {
      return NextResponse.json({
        success: true,
        message: "Tables already have data",
        count,
      });
    }

    // Insert seed data - functional classifications (COFOG)
    const functionalData = [
      { code: '01', name: 'General Public Services', description: 'Executive and legislative organs, financial and fiscal affairs, external affairs', classification_type: 'functional', level: 1, sort_order: 1 },
      { code: '02', name: 'Defence', description: 'Military defence, civil defence, foreign military aid', classification_type: 'functional', level: 1, sort_order: 2 },
      { code: '03', name: 'Public Order and Safety', description: 'Police services, fire-protection services, law courts, prisons', classification_type: 'functional', level: 1, sort_order: 3 },
      { code: '04', name: 'Economic Affairs', description: 'General economic, commercial and labour affairs', classification_type: 'functional', level: 1, sort_order: 4 },
      { code: '05', name: 'Environmental Protection', description: 'Waste management, pollution abatement, protection of biodiversity', classification_type: 'functional', level: 1, sort_order: 5 },
      { code: '06', name: 'Housing and Community Amenities', description: 'Housing development, community development, water supply', classification_type: 'functional', level: 1, sort_order: 6 },
      { code: '07', name: 'Health', description: 'Medical products, appliances and equipment, outpatient and hospital services', classification_type: 'functional', level: 1, sort_order: 7 },
      { code: '08', name: 'Recreation, Culture and Religion', description: 'Recreational and sporting services, cultural services', classification_type: 'functional', level: 1, sort_order: 8 },
      { code: '09', name: 'Education', description: 'Pre-primary, primary, secondary, tertiary and non-tertiary education', classification_type: 'functional', level: 1, sort_order: 9 },
      { code: '10', name: 'Social Protection', description: 'Sickness and disability, old age, family and children, unemployment', classification_type: 'functional', level: 1, sort_order: 10 },
    ];

    const { error: functionalError } = await supabase
      .from("budget_classifications")
      .insert(functionalData);

    if (functionalError) {
      console.error("Error inserting functional data:", functionalError);
    }

    // Insert economic classifications
    const economicData = [
      { code: 'E1', name: 'Compensation of Employees', description: 'Wages, salaries, and allowances for employees', classification_type: 'economic', level: 1, sort_order: 1 },
      { code: 'E2', name: 'Use of Goods and Services', description: 'Operating costs, supplies, maintenance', classification_type: 'economic', level: 1, sort_order: 2 },
      { code: 'E3', name: 'Consumption of Fixed Capital', description: 'Depreciation of fixed assets', classification_type: 'economic', level: 1, sort_order: 3 },
      { code: 'E4', name: 'Interest', description: 'Interest payments on loans and debt', classification_type: 'economic', level: 1, sort_order: 4 },
      { code: 'E5', name: 'Subsidies', description: 'Subsidies to corporations and enterprises', classification_type: 'economic', level: 1, sort_order: 5 },
      { code: 'E6', name: 'Grants', description: 'Grants to other government units, international organizations', classification_type: 'economic', level: 1, sort_order: 6 },
      { code: 'E7', name: 'Social Benefits', description: 'Social security, social assistance benefits', classification_type: 'economic', level: 1, sort_order: 7 },
      { code: 'E8', name: 'Other Expenses', description: 'Property expense, other miscellaneous expenses', classification_type: 'economic', level: 1, sort_order: 8 },
    ];

    const { error: economicError } = await supabase
      .from("budget_classifications")
      .insert(economicData);

    if (economicError) {
      console.error("Error inserting economic data:", economicError);
    }

    // Insert administrative classifications
    const adminData = [
      { code: 'MOF', name: 'Ministry of Finance', description: 'Ministry responsible for fiscal policy and government revenue', classification_type: 'administrative', level: 1, sort_order: 1 },
      { code: 'MOH', name: 'Ministry of Health', description: 'Ministry responsible for health services and policy', classification_type: 'administrative', level: 1, sort_order: 2 },
      { code: 'MOE', name: 'Ministry of Education', description: 'Ministry responsible for education services and policy', classification_type: 'administrative', level: 1, sort_order: 3 },
      { code: 'MOAIF', name: 'Ministry of Agriculture', description: 'Ministry for productive sectors', classification_type: 'administrative', level: 1, sort_order: 4 },
      { code: 'MoWE', name: 'Ministry of Water and Environment', description: 'Ministry for water resources and environment', classification_type: 'administrative', level: 1, sort_order: 5 },
      { code: 'MoWT', name: 'Ministry of Works and Transport', description: 'Ministry for infrastructure and transport', classification_type: 'administrative', level: 1, sort_order: 6 },
    ];

    const { error: adminError } = await supabase
      .from("budget_classifications")
      .insert(adminData);

    if (adminError) {
      console.error("Error inserting administrative data:", adminError);
    }

    // Get final count
    const { count: finalCount } = await supabase
      .from("budget_classifications")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      success: true,
      message: "Seed data inserted successfully",
      count: finalCount || 0,
      inserted: {
        functional: !functionalError ? 10 : 0,
        economic: !economicError ? 8 : 0,
        administrative: !adminError ? 6 : 0,
      },
    });
  } catch (error) {
    console.error("[Aid on Budget Migration] Error:", error);
    return NextResponse.json(
      { error: "Migration failed" },
      { status: 500 }
    );
  }
}

import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Transaction Budget Inference Service
 *
 * Infers budget classifications for transactions based on:
 * - Provider Org → Funding Source classification
 * - Receiver Org → Administrative classification
 * - Sectors → Functional, Economic, Programme classifications
 * - Finance Type → Revenue (grants) or Liabilities (loans)
 */

export interface BudgetClassificationRef {
  id: string;
  code: string;
  name: string;
}

export interface BudgetLineInference {
  sectorCode: string | null;
  sectorName: string | null;
  sectorPercentage: number;
  amount: number;
  currency: string;
  fundingSource: BudgetClassificationRef | null;
  administrative: BudgetClassificationRef | null;
  functional: BudgetClassificationRef | null;
  economic: BudgetClassificationRef | null;
  programme: BudgetClassificationRef | null;
  revenue: BudgetClassificationRef | null;
  liabilities: BudgetClassificationRef | null;
}

export interface TransactionInferenceInput {
  providerOrgId?: string | null;
  receiverOrgId?: string | null;
  financeType?: string | null;
  sectors: { code: string; name?: string; percentage: number }[];
  value: number;
  currency: string;
}

export interface InferenceResult {
  lines: BudgetLineInference[];
  unmapped: {
    providerOrgMissing: boolean;
    receiverOrgMissing: boolean;
    financeTypeMissing: boolean;
    sectorsWithoutMapping: string[];
  };
}

// Finance type codes that are loans (liabilities), all others are grants (revenue)
const LOAN_FINANCE_TYPES = [
  "421", "422", "423", "424", "425",  // Standard loans
  "431", "432", "433",                 // Equity investments
  "451", "452", "453",                 // Debt relief
  "510", "511", "512",                 // Debt instruments
  "610", "611", "612", "613", "614", "615", "616", "617", "618", // Private sector instruments
];

function isLoanFinanceType(financeType: string | null | undefined): boolean {
  if (!financeType) return false;
  return LOAN_FINANCE_TYPES.includes(financeType);
}

/**
 * Get funding source classification for a provider organization
 */
async function getFundingSourceMapping(
  supabase: SupabaseClient,
  providerOrgId: string
): Promise<BudgetClassificationRef | null> {
  const { data, error } = await supabase
    .from("organization_funding_source_mappings")
    .select(`
      budget_classifications (
        id,
        code,
        name
      )
    `)
    .eq("organization_id", providerOrgId)
    .single();

  if (error || !data?.budget_classifications) {
    return null;
  }

  const bc = data.budget_classifications as any;
  return { id: bc.id, code: bc.code, name: bc.name };
}

/**
 * Get administrative classification for a receiver organization
 */
async function getAdministrativeMapping(
  supabase: SupabaseClient,
  receiverOrgId: string
): Promise<BudgetClassificationRef | null> {
  const { data, error } = await supabase
    .from("organization_administrative_mappings")
    .select(`
      budget_classifications (
        id,
        code,
        name
      )
    `)
    .eq("organization_id", receiverOrgId)
    .single();

  if (error || !data?.budget_classifications) {
    return null;
  }

  const bc = data.budget_classifications as any;
  return { id: bc.id, code: bc.code, name: bc.name };
}

/**
 * Get revenue or liabilities classification for a finance type
 */
async function getFinanceTypeMapping(
  supabase: SupabaseClient,
  financeType: string,
  classificationType: "revenue" | "liabilities"
): Promise<BudgetClassificationRef | null> {
  const { data, error } = await supabase
    .from("finance_type_classification_mappings")
    .select(`
      budget_classifications (
        id,
        code,
        name
      )
    `)
    .eq("finance_type_code", financeType)
    .eq("classification_type", classificationType)
    .single();

  if (error || !data?.budget_classifications) {
    return null;
  }

  const bc = data.budget_classifications as any;
  return { id: bc.id, code: bc.code, name: bc.name };
}

/**
 * Get sector-based classifications (functional, economic, programme)
 */
async function getSectorMappings(
  supabase: SupabaseClient,
  sectorCode: string
): Promise<{
  functional: BudgetClassificationRef | null;
  economic: BudgetClassificationRef | null;
  programme: BudgetClassificationRef | null;
}> {
  // Try exact sector code first, then fall back to category (3-digit) code
  const categoryCode = sectorCode.substring(0, 3);

  const { data: mappings, error } = await supabase
    .from("sector_budget_mappings")
    .select(`
      budget_classification_id,
      budget_classifications (
        id,
        code,
        name,
        classification_type
      )
    `)
    .or(`sector_code.eq.${sectorCode},sector_code.eq.${categoryCode}`)
    .eq("is_default", true);

  if (error || !mappings) {
    return { functional: null, economic: null, programme: null };
  }

  const result: {
    functional: BudgetClassificationRef | null;
    economic: BudgetClassificationRef | null;
    programme: BudgetClassificationRef | null;
  } = { functional: null, economic: null, programme: null };

  // Prefer specific sector mappings over category mappings
  const sortedMappings = [...mappings].sort((a, b) => {
    const aIsSpecific = (a as any).budget_classifications?.code?.length === 5;
    const bIsSpecific = (b as any).budget_classifications?.code?.length === 5;
    return bIsSpecific ? 1 : aIsSpecific ? -1 : 0;
  });

  for (const mapping of sortedMappings) {
    const bc = (mapping as any).budget_classifications;
    if (!bc) continue;

    const ref: BudgetClassificationRef = { id: bc.id, code: bc.code, name: bc.name };
    const type = bc.classification_type;

    if (type === "functional" && !result.functional) {
      result.functional = ref;
    } else if (type === "economic" && !result.economic) {
      result.economic = ref;
    } else if (type === "programme" && !result.programme) {
      result.programme = ref;
    }
  }

  return result;
}

/**
 * Infer budget classifications for a transaction
 * Returns one line per sector (or one line if no sectors)
 */
export async function inferBudgetLines(
  supabase: SupabaseClient,
  input: TransactionInferenceInput
): Promise<InferenceResult> {
  const { providerOrgId, receiverOrgId, financeType, sectors, value, currency } = input;

  const unmapped = {
    providerOrgMissing: false,
    receiverOrgMissing: false,
    financeTypeMissing: false,
    sectorsWithoutMapping: [] as string[],
  };

  // Get org-based mappings (shared across all lines)
  let fundingSource: BudgetClassificationRef | null = null;
  let administrative: BudgetClassificationRef | null = null;
  let revenue: BudgetClassificationRef | null = null;
  let liabilities: BudgetClassificationRef | null = null;

  if (providerOrgId) {
    fundingSource = await getFundingSourceMapping(supabase, providerOrgId);
    if (!fundingSource) unmapped.providerOrgMissing = true;
  }

  if (receiverOrgId) {
    administrative = await getAdministrativeMapping(supabase, receiverOrgId);
    if (!administrative) unmapped.receiverOrgMissing = true;
  }

  if (financeType) {
    const isLoan = isLoanFinanceType(financeType);
    if (isLoan) {
      liabilities = await getFinanceTypeMapping(supabase, financeType, "liabilities");
      if (!liabilities) unmapped.financeTypeMissing = true;
    } else {
      revenue = await getFinanceTypeMapping(supabase, financeType, "revenue");
      if (!revenue) unmapped.financeTypeMissing = true;
    }
  }

  // If no sectors, create a single line with 100%
  const effectiveSectors = sectors.length > 0
    ? sectors
    : [{ code: "", name: "", percentage: 100 }];

  const lines: BudgetLineInference[] = [];

  for (const sector of effectiveSectors) {
    const sectorAmount = (value * sector.percentage) / 100;

    let functional: BudgetClassificationRef | null = null;
    let economic: BudgetClassificationRef | null = null;
    let programme: BudgetClassificationRef | null = null;

    if (sector.code) {
      const sectorMappings = await getSectorMappings(supabase, sector.code);
      functional = sectorMappings.functional;
      economic = sectorMappings.economic;
      programme = sectorMappings.programme;

      if (!functional && !economic && !programme) {
        unmapped.sectorsWithoutMapping.push(sector.code);
      }
    }

    lines.push({
      sectorCode: sector.code || null,
      sectorName: sector.name || null,
      sectorPercentage: sector.percentage,
      amount: sectorAmount,
      currency,
      fundingSource,
      administrative,
      functional,
      economic,
      programme,
      revenue,
      liabilities,
    });
  }

  return { lines, unmapped };
}

/**
 * Apply inferred budget lines to a transaction
 * Preserves lines that have is_override = true unless force is specified
 */
export async function applyBudgetLinesToTransaction(
  supabase: SupabaseClient,
  transactionId: string,
  lines: BudgetLineInference[],
  options?: { force?: boolean }
): Promise<{ success: boolean; linesCreated: number; linesPreserved: number }> {
  const force = options?.force ?? false;

  // Get existing override lines if not forcing
  let preservedLineIds: string[] = [];
  if (!force) {
    const { data: existingLines } = await supabase
      .from("transaction_budget_lines")
      .select("id")
      .eq("transaction_id", transactionId)
      .eq("is_override", true);

    preservedLineIds = (existingLines || []).map((l: any) => l.id);
  }

  // Delete non-override lines (or all lines if forcing)
  const deleteQuery = supabase
    .from("transaction_budget_lines")
    .delete()
    .eq("transaction_id", transactionId);

  if (!force && preservedLineIds.length > 0) {
    // Delete only non-override lines
    await deleteQuery.eq("is_override", false);
  } else {
    await deleteQuery;
  }

  // Insert new inferred lines
  const linesToInsert = lines.map(line => ({
    transaction_id: transactionId,
    sector_code: line.sectorCode,
    sector_name: line.sectorName,
    sector_percentage: line.sectorPercentage,
    amount: line.amount,
    currency: line.currency,
    funding_source_classification_id: line.fundingSource?.id || null,
    administrative_classification_id: line.administrative?.id || null,
    functional_classification_id: line.functional?.id || null,
    economic_classification_id: line.economic?.id || null,
    programme_classification_id: line.programme?.id || null,
    revenue_classification_id: line.revenue?.id || null,
    liabilities_classification_id: line.liabilities?.id || null,
    is_override: false,
    inferred_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("transaction_budget_lines")
    .insert(linesToInsert);

  if (error) {
    console.error("[Budget Inference] Error inserting lines:", error);
    return { success: false, linesCreated: 0, linesPreserved: preservedLineIds.length };
  }

  return {
    success: true,
    linesCreated: linesToInsert.length,
    linesPreserved: force ? 0 : preservedLineIds.length
  };
}

/**
 * Infer and apply budget lines for a transaction in one step
 */
export async function inferAndApplyBudgetLines(
  supabase: SupabaseClient,
  transactionId: string,
  input: TransactionInferenceInput,
  options?: { force?: boolean }
): Promise<{
  success: boolean;
  inference: InferenceResult;
  linesCreated: number;
  linesPreserved: number
}> {
  const inference = await inferBudgetLines(supabase, input);
  const result = await applyBudgetLinesToTransaction(supabase, transactionId, inference.lines, options);

  return {
    success: result.success,
    inference,
    linesCreated: result.linesCreated,
    linesPreserved: result.linesPreserved,
  };
}

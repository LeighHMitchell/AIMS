export type ContributionType = 'financial' | 'in_kind' | 'other';

export type InKindCategory =
  | 'staff'
  | 'facilities'
  | 'land'
  | 'equipment'
  | 'utilities'
  | 'services'
  | 'other';

export const IN_KIND_CATEGORY_LABELS: Record<InKindCategory, string> = {
  staff: 'Staff time',
  facilities: 'Office space / Buildings',
  land: 'Land',
  equipment: 'Equipment',
  utilities: 'Utilities',
  services: 'Services',
  other: 'Other',
};

export type OtherCategory =
  | 'tax_exemption'
  | 'import_duty_waiver'
  | 'fee_waiver'
  | 'policy_concession'
  | 'other';

export const OTHER_CATEGORY_LABELS: Record<OtherCategory, string> = {
  tax_exemption: 'Tax exemption',
  import_duty_waiver: 'Import duty waiver',
  fee_waiver: 'Fee waiver',
  policy_concession: 'Policy concession',
  other: 'Other',
};

interface ContributionBase {
  id: string;
  description?: string;
}

export interface FinancialContribution extends ContributionBase {
  type: 'financial';
  currency?: string;
  amountLocal?: number;
  amountUSD?: number;
  valueDate?: string;
  exchangeRate?: number;
  exchangeRateManual?: boolean;
  distributionMode?: 'lump_sum' | 'annual';
  /** Start of the breakdown period (for Annual mode). Defaults to activity plannedStartDate. */
  breakdownStart?: string;
  /** End of the breakdown period (for Annual mode). Defaults to activity plannedEndDate. */
  breakdownEnd?: string;
  /** ID of the shared CustomYear definition to use for the breakdown (from admin). */
  customYearId?: string;
  /** @deprecated replaced by customYearId; kept for back-compat on older records. */
  fiscalYearStartMonth?: number;
  annual?: Array<AnnualRow>;
  sourceOfFunding?: string;
}

export interface AnnualRow {
  year: number;
  amountLocal: number;
  amountUSD: number;
  /** Per-row value date — defaults to YYYY-01-01 of the row year. */
  valueDate?: string;
  /** Per-row exchange rate (fetched from value date or entered manually). */
  exchangeRate?: number;
  /** If true, the user entered the rate by hand. */
  exchangeRateManual?: boolean;
}

export interface InKindContribution extends ContributionBase {
  type: 'in_kind';
  category: InKindCategory;
  currency?: string;
  estimatedValueLocal?: number;
  estimatedValueUSD?: number;
  period?: 'one_time' | 'annual';
}

export interface OtherContribution extends ContributionBase {
  type: 'other';
  category: OtherCategory;
  currency?: string;
  estimatedValueLocal?: number;
  estimatedValueUSD?: number;
  legalReference?: string;
}

export type Contribution =
  | FinancialContribution
  | InKindContribution
  | OtherContribution;

// ─── Back-compat: synthesize contributions from legacy rgcContribution fields ──

interface LegacyRgc {
  contributions?: Contribution[];
  currency?: string;
  totalAmountLocal?: number;
  totalAmountUSD?: number;
  valueDate?: string;
  exchangeRate?: number;
  exchangeRateManual?: boolean;
  distributionMode?: 'lump_sum' | 'annual';
  annual?: Array<{ year: number; amountLocal: number; amountUSD: number }>;
  sourceOfFunding?: string;
  inKindItems?: Array<{
    id: string;
    type: 'staff' | 'facilities' | 'equipment' | 'services' | 'other';
    description: string;
    estimatedValueLocal?: number;
    estimatedValueUSD?: number;
  }>;
  otherContributions?: Array<{ id: string; description: string }>;
}

export function getContributions(rgc: LegacyRgc | undefined): Contribution[] {
  if (!rgc) return [];
  if (rgc.contributions && Array.isArray(rgc.contributions)) {
    return rgc.contributions;
  }
  // Synthesize from legacy fields
  const list: Contribution[] = [];

  if ((rgc.totalAmountLocal ?? 0) > 0 || rgc.currency) {
    list.push({
      id: 'legacy-financial',
      type: 'financial',
      description: 'Counterpart funding',
      currency: rgc.currency,
      amountLocal: rgc.totalAmountLocal,
      amountUSD: rgc.totalAmountUSD,
      valueDate: rgc.valueDate,
      exchangeRate: rgc.exchangeRate,
      exchangeRateManual: rgc.exchangeRateManual,
      distributionMode: rgc.distributionMode,
      annual: (rgc.annual || []).map(r => ({
        ...r,
        valueDate: (r as AnnualRow).valueDate || `${r.year}-01-01`,
      })),
      sourceOfFunding: rgc.sourceOfFunding,
    });
  }

  (rgc.inKindItems || []).forEach((item) => {
    list.push({
      id: item.id,
      type: 'in_kind',
      category: item.type as InKindCategory,
      description: item.description,
      currency: rgc.currency,
      estimatedValueLocal: item.estimatedValueLocal,
      estimatedValueUSD: item.estimatedValueUSD,
      period: 'one_time',
    });
  });

  (rgc.otherContributions || []).forEach((item) => {
    list.push({
      id: item.id,
      type: 'other',
      category: 'other',
      description: item.description,
    });
  });

  return list;
}

export function contributionAmountUSD(c: Contribution): number | null {
  if (c.type === 'financial') {
    if (c.amountUSD != null) return c.amountUSD;
    if (c.amountLocal && c.exchangeRate) {
      return Math.round(c.amountLocal * c.exchangeRate * 100) / 100;
    }
    return null;
  }
  if (c.estimatedValueUSD != null) return c.estimatedValueUSD;
  return null;
}

export function contributionAmountLocal(c: Contribution): number | null {
  if (c.type === 'financial') return c.amountLocal ?? null;
  return c.estimatedValueLocal ?? null;
}

// ─── Fiscal year helpers ────────────────────────────────────────────────────

export const FY_PRESETS: Array<{ month: number; label: string; examples: string }> = [
  { month: 1, label: 'January (calendar year)', examples: '' },
  { month: 4, label: 'April', examples: 'UK, India, Japan, Myanmar' },
  { month: 7, label: 'July', examples: 'Australia, Canada, NZ' },
  { month: 10, label: 'October', examples: 'US federal' },
];

/** Returns the FY start calendar year for a given ISO date, given a 1–12 start month. */
export function fiscalYearFor(dateISO: string, fyStartMonth: number): number {
  const d = new Date(dateISO);
  if (isNaN(d.getTime())) return new Date().getFullYear();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return m >= fyStartMonth ? y : y - 1;
}

/** Start date of the FY that begins in a given calendar year. */
export function fiscalYearStartDate(fyStartYear: number, fyStartMonth: number): string {
  const mm = String(fyStartMonth).padStart(2, '0');
  return `${fyStartYear}-${mm}-01`;
}

/** Human-readable label for a fiscal year, e.g. "2026" or "FY 2026/27". */
export function fiscalYearLabel(fyStartYear: number, fyStartMonth: number): string {
  if (!fyStartMonth || fyStartMonth === 1) return String(fyStartYear);
  const endYear = fyStartYear + 1;
  const endYY = String(endYear).slice(-2);
  return `FY ${fyStartYear}/${endYY}`;
}

// Organisation-level funding envelope types
// These represent indicative, organisation-perspective funding declarations
// Data is NOT nationally summable and must be clearly marked as indicative

export type YearType = 'calendar' | 'fiscal';

export interface OrganizationFundingEnvelope {
  id?: string;
  organization_id: string;

  // Time period
  period_type: 'single_year' | 'multi_year';
  year_type: YearType;
  year_start: number;
  year_end?: number | null;
  fiscal_year_start_month?: number | null; // 1-12, month when fiscal year starts
  
  // Financial
  amount: number;
  currency: string;
  value_date?: string | null; // Date for exchange rate calculation (ISO date string)
  amount_usd?: number | null;
  exchange_rate_used?: number | null;
  usd_conversion_date?: string | null;
  usd_convertible?: boolean;
  
  // Classification
  flow_direction: 'incoming' | 'outgoing';
  organization_role: 'original_funder' | 'fund_manager' | 'implementer';
  funding_type_flags: FundingTypeFlag[];
  
  // Status
  status: 'actual' | 'current' | 'indicative';
  confidence_level?: 'low' | 'medium' | 'high' | null;
  
  // Notes
  notes?: string | null;
  
  // Audit
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  
  // UI state
  isSaving?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

export type FundingTypeFlag = 
  | 'core_resources' 
  | 'earmarked_pooled' 
  | 'on_budget' 
  | 'off_budget' 
  | 'unknown';

export const FLOW_DIRECTIONS = [
  { value: 'incoming', label: 'Incoming (to this organisation)' },
  { value: 'outgoing', label: 'Outgoing (from this organisation)' }
] as const;

export const ORGANIZATION_ROLES = [
  { 
    value: 'original_funder', 
    label: 'Original Funder', 
    description: 'Source of the funds' 
  },
  { 
    value: 'fund_manager', 
    label: 'Fund Manager / Channel', 
    description: 'Managing or channeling funds' 
  },
  { 
    value: 'implementer', 
    label: 'Implementer', 
    description: 'Implementing activities with the funds' 
  }
] as const;

export const FUNDING_TYPE_FLAGS = [
  { value: 'core_resources', label: 'Core Resources' },
  { value: 'earmarked_pooled', label: 'Earmarked / Pooled Funds' },
  { value: 'on_budget', label: 'On-Budget' },
  { value: 'off_budget', label: 'Off-Budget' },
  { value: 'unknown', label: 'Unknown' }
] as const;

export const ENVELOPE_STATUSES = [
  { 
    value: 'actual', 
    label: 'Actual', 
    description: 'Historical confirmed figures' 
  },
  { 
    value: 'current', 
    label: 'Current', 
    description: 'Current year or active period' 
  },
  { 
    value: 'indicative', 
    label: 'Indicative / Planned', 
    description: 'Future projections' 
  }
] as const;

export const CONFIDENCE_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
] as const;

export const YEAR_TYPES = [
  { value: 'calendar', label: 'Calendar Year', description: 'January to December' },
  { value: 'fiscal', label: 'Fiscal Year', description: 'Organisation-specific financial year' }
] as const;

export const FISCAL_YEAR_START_MONTHS = [
  { value: 1, label: 'January', period: 'Jan - Dec' },
  { value: 2, label: 'February', period: 'Feb - Jan' },
  { value: 3, label: 'March', period: 'Mar - Feb' },
  { value: 4, label: 'April', period: 'Apr - Mar' },
  { value: 5, label: 'May', period: 'May - Apr' },
  { value: 6, label: 'June', period: 'Jun - May' },
  { value: 7, label: 'July', period: 'Jul - Jun' },
  { value: 8, label: 'August', period: 'Aug - Jul' },
  { value: 9, label: 'September', period: 'Sep - Aug' },
  { value: 10, label: 'October', period: 'Oct - Sep' },
  { value: 11, label: 'November', period: 'Nov - Oct' },
  { value: 12, label: 'December', period: 'Dec - Nov' }
] as const;

// IATI-compliant help texts for each field
export const FIELD_HELP_TEXTS = {
  period_type: `Indicates whether this funding declaration covers a single year or spans multiple years. Single-year entries are easier to track and compare year-over-year, while multi-year entries are useful for capturing longer-term commitments or pledges. IATI recommends breaking down multi-year commitments into annual amounts where possible for improved transparency and comparability.`,

  year_type: `Specifies whether the year refers to a calendar year (January-December) or a fiscal/financial year specific to your organisation. Many governments and organisations operate on fiscal years that don't align with calendar years (e.g., April-March for UK, July-June for Australia). Selecting the correct year type ensures accurate temporal alignment of funding data.`,

  year_start: `The starting year for this funding envelope. For single-year entries, this is the only year that applies. For multi-year entries, this marks the beginning of the funding period. Years should be entered as four-digit values (e.g., 2024). This aligns with IATI's requirement for clear temporal boundaries on all financial data.`,

  year_end: `The ending year for multi-year funding envelopes. This field is only applicable when "Multi-Year Range" is selected as the period type. The end year must be equal to or greater than the start year. Multi-year ranges help capture pledges, framework agreements, or strategic funding commitments that span several years.`,

  amount: `The monetary value of the funding envelope in the specified currency. This should represent the total amount for the entire period specified. For IATI compliance, amounts should be as accurate as possible - use actual figures for confirmed funding and estimates for indicative/planned amounts. Do not include amounts that have already been reported elsewhere to avoid double-counting.`,

  currency: `The original currency in which the funding was denominated or committed. IATI uses ISO 4217 three-letter currency codes (e.g., USD, EUR, GBP). Recording the original currency is essential for transparency, as it shows the actual commitment made. The system will automatically calculate USD equivalents for comparison purposes using current exchange rates.`,

  value_date: `The date used for currency conversion to USD. This should typically be the date when the funding was committed, received, or disbursed. The exchange rate on this date will be used to calculate the USD equivalent value. If not specified, the current date or period start date may be used for conversion.`,

  flow_direction: `Indicates whether funds are flowing into or out of your organisation. "Incoming" means funds received from donors, partners, or other sources. "Outgoing" means funds disbursed to implementing partners, recipients, or programmes. This classification is crucial for understanding an organisation's role in the funding chain and avoiding double-counting across organisations.`,

  organization_role: `Describes your organisation's role in relation to these funds. "Original Funder" means your organisation is the ultimate source of the funds. "Fund Manager/Channel" means you receive funds from others and pass them on. "Implementer" means you receive funds to directly implement activities. This helps clarify the funding chain and prevents aggregation errors.`,

  status: `Indicates the certainty level of this funding figure. "Actual" is for confirmed, historical figures that have been realised. "Current" is for the active funding period with high certainty. "Indicative/Planned" is for future projections, pledges, or estimates that may change. IATI requires clear status classification to help data users understand the reliability of figures.`,

  confidence_level: `An optional indicator of how confident you are in the accuracy of this figure. "High" means the figure is based on confirmed documentation or contracts. "Medium" means the figure is a reasonable estimate based on available information. "Low" means the figure is preliminary or subject to significant change. This helps data users assess the reliability of reported amounts.`,

  funding_type_flags: `Additional classifications that describe the nature of the funding. "Core Resources" are unrestricted funds. "Earmarked/Pooled" are funds designated for specific purposes or pooled mechanisms. "On-Budget" means funds that flow through recipient government systems. "Off-Budget" means funds managed outside government systems. Multiple flags can apply to a single entry.`,

  notes: `Free-text field for any additional context, assumptions, caveats, or explanations about this funding entry. Use this to document the source of figures, any conditions attached to the funding, methodology used for estimates, or any other information that would help users understand and correctly interpret this data. Clear documentation improves data quality and usability.`
} as const;

// Helper function to categorize envelope by temporal status
export function getTemporalCategory(
  envelope: OrganizationFundingEnvelope,
  currentYear: number = new Date().getFullYear()
): 'past' | 'current' | 'future' {
  const endYear = envelope.year_end || envelope.year_start;
  
  if (endYear < currentYear) {
    return 'past';
  } else if (envelope.year_start <= currentYear && endYear >= currentYear) {
    return 'current';
  } else {
    return 'future';
  }
}




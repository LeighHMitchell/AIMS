/**
 * Pure label/serialisation helpers for the Government Inputs sections.
 *
 * Extracted from GovernmentInputsSectionEnhanced.tsx so server-side code
 * (e.g. the readiness-checklist export route) can import them without
 * pulling in React / the full component.
 */

// ─── Budget Classification ─────────────────────────────────────────────────

export const BUDGET_DIMENSIONS: Array<{ key: string; label: string; help: string }> = [
  {
    key: 'onPlan',
    label: 'On Plan',
    help: 'Reflected in government strategic planning documents or sector strategies.',
  },
  {
    key: 'onBudget',
    label: 'On Budget',
    help: 'Included in the government budget documentation (national budget book).',
  },
  {
    key: 'onTreasury',
    label: 'On Treasury',
    help: "Funds are disbursed through the government's main Treasury system.",
  },
  {
    key: 'onParliament',
    label: 'On Parliament',
    help: 'Subject to parliamentary scrutiny (appropriated or reported in public financial statements).',
  },
  {
    key: 'onProcurement',
    label: 'On Procurement',
    help: 'Uses national procurement systems and follows national procurement rules.',
  },
  {
    key: 'onAudit',
    label: 'On Accounting / Audit',
    help: "Reported through the government's accounting system and audited by national audit systems.",
  },
];

export function budgetDimensionLabel(key: string): string {
  return BUDGET_DIMENSIONS.find((d) => d.key === key)?.label ?? key;
}

// ─── Risk Assessment ───────────────────────────────────────────────────────

export const RISK_CATEGORIES: Array<{
  id: string;
  label: string;
  questions: Array<{ id: string; text: string }>;
}> = [
  {
    id: 'political',
    label: 'Political Risk',
    questions: [
      { id: 'conflict_affected', text: 'Is the activity located in a conflict-affected or fragile area?' },
      { id: 'politically_sensitive', text: 'Is the activity politically sensitive or subject to government change risk?' },
    ],
  },
  {
    id: 'environmental',
    label: 'Environmental Risk',
    questions: [
      { id: 'environmental_impact', text: 'Does the activity have significant environmental impact?' },
      { id: 'land_acquisition', text: 'Does the activity require land acquisition or change of land use?' },
    ],
  },
  {
    id: 'social',
    label: 'Social Risk',
    questions: [
      { id: 'resettlement', text: 'Does the activity require involuntary resettlement of communities?' },
      { id: 'vulnerable_populations', text: 'Does the activity affect vulnerable or marginalized populations?' },
    ],
  },
  {
    id: 'fiduciary',
    label: 'Fiduciary Risk',
    questions: [
      { id: 'pfm_systems', text: 'Are government public financial management (PFM) systems weak or untested?' },
      { id: 'corruption_risk', text: 'Is there elevated corruption or misuse-of-funds risk in this sector/region?' },
    ],
  },
  {
    id: 'operational',
    label: 'Operational Risk',
    questions: [
      { id: 'remote_access', text: 'Is the activity in a remote or hard-to-reach area with access constraints?' },
      { id: 'capacity_constraints', text: 'Are there significant institutional or human capacity constraints?' },
    ],
  },
];

export function riskScoreLabel(score: number | null | undefined): string {
  if (score == null) return '—';
  if (score === 1) return 'Low';
  if (score === 2) return 'Medium';
  if (score === 3) return 'High';
  return '—';
}

export function riskAvgLabel(avg: number): string {
  if (avg <= 1.5) return 'Low';
  if (avg <= 2.2) return 'Medium';
  return 'High';
}

// ─── Evaluation (Y/N/Unsure) ────────────────────────────────────────────────

export function ynuLabel(value: boolean | 'Yes' | 'No' | 'Unsure' | undefined | null): string {
  if (value === true || value === 'Yes') return 'Yes';
  if (value === false || value === 'No') return 'No';
  if (value === 'Unsure') return 'Unsure';
  return '—';
}

/**
 * Framework presets for Program Logic tier vocabularies.
 *
 * Every agency uses the same underlying results chain and differs only in how many
 * tiers it cuts the outcome band into and what it names each tier. Picking a preset
 * SEEDS logic_tiers rows; tiers remain fully editable afterward. `custom` seeds no
 * tiers — the user defines their own.
 *
 * level_order runs bottom (0, most immediate: inputs/activities) to top
 * (impact/goal). `attribution_boundary = true` marks the tier the implementer is
 * held accountable to DELIVER — edges crossing above it default to 'contribution'.
 *
 * iati_result_type is used only to map a tier's linked indicators for IATI export;
 * the logic graph itself is never exported.
 */

export type FrameworkPreset =
  | 'dfat'
  | 'usaid'
  | 'world_bank'
  | 'eu'
  | 'dac_default'
  | 'gac'
  | 'custom';

export type IatiResultType = 'output' | 'outcome' | 'impact' | 'none';

export interface PresetTier {
  short_code: string;
  name: string;
  level_order: number;
  iati_result_type: IatiResultType;
  attribution_boundary: boolean;
}

export interface PresetDefinition {
  key: FrameworkPreset;
  label: string;
  description: string;
  tiers: PresetTier[];
}

// Helper to keep the tier tables readable: [code, name, iati, boundary]
type Row = [string, string, IatiResultType, boolean];
const tiers = (rows: Row[]): PresetTier[] =>
  rows.map(([short_code, name, iati_result_type, attribution_boundary], i) => ({
    short_code,
    name,
    level_order: i,
    iati_result_type,
    attribution_boundary,
  }));

export const FRAMEWORK_PRESETS: Record<FrameworkPreset, PresetDefinition> = {
  dac_default: {
    key: 'dac_default',
    label: 'OECD DAC (neutral default)',
    description:
      'The neutral DAC results chain: inputs → activities → outputs → outcomes → impact. A sensible default when no agency framework applies.',
    tiers: tiers([
      ['INPUT', 'Inputs', 'none', false],
      ['ACT', 'Activities', 'none', false],
      ['OUT', 'Outputs', 'output', false],
      ['OC', 'Outcomes', 'outcome', true],
      ['IMP', 'Impact', 'impact', false],
    ]),
  },
  dfat: {
    key: 'dfat',
    label: 'DFAT (Australia)',
    description:
      'Australian DFAT: activities → outputs → intermediate outcomes → end-of-program outcomes (the accountability ceiling) → objective → goal.',
    tiers: tiers([
      ['ACT', 'Activities / Inputs', 'none', false],
      ['OUT', 'Outputs', 'output', false],
      ['IO', 'Intermediate Outcome', 'outcome', false],
      ['EOPO', 'End-of-Program Outcome', 'outcome', true],
      ['OBJ', 'Objective', 'none', false],
      ['GOAL', 'Goal', 'impact', false],
    ]),
  },
  usaid: {
    key: 'usaid',
    label: 'USAID (CDCS)',
    description:
      'USAID CDCS: outputs → sub-intermediate results → intermediate results → development objective (the accountability ceiling) → CDCS goal.',
    tiers: tiers([
      ['OUT', 'Outputs', 'output', false],
      ['SUBIR', 'Sub-Intermediate Result', 'outcome', false],
      ['IR', 'Intermediate Result', 'outcome', false],
      ['DO', 'Development Objective', 'outcome', true],
      ['GOAL', 'CDCS Goal', 'impact', false],
    ]),
  },
  world_bank: {
    key: 'world_bank',
    label: 'World Bank (PDO-centric)',
    description:
      'World Bank: activities/components → outputs → intermediate outcomes → Project Development Objective (the accountability ceiling) → higher-level objectives. PDO indicators attach to the PDO tier; intermediate-results indicators to the intermediate-outcome tier.',
    tiers: tiers([
      ['ACT', 'Activities / Components', 'none', false],
      ['OUT', 'Outputs', 'output', false],
      ['IOC', 'Intermediate Outcome', 'outcome', false],
      ['PDO', 'Project Development Objective', 'outcome', true],
      ['HLO', 'Higher-Level Objectives / Impact', 'impact', false],
    ]),
  },
  eu: {
    key: 'eu',
    label: 'EU (overall / specific objectives)',
    description:
      'EU intervention logic: activities → outputs → outcome (specific objective, the accountability ceiling) → impact (overall objective).',
    tiers: tiers([
      ['ACT', 'Activities', 'none', false],
      ['OUT', 'Outputs', 'output', false],
      ['SO', 'Outcome (Specific Objective)', 'outcome', true],
      ['OO', 'Impact (Overall Objective)', 'impact', false],
    ]),
  },
  gac: {
    key: 'gac',
    label: 'GAC (Canada)',
    description:
      'Global Affairs Canada: inputs → activities → outputs → immediate outcomes → intermediate outcomes (the accountability ceiling) → ultimate outcome.',
    tiers: tiers([
      ['INPUT', 'Inputs', 'none', false],
      ['ACT', 'Activities', 'none', false],
      ['OUT', 'Outputs', 'output', false],
      ['IOC', 'Immediate Outcome', 'outcome', false],
      ['INT', 'Intermediate Outcome', 'outcome', true],
      ['UOC', 'Ultimate Outcome', 'impact', false],
    ]),
  },
  custom: {
    key: 'custom',
    label: 'Custom',
    description:
      'Define your own ordered, named tiers. No tiers are seeded, so add them yourself.',
    tiers: [],
  },
};

export const FRAMEWORK_PRESET_KEYS = Object.keys(
  FRAMEWORK_PRESETS
) as FrameworkPreset[];

export function getPreset(key: string): PresetDefinition | null {
  return (FRAMEWORK_PRESETS as Record<string, PresetDefinition>)[key] ?? null;
}

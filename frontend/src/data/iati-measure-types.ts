/**
 * IATI Standard Indicator Measure Types (v2.03)
 * https://iatistandard.org/en/iati-standard/203/codelists/indicatormeasure/
 */

export interface MeasureType {
  code: string;
  name: string;
  description: string;
}

export const IATI_MEASURE_TYPES: MeasureType[] = [
  {
    code: "1",
    name: "Unit",
    description: "The indicator is measured in units."
  },
  {
    code: "2",
    name: "Percentage",
    description: "The indicator is measured in percentages"
  },
  {
    code: "3",
    name: "Nominal",
    description: "The indicator is measured as a quantitative nominal scale."
  },
  {
    code: "4",
    name: "Ordinal",
    description: "The indicator is measured as a quantitative ordinal scale."
  },
  {
    code: "5",
    name: "Qualitative",
    description: "The indicator is qualitative."
  }
];

// Helper to get measure type by code
export function getMeasureTypeByCode(code: string): MeasureType | undefined {
  return IATI_MEASURE_TYPES.find(type => type.code === code);
}

// Valid measure type codes
export const VALID_MEASURE_TYPE_CODES = ["1", "2", "3", "4", "5"] as const;
export type MeasureTypeCode = typeof VALID_MEASURE_TYPE_CODES[number];

// Map internal measure type strings to IATI codes
export const MEASURE_TYPE_TO_CODE: Record<string, string> = {
  'unit': '1',
  'percentage': '2',
  'nominal': '3',
  'ordinal': '4',
  'qualitative': '5'
};

// Map IATI codes to internal measure type strings
export const CODE_TO_MEASURE_TYPE: Record<string, string> = {
  '1': 'unit',
  '2': 'percentage',
  '3': 'nominal',
  '4': 'ordinal',
  '5': 'qualitative'
};


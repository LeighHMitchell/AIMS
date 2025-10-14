// IATI Indicator Measure Type Code List
// Based on IATI Standard v2.03

export interface MeasureTypeOption {
  code: string;
  name: string;
  description: string;
}

export const INDICATOR_MEASURE_TYPES: MeasureTypeOption[] = [
  {
    code: '1',
    name: 'Unit',
    description: 'The indicator is measured in units (e.g., number of people, number of schools)'
  },
  {
    code: '2',
    name: 'Percentage',
    description: 'The indicator is measured as a percentage'
  },
  {
    code: '3',
    name: 'Nominal',
    description: 'The indicator is a nominal (qualitative) measure'
  },
  {
    code: '4',
    name: 'Ordinal',
    description: 'The indicator is an ordinal (ranked) measure'
  },
  {
    code: '5',
    name: 'Qualitative',
    description: 'The indicator is a qualitative measure'
  }
];

// Helper to get measure type by code
export const getMeasureTypeByCode = (code: string): MeasureTypeOption | undefined => {
  return INDICATOR_MEASURE_TYPES.find(type => type.code === code);
};

// Helper to get measure type by name
export const getMeasureTypeByName = (name: string): MeasureTypeOption | undefined => {
  return INDICATOR_MEASURE_TYPES.find(type => type.name.toLowerCase() === name.toLowerCase());
};

// Map IATI codes to our internal MeasureType
export const mapIatiMeasureCode = (code: string): 'unit' | 'percentage' | 'currency' | 'qualitative' => {
  switch (code) {
    case '1':
      return 'unit';
    case '2':
      return 'percentage';
    case '3':
    case '4':
    case '5':
      return 'qualitative';
    default:
      return 'unit';
  }
};


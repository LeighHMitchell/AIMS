// IATI Result Type Code List
// Based on IATI Standard v2.03

export interface ResultTypeOption {
  code: string;
  name: string;
  description: string;
}

export const RESULT_TYPES: ResultTypeOption[] = [
  {
    code: '1',
    name: 'Output',
    description: 'Results from activities and interventions in terms of goods and services delivered'
  },
  {
    code: '2',
    name: 'Outcome',
    description: 'Changes in institutional performance or behaviour'
  },
  {
    code: '3',
    name: 'Impact',
    description: 'Long-term changes in conditions or status'
  },
  {
    code: '9',
    name: 'Other',
    description: 'Another type of result, not specified above'
  }
];

// Helper to get result type by code
export const getResultTypeByCode = (code: string): ResultTypeOption | undefined => {
  return RESULT_TYPES.find(type => type.code === code);
};

// Helper to get result type by name
export const getResultTypeByName = (name: string): ResultTypeOption | undefined => {
  return RESULT_TYPES.find(type => type.name.toLowerCase() === name.toLowerCase());
};


// IATI Indicator Reference Vocabulary Code List
// Based on IATI Standard v2.03

export interface IndicatorVocabularyOption {
  code: string;
  name: string;
  url?: string;
}

export const INDICATOR_VOCABULARIES: IndicatorVocabularyOption[] = [
  {
    code: '1',
    name: 'WHO Registry',
    url: 'http://apps.who.int/gho/data/'
  },
  {
    code: '2',
    name: 'World Bank - World Development Indicators',
    url: 'http://data.worldbank.org/indicator'
  },
  {
    code: '3',
    name: 'UNAIDS',
    url: 'http://www.unaids.org/'
  },
  {
    code: '4',
    name: 'Index Mundi',
    url: 'http://www.indexmundi.com/'
  },
  {
    code: '5',
    name: 'Sphere Handbook',
    url: 'http://www.sphereproject.org/handbook/'
  },
  {
    code: '6',
    name: 'United Nations Millennium Development Goals Indicators',
    url: 'http://mdgs.un.org/unsd/mdg/Host.aspx?Content=Indicators/OfficialList.htm'
  },
  {
    code: '7',
    name: 'UN Sustainable Development Goals (SDG)',
    url: 'https://unstats.un.org/sdgs/indicators/indicators-list/'
  },
  {
    code: '8',
    name: 'United Nations Indicators for Policy Management Database',
    url: 'http://www.un.org/popin/popis/ipm/ipmintro.htm'
  },
  {
    code: '9',
    name: 'GPEDC Indicators',
    url: 'https://effectivecooperation.org/'
  },
  {
    code: '10',
    name: 'IRIS (Impact Reporting & Investment Standards)',
    url: 'https://iris.thegiin.org/'
  },
  {
    code: '99',
    name: 'Reporting Organisation (Custom Indicators)',
    url: undefined
  }
];

// Helper to get vocabulary by code
export const getVocabularyByCode = (code: string): IndicatorVocabularyOption | undefined => {
  return INDICATOR_VOCABULARIES.find(vocab => vocab.code === code);
};

// Helper to get vocabulary by name
export const getVocabularyByName = (name: string): IndicatorVocabularyOption | undefined => {
  return INDICATOR_VOCABULARIES.find(vocab => 
    vocab.name.toLowerCase().includes(name.toLowerCase())
  );
};


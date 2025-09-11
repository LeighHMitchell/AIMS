// IATI Region Codelist - Version 2.03
// Source: https://iatistandard.org/en/iati-standard/203/codelists/region/

export interface IATIRegion {
  code: string;
  name: string;
  vocabulary: string;
  withdrawn?: boolean;
}

export const IATI_REGIONS: IATIRegion[] = [
  { code: "88", name: "States Ex-Yugoslavia unspecified", vocabulary: "DAC" },
  { code: "89", name: "Europe, regional", vocabulary: "DAC" },
  { code: "189", name: "North of Sahara, regional", vocabulary: "DAC" },
  { code: "289", name: "South of Sahara, regional", vocabulary: "DAC" },
  { code: "298", name: "Africa, regional", vocabulary: "DAC" },
  { code: "380", name: "West Indies, regional", vocabulary: "DAC", withdrawn: true },
  { code: "389", name: "Caribbean & Central America, regional", vocabulary: "DAC" },
  { code: "489", name: "South America, regional", vocabulary: "DAC" },
  { code: "498", name: "America, regional", vocabulary: "DAC" },
  { code: "589", name: "Middle East, regional", vocabulary: "DAC" },
  { code: "619", name: "Central Asia, regional", vocabulary: "DAC" },
  { code: "679", name: "South Asia, regional", vocabulary: "DAC" },
  { code: "689", name: "South & Central Asia, regional", vocabulary: "DAC" },
  { code: "789", name: "Far East Asia, regional", vocabulary: "DAC" },
  { code: "798", name: "Asia, regional", vocabulary: "DAC" },
  { code: "889", name: "Oceania, regional", vocabulary: "DAC" },
  { code: "998", name: "Developing countries, unspecified", vocabulary: "DAC" },
  { code: "1027", name: "Eastern Africa, regional", vocabulary: "DAC" },
  { code: "1028", name: "Middle Africa, regional", vocabulary: "DAC" },
  { code: "1029", name: "Southern Africa, regional", vocabulary: "DAC" },
  { code: "1030", name: "Western Africa, regional", vocabulary: "DAC" },
  { code: "1031", name: "Caribbean, regional", vocabulary: "DAC" },
  { code: "1032", name: "Central America, regional", vocabulary: "DAC" },
  { code: "1033", name: "Melanesia, regional", vocabulary: "DAC" },
  { code: "1034", name: "Micronesia, regional", vocabulary: "DAC" },
  { code: "1035", name: "Polynesia, regional", vocabulary: "DAC" }
];

// Helper function to get regions by search term
export const searchRegions = (searchTerm: string): IATIRegion[] => {
  if (!searchTerm.trim()) return IATI_REGIONS;
  
  const term = searchTerm.toLowerCase();
  return IATI_REGIONS.filter(region => 
    region.name.toLowerCase().includes(term) || 
    region.code.toLowerCase().includes(term)
  );
};

// Helper function to get region by code
export const getRegionByCode = (code: string): IATIRegion | undefined => {
  return IATI_REGIONS.find(region => region.code === code);
};

// Helper function to get regions by vocabulary
export const getRegionsByVocabulary = (vocabulary: string): IATIRegion[] => {
  return IATI_REGIONS.filter(region => region.vocabulary === vocabulary);
};


import { DAC5Sector } from '@/types/sector';

// Sample DAC codes - in production, this would be loaded from an API or database
export const DAC_CODES: DAC5Sector[] = [
  // Education - DAC 3: 110
  {
    dac5_code: "11110",
    dac5_name: "Education policy and administrative management",
    dac3_code: "111",
    dac3_name: "Education, level unspecified",
    dac3_parent_code: "110",
    dac3_parent_name: "Education"
  },
  {
    dac5_code: "11120",
    dac5_name: "Education facilities and training",
    dac3_code: "111",
    dac3_name: "Education, level unspecified",
    dac3_parent_code: "110",
    dac3_parent_name: "Education"
  },
  {
    dac5_code: "11130",
    dac5_name: "Teacher training",
    dac3_code: "111",
    dac3_name: "Education, level unspecified",
    dac3_parent_code: "110",
    dac3_parent_name: "Education"
  },
  {
    dac5_code: "11182",
    dac5_name: "Educational research",
    dac3_code: "111",
    dac3_name: "Education, level unspecified",
    dac3_parent_code: "110",
    dac3_parent_name: "Education"
  },
  // Basic Education - DAC 3: 112
  {
    dac5_code: "11220",
    dac5_name: "Primary education",
    dac3_code: "112",
    dac3_name: "Basic Education",
    dac3_parent_code: "110",
    dac3_parent_name: "Education"
  },
  {
    dac5_code: "11230",
    dac5_name: "Basic life skills for youth and adults",
    dac3_code: "112",
    dac3_name: "Basic Education",
    dac3_parent_code: "110",
    dac3_parent_name: "Education"
  },
  {
    dac5_code: "11240",
    dac5_name: "Early childhood education",
    dac3_code: "112",
    dac3_name: "Basic Education",
    dac3_parent_code: "110",
    dac3_parent_name: "Education"
  },
  // Secondary Education - DAC 3: 113
  {
    dac5_code: "11320",
    dac5_name: "Secondary education",
    dac3_code: "113",
    dac3_name: "Secondary Education",
    dac3_parent_code: "110",
    dac3_parent_name: "Education"
  },
  {
    dac5_code: "11330",
    dac5_name: "Vocational training",
    dac3_code: "113",
    dac3_name: "Secondary Education",
    dac3_parent_code: "110",
    dac3_parent_name: "Education"
  },
  // Health - DAC 3: 120
  {
    dac5_code: "12110",
    dac5_name: "Health policy and administrative management",
    dac3_code: "121",
    dac3_name: "Health, general",
    dac3_parent_code: "120",
    dac3_parent_name: "Health"
  },
  {
    dac5_code: "12181",
    dac5_name: "Medical education/training",
    dac3_code: "121",
    dac3_name: "Health, general",
    dac3_parent_code: "120",
    dac3_parent_name: "Health"
  },
  {
    dac5_code: "12182",
    dac5_name: "Medical research",
    dac3_code: "121",
    dac3_name: "Health, general",
    dac3_parent_code: "120",
    dac3_parent_name: "Health"
  },
  {
    dac5_code: "12191",
    dac5_name: "Medical services",
    dac3_code: "121",
    dac3_name: "Health, general",
    dac3_parent_code: "120",
    dac3_parent_name: "Health"
  },
  // Basic Health - DAC 3: 122
  {
    dac5_code: "12220",
    dac5_name: "Basic health care",
    dac3_code: "122",
    dac3_name: "Basic Health",
    dac3_parent_code: "120",
    dac3_parent_name: "Health"
  },
  {
    dac5_code: "12230",
    dac5_name: "Basic health infrastructure",
    dac3_code: "122",
    dac3_name: "Basic Health",
    dac3_parent_code: "120",
    dac3_parent_name: "Health"
  },
  {
    dac5_code: "12240",
    dac5_name: "Basic nutrition",
    dac3_code: "122",
    dac3_name: "Basic Health",
    dac3_parent_code: "120",
    dac3_parent_name: "Health"
  },
  {
    dac5_code: "12250",
    dac5_name: "Infectious disease control",
    dac3_code: "122",
    dac3_name: "Basic Health",
    dac3_parent_code: "120",
    dac3_parent_name: "Health"
  },
  {
    dac5_code: "12261",
    dac5_name: "Health education",
    dac3_code: "122",
    dac3_name: "Basic Health",
    dac3_parent_code: "120",
    dac3_parent_name: "Health"
  },
  {
    dac5_code: "12262",
    dac5_name: "Malaria control",
    dac3_code: "122",
    dac3_name: "Basic Health",
    dac3_parent_code: "120",
    dac3_parent_name: "Health"
  },
  {
    dac5_code: "12263",
    dac5_name: "Tuberculosis control",
    dac3_code: "122",
    dac3_name: "Basic Health",
    dac3_parent_code: "120",
    dac3_parent_name: "Health"
  },
  {
    dac5_code: "12281",
    dac5_name: "Health personnel development",
    dac3_code: "122",
    dac3_name: "Basic Health",
    dac3_parent_code: "120",
    dac3_parent_name: "Health"
  },
  // Water and Sanitation - DAC 3: 140
  {
    dac5_code: "14010",
    dac5_name: "Water sector policy and administrative management",
    dac3_code: "140",
    dac3_name: "Water Supply & Sanitation",
    dac3_parent_code: "140",
    dac3_parent_name: "Water Supply & Sanitation"
  },
  {
    dac5_code: "14015",
    dac5_name: "Water resources conservation",
    dac3_code: "140",
    dac3_name: "Water Supply & Sanitation",
    dac3_parent_code: "140",
    dac3_parent_name: "Water Supply & Sanitation"
  },
  {
    dac5_code: "14020",
    dac5_name: "Water supply and sanitation - large systems",
    dac3_code: "140",
    dac3_name: "Water Supply & Sanitation",
    dac3_parent_code: "140",
    dac3_parent_name: "Water Supply & Sanitation"
  },
  {
    dac5_code: "14021",
    dac5_name: "Water supply - large systems",
    dac3_code: "140",
    dac3_name: "Water Supply & Sanitation",
    dac3_parent_code: "140",
    dac3_parent_name: "Water Supply & Sanitation"
  },
  {
    dac5_code: "14022",
    dac5_name: "Sanitation - large systems",
    dac3_code: "140",
    dac3_name: "Water Supply & Sanitation",
    dac3_parent_code: "140",
    dac3_parent_name: "Water Supply & Sanitation"
  },
  {
    dac5_code: "14030",
    dac5_name: "Basic drinking water supply and basic sanitation",
    dac3_code: "140",
    dac3_name: "Water Supply & Sanitation",
    dac3_parent_code: "140",
    dac3_parent_name: "Water Supply & Sanitation"
  },
  {
    dac5_code: "14031",
    dac5_name: "Basic drinking water supply",
    dac3_code: "140",
    dac3_name: "Water Supply & Sanitation",
    dac3_parent_code: "140",
    dac3_parent_name: "Water Supply & Sanitation"
  },
  {
    dac5_code: "14032",
    dac5_name: "Basic sanitation",
    dac3_code: "140",
    dac3_name: "Water Supply & Sanitation",
    dac3_parent_code: "140",
    dac3_parent_name: "Water Supply & Sanitation"
  },
  // Government & Civil Society - DAC 3: 151
  {
    dac5_code: "15110",
    dac5_name: "Public sector policy and administrative management",
    dac3_code: "151",
    dac3_name: "Government & Civil Society-general",
    dac3_parent_code: "150",
    dac3_parent_name: "Government & Civil Society"
  },
  {
    dac5_code: "15111",
    dac5_name: "Public finance management",
    dac3_code: "151",
    dac3_name: "Government & Civil Society-general",
    dac3_parent_code: "150",
    dac3_parent_name: "Government & Civil Society"
  },
  {
    dac5_code: "15112",
    dac5_name: "Decentralisation and support to subnational government",
    dac3_code: "151",
    dac3_name: "Government & Civil Society-general",
    dac3_parent_code: "150",
    dac3_parent_name: "Government & Civil Society"
  },
  {
    dac5_code: "15113",
    dac5_name: "Anti-corruption organisations and institutions",
    dac3_code: "151",
    dac3_name: "Government & Civil Society-general",
    dac3_parent_code: "150",
    dac3_parent_name: "Government & Civil Society"
  },
  {
    dac5_code: "15114",
    dac5_name: "Domestic revenue mobilisation",
    dac3_code: "151",
    dac3_name: "Government & Civil Society-general",
    dac3_parent_code: "150",
    dac3_parent_name: "Government & Civil Society"
  },
  {
    dac5_code: "15130",
    dac5_name: "Legal and judicial development",
    dac3_code: "151",
    dac3_name: "Government & Civil Society-general",
    dac3_parent_code: "150",
    dac3_parent_name: "Government & Civil Society"
  },
  {
    dac5_code: "15150",
    dac5_name: "Democratic participation and civil society",
    dac3_code: "151",
    dac3_name: "Government & Civil Society-general",
    dac3_parent_code: "150",
    dac3_parent_name: "Government & Civil Society"
  },
  {
    dac5_code: "15151",
    dac5_name: "Elections",
    dac3_code: "151",
    dac3_name: "Government & Civil Society-general",
    dac3_parent_code: "150",
    dac3_parent_name: "Government & Civil Society"
  },
  {
    dac5_code: "15152",
    dac5_name: "Legislatures and political parties",
    dac3_code: "151",
    dac3_name: "Government & Civil Society-general",
    dac3_parent_code: "150",
    dac3_parent_name: "Government & Civil Society"
  },
  {
    dac5_code: "15153",
    dac5_name: "Media and free flow of information",
    dac3_code: "151",
    dac3_name: "Government & Civil Society-general",
    dac3_parent_code: "150",
    dac3_parent_name: "Government & Civil Society"
  },
  {
    dac5_code: "15160",
    dac5_name: "Human rights",
    dac3_code: "151",
    dac3_name: "Government & Civil Society-general",
    dac3_parent_code: "150",
    dac3_parent_name: "Government & Civil Society"
  },
  {
    dac5_code: "15170",
    dac5_name: "Women's equality organisations and institutions",
    dac3_code: "151",
    dac3_name: "Government & Civil Society-general",
    dac3_parent_code: "150",
    dac3_parent_name: "Government & Civil Society"
  },
  // Agriculture - DAC 3: 311
  {
    dac5_code: "31110",
    dac5_name: "Agricultural policy and administrative management",
    dac3_code: "311",
    dac3_name: "Agriculture",
    dac3_parent_code: "310",
    dac3_parent_name: "Agriculture, Forestry, Fishing"
  },
  {
    dac5_code: "31120",
    dac5_name: "Agricultural development",
    dac3_code: "311",
    dac3_name: "Agriculture",
    dac3_parent_code: "310",
    dac3_parent_name: "Agriculture, Forestry, Fishing"
  },
  {
    dac5_code: "31130",
    dac5_name: "Agricultural land resources",
    dac3_code: "311",
    dac3_name: "Agriculture",
    dac3_parent_code: "310",
    dac3_parent_name: "Agriculture, Forestry, Fishing"
  },
  {
    dac5_code: "31140",
    dac5_name: "Agricultural water resources",
    dac3_code: "311",
    dac3_name: "Agriculture",
    dac3_parent_code: "310",
    dac3_parent_name: "Agriculture, Forestry, Fishing"
  },
  {
    dac5_code: "31150",
    dac5_name: "Agricultural inputs",
    dac3_code: "311",
    dac3_name: "Agriculture",
    dac3_parent_code: "310",
    dac3_parent_name: "Agriculture, Forestry, Fishing"
  },
  {
    dac5_code: "31161",
    dac5_name: "Food crop production",
    dac3_code: "311",
    dac3_name: "Agriculture",
    dac3_parent_code: "310",
    dac3_parent_name: "Agriculture, Forestry, Fishing"
  },
  {
    dac5_code: "31162",
    dac5_name: "Industrial crops/export crops",
    dac3_code: "311",
    dac3_name: "Agriculture",
    dac3_parent_code: "310",
    dac3_parent_name: "Agriculture, Forestry, Fishing"
  },
  {
    dac5_code: "31163",
    dac5_name: "Livestock",
    dac3_code: "311",
    dac3_name: "Agriculture",
    dac3_parent_code: "310",
    dac3_parent_name: "Agriculture, Forestry, Fishing"
  },
  {
    dac5_code: "31164",
    dac5_name: "Agrarian reform",
    dac3_code: "311",
    dac3_name: "Agriculture",
    dac3_parent_code: "310",
    dac3_parent_name: "Agriculture, Forestry, Fishing"
  },
  {
    dac5_code: "31165",
    dac5_name: "Agricultural alternative development",
    dac3_code: "311",
    dac3_name: "Agriculture",
    dac3_parent_code: "310",
    dac3_parent_name: "Agriculture, Forestry, Fishing"
  },
  {
    dac5_code: "31166",
    dac5_name: "Agricultural extension",
    dac3_code: "311",
    dac3_name: "Agriculture",
    dac3_parent_code: "310",
    dac3_parent_name: "Agriculture, Forestry, Fishing"
  },
  {
    dac5_code: "31181",
    dac5_name: "Agricultural education/training",
    dac3_code: "311",
    dac3_name: "Agriculture",
    dac3_parent_code: "310",
    dac3_parent_name: "Agriculture, Forestry, Fishing"
  },
  {
    dac5_code: "31182",
    dac5_name: "Agricultural research",
    dac3_code: "311",
    dac3_name: "Agriculture",
    dac3_parent_code: "310",
    dac3_parent_name: "Agriculture, Forestry, Fishing"
  },
  {
    dac5_code: "31191",
    dac5_name: "Agricultural services",
    dac3_code: "311",
    dac3_name: "Agriculture",
    dac3_parent_code: "310",
    dac3_parent_name: "Agriculture, Forestry, Fishing"
  },
  {
    dac5_code: "31192",
    dac5_name: "Plant and post-harvest protection and pest control",
    dac3_code: "311",
    dac3_name: "Agriculture",
    dac3_parent_code: "310",
    dac3_parent_name: "Agriculture, Forestry, Fishing"
  },
  {
    dac5_code: "31193",
    dac5_name: "Agricultural financial services",
    dac3_code: "311",
    dac3_name: "Agriculture",
    dac3_parent_code: "310",
    dac3_parent_name: "Agriculture, Forestry, Fishing"
  },
  {
    dac5_code: "31194",
    dac5_name: "Agricultural co-operatives",
    dac3_code: "311",
    dac3_name: "Agriculture",
    dac3_parent_code: "310",
    dac3_parent_name: "Agriculture, Forestry, Fishing"
  },
  {
    dac5_code: "31195",
    dac5_name: "Livestock/veterinary services",
    dac3_code: "311",
    dac3_name: "Agriculture",
    dac3_parent_code: "310",
    dac3_parent_name: "Agriculture, Forestry, Fishing"
  }
];

// Helper function to search DAC codes
export function searchDACCodes(query: string): DAC5Sector[] {
  const lowerQuery = query.toLowerCase();
  
  return DAC_CODES.filter(code => 
    code.dac5_code.includes(lowerQuery) ||
    code.dac5_name.toLowerCase().includes(lowerQuery) ||
    code.dac3_code.includes(lowerQuery) ||
    code.dac3_name.toLowerCase().includes(lowerQuery) ||
    code.dac3_parent_name?.toLowerCase().includes(lowerQuery) ||
    code.keywords?.some(keyword => keyword.toLowerCase().includes(lowerQuery))
  );
}

// Get unique DAC3 codes for grouping
export function getUniqueDAC3Codes(): { code: string; name: string; parentName?: string }[] {
  const seen = new Set<string>();
  const uniqueCodes: { code: string; name: string; parentName?: string }[] = [];
  
  DAC_CODES.forEach(item => {
    if (!seen.has(item.dac3_code)) {
      seen.add(item.dac3_code);
      uniqueCodes.push({
        code: item.dac3_code,
        name: item.dac3_name,
        parentName: item.dac3_parent_name
      });
    }
  });
  
  return uniqueCodes.sort((a, b) => a.code.localeCompare(b.code));
}

// Get DAC5 codes by DAC3 code
export function getDAC5ByDAC3(dac3Code: string): DAC5Sector[] {
  return DAC_CODES.filter(code => code.dac3_code === dac3Code);
} 
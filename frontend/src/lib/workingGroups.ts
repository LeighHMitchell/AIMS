// Technical Working Groups (TWG) / Sector Working Groups (SWG) definitions
// These are stored as tags with vocabulary="99" in IATI standard

export interface WorkingGroup {
  id?: string;
  code: string;
  label: string;
  sector?: string; // Optional IATI sector code
  sector_code?: string; // Alternative naming for API compatibility
  description?: string;
  isActive: boolean;
  is_active?: boolean; // Alternative naming for API compatibility
}

// Generate a deterministic ID from code
function generateId(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

// Predefined list of Technical Working Groups
export const WORKING_GROUPS: WorkingGroup[] = [
  // Health Sector
  {
    id: generateId("TWG-Health"),
    code: "TWG-Health",
    label: "Health Technical Working Group",
    sector: "12220", // Basic health care
    sector_code: "12220",
    description: "Coordinates health sector activities and policies",
    isActive: true,
    is_active: true
  },
  {
    id: generateId("SWG-HealthFinancing"),
    code: "SWG-HealthFinancing",
    label: "Health Financing Sub-Working Group",
    sector: "12220",
    sector_code: "12220",
    description: "Focuses on sustainable health financing mechanisms",
    isActive: true,
    is_active: true
  },
  {
    id: generateId("SWG-ReproductiveHealth"),
    code: "SWG-ReproductiveHealth",
    label: "Reproductive Health Sub-Working Group",
    sector: "13020",
    sector_code: "13020",
    description: "Coordinates reproductive health programs",
    isActive: true,
    is_active: true
  },
  
  // Education Sector
  {
    id: generateId("TWG-Education"),
    code: "TWG-Education",
    label: "Education Technical Working Group",
    sector: "11110",
    sector_code: "11110",
    description: "Oversees education sector development",
    isActive: true,
    is_active: true
  },
  {
    id: generateId("SWG-BasicEducation"),
    code: "SWG-BasicEducation",
    label: "Basic Education Sub-Working Group",
    sector: "11220",
    sector_code: "11220",
    description: "Focuses on primary and secondary education",
    isActive: true,
    is_active: true
  },
  {
    id: generateId("SWG-TechVocational"),
    code: "SWG-TechVocational",
    label: "Technical & Vocational Education Sub-Working Group",
    sector: "11330",
    sector_code: "11330",
    description: "Coordinates TVET programs",
    isActive: true,
    is_active: true
  },
  
  // Gender
  {
    id: generateId("TWG-Gender"),
    code: "TWG-Gender",
    label: "Gender Equality Technical Working Group",
    sector: "15170",
    sector_code: "15170",
    description: "Mainstreams gender across all sectors",
    isActive: true,
    is_active: true
  },
  
  // Agriculture & Rural Development
  {
    id: generateId("TWG-Agriculture"),
    code: "TWG-Agriculture",
    label: "Agriculture & Rural Development TWG",
    sector: "31110",
    sector_code: "31110",
    description: "Coordinates agricultural development initiatives",
    isActive: true,
    is_active: true
  },
  {
    id: generateId("SWG-FoodSecurity"),
    code: "SWG-FoodSecurity",
    label: "Food Security Sub-Working Group",
    sector: "31120",
    sector_code: "31120",
    description: "Addresses food security and nutrition",
    isActive: true,
    is_active: true
  },
  
  // Water & Sanitation
  {
    id: generateId("TWG-WASH"),
    code: "TWG-WASH",
    label: "Water, Sanitation & Hygiene TWG",
    sector: "14010",
    sector_code: "14010",
    description: "Coordinates WASH sector activities",
    isActive: true,
    is_active: true
  },
  
  // Economic Development
  {
    id: generateId("TWG-PrivateSector"),
    code: "TWG-PrivateSector",
    label: "Private Sector Development TWG",
    sector: "25010",
    sector_code: "25010",
    description: "Promotes private sector growth",
    isActive: true,
    is_active: true
  },
  {
    id: generateId("TWG-Trade"),
    code: "TWG-Trade",
    label: "Trade & Investment TWG",
    sector: "33110",
    sector_code: "33110",
    description: "Facilitates trade and investment",
    isActive: true,
    is_active: true
  },
  
  // Governance
  {
    id: generateId("TWG-Governance"),
    code: "TWG-Governance",
    label: "Good Governance TWG",
    sector: "15110",
    sector_code: "15110",
    description: "Strengthens governance and public administration",
    isActive: true,
    is_active: true
  },
  {
    id: generateId("SWG-Decentralization"),
    code: "SWG-Decentralization",
    label: "Decentralization Sub-Working Group",
    sector: "15112",
    sector_code: "15112",
    description: "Supports local governance",
    isActive: true,
    is_active: true
  },
  
  // Infrastructure
  {
    id: generateId("TWG-Infrastructure"),
    code: "TWG-Infrastructure",
    label: "Infrastructure Development TWG",
    sector: "21010",
    sector_code: "21010",
    description: "Coordinates infrastructure development",
    isActive: true,
    is_active: true
  },
  
  // Environment & Climate
  {
    id: generateId("TWG-Environment"),
    code: "TWG-Environment",
    label: "Environment & Climate Change TWG",
    sector: "41010",
    sector_code: "41010",
    description: "Addresses environmental and climate issues",
    isActive: true,
    is_active: true
  },
  
  // Social Protection
  {
    id: generateId("TWG-SocialProtection"),
    code: "TWG-SocialProtection",
    label: "Social Protection TWG",
    sector: "16010",
    sector_code: "16010",
    description: "Coordinates social safety net programs",
    isActive: true,
    is_active: true
  },
  
  // Cross-cutting
  {
    id: generateId("TWG-M&E"),
    code: "TWG-M&E",
    label: "Monitoring & Evaluation TWG",
    description: "Oversees M&E frameworks and practices",
    isActive: true,
    is_active: true
  },
  {
    id: generateId("TWG-Coordination"),
    code: "TWG-Coordination",
    label: "Development Partner Coordination TWG",
    description: "Facilitates donor coordination",
    isActive: true,
    is_active: true
  }
];

// Group working groups by sector
export function groupWorkingGroupsBySector(): Record<string, WorkingGroup[]> {
  const grouped: Record<string, WorkingGroup[]> = {
    "Health": [],
    "Education": [],
    "Gender": [],
    "Agriculture & Rural Development": [],
    "Water & Sanitation": [],
    "Economic Development": [],
    "Governance": [],
    "Infrastructure": [],
    "Environment & Climate": [],
    "Social Protection": [],
    "Cross-cutting": []
  };
  
  WORKING_GROUPS.forEach(wg => {
    if (wg.code.includes("Health")) grouped["Health"].push(wg);
    else if (wg.code.includes("Education") || wg.code.includes("Vocational")) grouped["Education"].push(wg);
    else if (wg.code.includes("Gender")) grouped["Gender"].push(wg);
    else if (wg.code.includes("Agriculture") || wg.code.includes("FoodSecurity")) grouped["Agriculture & Rural Development"].push(wg);
    else if (wg.code.includes("WASH")) grouped["Water & Sanitation"].push(wg);
    else if (wg.code.includes("PrivateSector") || wg.code.includes("Trade")) grouped["Economic Development"].push(wg);
    else if (wg.code.includes("Governance") || wg.code.includes("Decentralization")) grouped["Governance"].push(wg);
    else if (wg.code.includes("Infrastructure")) grouped["Infrastructure"].push(wg);
    else if (wg.code.includes("Environment")) grouped["Environment & Climate"].push(wg);
    else if (wg.code.includes("SocialProtection")) grouped["Social Protection"].push(wg);
    else grouped["Cross-cutting"].push(wg);
  });
  
  // Remove empty groups
  Object.keys(grouped).forEach(key => {
    if (grouped[key].length === 0) delete grouped[key];
  });
  
  return grouped;
}

// Get working group by code
export function getWorkingGroupByCode(code: string): WorkingGroup | undefined {
  return WORKING_GROUPS.find(wg => wg.code === code);
}

// Get working groups by sector
export function getWorkingGroupsBySector(sectorCode: string): WorkingGroup[] {
  return WORKING_GROUPS.filter(wg => wg.sector === sectorCode);
} 
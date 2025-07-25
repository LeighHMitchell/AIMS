// OECD DAC Sector Hierarchy Data
// Based on official OECD DAC Purpose Codes

export interface SectorGroup {
  code: string;
  name: string;
  sectors: Sector[];
}

export interface Sector {
  code: string;
  name: string;
  subsectors?: SubSector[];
}

export interface SubSector {
  code: string;
  name: string;
  description?: string;
}

// Complete OECD DAC sector hierarchy
export const sectorHierarchy: SectorGroup[] = [
  {
    code: "110",
    name: "Education",
    sectors: [
      {
        code: "111",
        name: "Education, Level Unspecified",
        subsectors: [
          { code: "11110", name: "Education policy and administrative management" },
          { code: "11120", name: "Education facilities and training" },
          { code: "11130", name: "Teacher training" },
          { code: "11182", name: "Educational research" }
        ]
      },
      {
        code: "112",
        name: "Basic Education",
        subsectors: [
          { code: "11220", name: "Primary education" },
          { code: "11230", name: "Basic life skills for youth and adults" },
          { code: "11240", name: "Early childhood education" }
        ]
      },
      {
        code: "113",
        name: "Secondary Education",
        subsectors: [
          { code: "11320", name: "Secondary education" },
          { code: "11330", name: "Vocational training" }
        ]
      },
      {
        code: "114",
        name: "Post-Secondary Education",
        subsectors: [
          { code: "11420", name: "Higher education" },
          { code: "11430", name: "Advanced technical and managerial training" }
        ]
      }
    ]
  },
  {
    code: "120",
    name: "Health",
    sectors: [
      {
        code: "121",
        name: "Health, General",
        subsectors: [
          { code: "12110", name: "Health policy and administrative management" },
          { code: "12181", name: "Medical education/training" },
          { code: "12182", name: "Medical research" },
          { code: "12191", name: "Medical services" }
        ]
      },
      {
        code: "122",
        name: "Basic Health",
        subsectors: [
          { code: "12220", name: "Basic health care" },
          { code: "12230", name: "Basic health infrastructure" },
          { code: "12240", name: "Basic nutrition" },
          { code: "12250", name: "Infectious disease control" },
          { code: "12261", name: "Health education" },
          { code: "12262", name: "Malaria control" },
          { code: "12263", name: "Tuberculosis control" },
          { code: "12281", name: "Health personnel development" }
        ]
      },
      {
        code: "123",
        name: "Non-communicable diseases (NCDs)",
        subsectors: [
          { code: "12310", name: "NCDs control, general" },
          { code: "12320", name: "Tobacco use control" },
          { code: "12330", name: "Control of harmful use of alcohol and drugs" },
          { code: "12340", name: "Promotion of mental health and well-being" },
          { code: "12350", name: "Other prevention and treatment of NCDs" }
        ]
      }
    ]
  },
  {
    code: "130",
    name: "Population Policies/Programmes & Reproductive Health",
    sectors: [
      {
        code: "130",
        name: "Population Policies/Programmes & Reproductive Health",
        subsectors: [
          { code: "13010", name: "Population policy and administrative management" },
          { code: "13020", name: "Reproductive health care" },
          { code: "13030", name: "Family planning" },
          { code: "13040", name: "STD control including HIV/AIDS" },
          { code: "13081", name: "Personnel development for population and reproductive health" }
        ]
      }
    ]
  },
  {
    code: "140",
    name: "Water Supply & Sanitation",
    sectors: [
      {
        code: "140",
        name: "Water Supply & Sanitation",
        subsectors: [
          { code: "14010", name: "Water sector policy and administrative management" },
          { code: "14015", name: "Water resources conservation" },
          { code: "14020", name: "Water supply and sanitation - large systems" },
          { code: "14021", name: "Water supply - large systems" },
          { code: "14022", name: "Sanitation - large systems" },
          { code: "14030", name: "Basic drinking water supply and basic sanitation" },
          { code: "14031", name: "Basic drinking water supply" },
          { code: "14032", name: "Basic sanitation" },
          { code: "14040", name: "River basins development" },
          { code: "14050", name: "Waste management/disposal" },
          { code: "14081", name: "Education and training in water supply and sanitation" }
        ]
      }
    ]
  },
  {
    code: "150",
    name: "Government & Civil Society",
    sectors: [
      {
        code: "151",
        name: "Government & Civil Society-general",
        subsectors: [
          { code: "15110", name: "Public sector policy and administrative management" },
          { code: "15111", name: "Public finance management" },
          { code: "15112", name: "Decentralisation and support to subnational government" },
          { code: "15113", name: "Anti-corruption organisations and institutions" },
          { code: "15114", name: "Domestic revenue mobilisation" },
          { code: "15120", name: "Public sector financial management" },
          { code: "15130", name: "Legal and judicial development" },
          { code: "15150", name: "Democratic participation and civil society" },
          { code: "15151", name: "Elections" },
          { code: "15152", name: "Legislatures and political parties" },
          { code: "15153", name: "Media and free flow of information" },
          { code: "15160", name: "Human rights" },
          { code: "15170", name: "Women's equality organisations and institutions" },
          { code: "15180", name: "Ending violence against women and girls" }
        ]
      }
    ]
  },
  {
    code: "160",
    name: "Other Social Infrastructure & Services",
    sectors: [
      {
        code: "160",
        name: "Other Social Infrastructure & Services",
        subsectors: [
          { code: "16010", name: "Social Protection" },
          { code: "16020", name: "Employment creation" },
          { code: "16030", name: "Housing policy and administrative management" },
          { code: "16040", name: "Low-cost housing" },
          { code: "16050", name: "Multisector aid for basic social services" },
          { code: "16061", name: "Culture and recreation" },
          { code: "16062", name: "Statistical capacity building" },
          { code: "16063", name: "Narcotics control" },
          { code: "16064", name: "Social mitigation of HIV/AIDS" }
        ]
      }
    ]
  }
];

// Helper functions
export function getSectorByCode(code: string): SubSector | Sector | SectorGroup | null {
  // Check if it's a group (3 digits)
  if (code.length === 3) {
    return sectorHierarchy.find(group => group.code === code) || null;
  }
  
  // Check if it's a sector (3 digits) or subsector (5 digits)
  for (const group of sectorHierarchy) {
    for (const sector of group.sectors) {
      if (sector.code === code) {
        return sector;
      }
      if (sector.subsectors) {
        const subsector = sector.subsectors.find(sub => sub.code === code);
        if (subsector) {
          return subsector;
        }
      }
    }
  }
  
  return null;
}

export function getHierarchyByCode(code: string): {
  group: SectorGroup | null;
  sector: Sector | null;
  subsector: SubSector | null;
  level: 'group' | 'sector' | 'subsector';
} {
  let group: SectorGroup | null = null;
  let sector: Sector | null = null;
  let subsector: SubSector | null = null;
  let level: 'group' | 'sector' | 'subsector' = 'subsector';
  
  // Determine level based on code length
  if (code.length === 3) {
    level = 'group';
    group = sectorHierarchy.find(g => g.code === code) || null;
  } else {
    // Find the group first (first 3 digits)
    const groupCode = code.substring(0, 3);
    group = sectorHierarchy.find(g => g.code === groupCode) || null;
    
    if (group) {
      // Check if it's a sector
      for (const s of group.sectors) {
        if (s.code === code) {
          sector = s;
          level = 'sector';
          break;
        }
        
        // Check subsectors
        if (s.subsectors) {
          const sub = s.subsectors.find(ss => ss.code === code);
          if (sub) {
            sector = s;
            subsector = sub;
            level = 'subsector';
            break;
          }
        }
      }
    }
  }
  
  return { group, sector, subsector, level };
}

export function getAllSectors(): Array<{ value: string; label: string; level: string }> {
  const allSectors: Array<{ value: string; label: string; level: string }> = [];
  
  sectorHierarchy.forEach(group => {
    // Add group
    allSectors.push({
      value: group.code,
      label: `${group.code} - ${group.name}`,
      level: 'group'
    });
    
    // Add sectors
    group.sectors.forEach(sector => {
      allSectors.push({
        value: sector.code,
        label: `${sector.code} - ${sector.name}`,
        level: 'sector'
      });
      
      // Add subsectors
      if (sector.subsectors) {
        sector.subsectors.forEach(subsector => {
          allSectors.push({
            value: subsector.code,
            label: `${subsector.code} - ${subsector.name}`,
            level: 'subsector'
          });
        });
      }
    });
  });
  
  return allSectors;
}
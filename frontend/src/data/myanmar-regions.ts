// Myanmar States, Regions, and Union Territories
export const MYANMAR_REGIONS = [
  // States
  { 
    name: "Chin State", 
    type: "State", 
    flag: "/images/flags/chin-state.svg",
    flagAlt: "Flag of Chin State"
  },
  { 
    name: "Kachin State", 
    type: "State", 
    flag: "/images/flags/kachin-state.svg",
    flagAlt: "Flag of Kachin State"
  },
  { 
    name: "Kayah State", 
    type: "State", 
    flag: "/images/flags/kayah-state.svg",
    flagAlt: "Flag of Kayah State"
  },
  { 
    name: "Kayin State", 
    type: "State", 
    flag: "/images/flags/kayin-state.svg",
    flagAlt: "Flag of Kayin State"
  },
  { 
    name: "Mon State", 
    type: "State", 
    flag: "/images/flags/mon-state.svg",
    flagAlt: "Flag of Mon State"
  },
  { 
    name: "Rakhine State", 
    type: "State", 
    flag: "/images/flags/rakhine-state.svg",
    flagAlt: "Flag of Rakhine State"
  },
  { 
    name: "Shan State", 
    type: "State", 
    flag: "/images/flags/shan-state.svg",
    flagAlt: "Flag of Shan State"
  },
  
  // Regions
  { 
    name: "Ayeyarwady Region", 
    type: "Region", 
    flag: "/images/flags/ayeyarwady-region.svg",
    flagAlt: "Flag of Ayeyarwady Region"
  },
  { 
    name: "Bago Region", 
    type: "Region", 
    flag: "/images/flags/bago-region.svg",
    flagAlt: "Flag of Bago Region"
  },
  { 
    name: "Magway Region", 
    type: "Region", 
    flag: "/images/flags/magway-region.svg",
    flagAlt: "Flag of Magway Region"
  },
  { 
    name: "Mandalay Region", 
    type: "Region", 
    flag: "/images/flags/mandalay-region.svg",
    flagAlt: "Flag of Mandalay Region"
  },
  { 
    name: "Sagaing Region", 
    type: "Region", 
    flag: "/images/flags/sagaing-region.svg",
    flagAlt: "Flag of Sagaing Region"
  },
  { 
    name: "Tanintharyi Region", 
    type: "Region", 
    flag: "/images/flags/tanintharyi-region.svg",
    flagAlt: "Flag of Tanintharyi Region"
  },
  { 
    name: "Yangon Region", 
    type: "Region", 
    flag: "/images/flags/yangon-region.svg",
    flagAlt: "Flag of Yangon Region"
  },
  
  // Union Territories
  { 
    name: "Naypyitaw Union Territory", 
    type: "Union Territory", 
    flag: "/images/flags/naypyitaw-union-territory.svg",
    flagAlt: "Flag of Naypyitaw Union Territory"
  }
] as const;

export type MyanmarRegion = typeof MYANMAR_REGIONS[number];
export type RegionType = "State" | "Region" | "Union Territory";
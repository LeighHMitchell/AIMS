// Myanmar States, Regions, and Union Territories
export const MYANMAR_REGIONS = [
  // States
  {
    name: "Chin State",
    type: "State",
    st_pcode: "MMR004",
    flag: "/images/flags/chin-state.svg",
    flagAlt: "Flag of Chin State"
  },
  {
    name: "Kachin State",
    type: "State",
    st_pcode: "MMR001",
    flag: "/images/flags/kachin-state.svg",
    flagAlt: "Flag of Kachin State"
  },
  {
    name: "Kayah State",
    type: "State",
    st_pcode: "MMR002",
    flag: "/images/flags/kayah-state.svg",
    flagAlt: "Flag of Kayah State"
  },
  {
    name: "Kayin State",
    type: "State",
    st_pcode: "MMR003",
    flag: "/images/flags/kayin-state.svg",
    flagAlt: "Flag of Kayin State"
  },
  {
    name: "Mon State",
    type: "State",
    st_pcode: "MMR011",
    flag: "/images/flags/mon-state.svg",
    flagAlt: "Flag of Mon State"
  },
  {
    name: "Rakhine State",
    type: "State",
    st_pcode: "MMR012",
    flag: "/images/flags/rakhine-state.svg",
    flagAlt: "Flag of Rakhine State"
  },
  {
    name: "Shan State",
    type: "State",
    st_pcode: "MMR014",  // Primary: Shan (South), also MMR015 (North), MMR016 (East)
    flag: "/images/flags/shan-state.svg",
    flagAlt: "Flag of Shan State"
  },

  // Regions
  {
    name: "Ayeyarwady Region",
    type: "Region",
    st_pcode: "MMR017",
    flag: "/images/flags/ayeyarwady-region.svg",
    flagAlt: "Flag of Ayeyarwady Region"
  },
  {
    name: "Bago Region",
    type: "Region",
    st_pcode: "MMR007",  // Primary: Bago (East), also MMR008 (West)
    flag: "/images/flags/bago-region.svg",
    flagAlt: "Flag of Bago Region"
  },
  {
    name: "Magway Region",
    type: "Region",
    st_pcode: "MMR009",
    flag: "/images/flags/magway-region.svg",
    flagAlt: "Flag of Magway Region"
  },
  {
    name: "Mandalay Region",
    type: "Region",
    st_pcode: "MMR010",
    flag: "/images/flags/mandalay-region.svg",
    flagAlt: "Flag of Mandalay Region"
  },
  {
    name: "Sagaing Region",
    type: "Region",
    st_pcode: "MMR005",
    flag: "/images/flags/sagaing-region.svg",
    flagAlt: "Flag of Sagaing Region"
  },
  {
    name: "Tanintharyi Region",
    type: "Region",
    st_pcode: "MMR006",
    flag: "/images/flags/tanintharyi-region.svg",
    flagAlt: "Flag of Tanintharyi Region"
  },
  {
    name: "Yangon Region",
    type: "Region",
    st_pcode: "MMR013",
    flag: "/images/flags/yangon-region.svg",
    flagAlt: "Flag of Yangon Region"
  },

  // Union Territories
  {
    name: "Naypyidaw Union Territory",
    type: "Union Territory",
    st_pcode: "MMR018",
    flag: "/images/flags/naypyitaw-union-territory.svg",
    flagAlt: "Flag of Naypyidaw Union Territory"
  }
] as const;

export type MyanmarRegion = typeof MYANMAR_REGIONS[number];
export type RegionType = "State" | "Region" | "Union Territory";

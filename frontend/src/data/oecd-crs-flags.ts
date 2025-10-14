// OECD CRS Other Flags
// Based on IATI and OECD DAC CRS specifications

export interface OECDCRSFlag {
  code: string;
  name: string;
  description: string;
}

export const OECD_CRS_FLAGS: OECDCRSFlag[] = [
  {
    code: '1',
    name: 'Free-standing technical cooperation',
    description: 'Technical cooperation that is not an integral part of an investment project'
  },
  {
    code: '2',
    name: 'Programme-based approach',
    description: 'A way of engaging in development cooperation based on coordinated support for a locally-owned programme'
  },
  {
    code: '3',
    name: 'Investment project',
    description: 'Activities that support the creation of infrastructure, production capacity or other capital assets'
  },
  {
    code: '4',
    name: 'Associated financing',
    description: 'Official export credits guaranteed by the donor country that are associated with ODA'
  }
];

// Helper function to get flag by code
export function getOECDCRSFlag(code: string): OECDCRSFlag | undefined {
  return OECD_CRS_FLAGS.find(flag => flag.code === code);
}

// Helper function to get flag options for dropdowns
export function getOECDCRSFlagOptions() {
  return OECD_CRS_FLAGS.map(flag => ({
    value: flag.code,
    label: `${flag.code} - ${flag.name}`,
    description: flag.description
  }));
}


/**
 * IATI SectorVocabulary Codelist
 * Used for sector/@vocabulary and transaction/sector/@vocabulary attributes
 * https://iatistandard.org/en/iati-standard/203/codelists/sectorvocabulary/
 */

export interface SectorVocabulary {
  code: string;
  name: string;
  description: string;
}

export const SECTOR_VOCABULARY: SectorVocabulary[] = [
  { code: '1', name: 'OECD DAC CRS Purpose Codes (5-digit)', description: 'OECD DAC Creditor Reporting System 5-digit purpose codes.' },
  { code: '2', name: 'OECD DAC CRS Purpose Codes (3-digit)', description: 'OECD DAC Creditor Reporting System 3-digit category codes.' },
  { code: '3', name: 'Classification of the Functions of Government (UN)', description: 'United Nations Classification of the Functions of Government.' },
  { code: '4', name: 'Statistical Classification of Economic Activities in the European Community (NACE)', description: 'EU statistical classification of economic activities.' },
  { code: '5', name: 'National Taxonomy for Exempt Entities (NTEE)', description: 'NTEE classification system for non-profit organisations.' },
  { code: '6', name: 'AidData', description: 'AidData sector classification.' },
  { code: '7', name: 'SDG Goal', description: 'United Nations Sustainable Development Goal.' },
  { code: '8', name: 'SDG Target', description: 'United Nations Sustainable Development Goal target.' },
  { code: '9', name: 'SDG Indicator', description: 'United Nations Sustainable Development Goal indicator.' },
  { code: '10', name: 'Humanitarian Global Clusters (Inter-Agency Standing Committee)', description: 'IASC humanitarian global clusters.' },
  { code: '11', name: 'North American Industry Classification System (NAICS)', description: 'NAICS industry classification.' },
  { code: '12', name: 'UN System Function', description: 'United Nations system function classification.' },
  { code: '98', name: 'Reporting Organisation 2', description: 'Alternative reporting-organisation vocabulary.' },
  { code: '99', name: 'Reporting Organisation', description: 'A vocabulary maintained by the reporting organisation.' },
];

export function getSectorVocabularyName(code: string | null | undefined): string {
  if (!code) return '';
  return SECTOR_VOCABULARY.find(e => e.code === code)?.name ?? '';
}

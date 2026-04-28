/**
 * IATI GeographicVocabulary Codelist
 * Used for location/location-id/@vocabulary and location/administrative/@vocabulary
 * https://iatistandard.org/en/iati-standard/203/codelists/geographicvocabulary/
 */

export interface GeographicVocabulary {
  code: string;
  name: string;
  description: string;
}

export const GEOGRAPHIC_VOCABULARY: GeographicVocabulary[] = [
  { code: 'A1', name: 'Global Administrative Unit Layers', description: 'Global administrative unit layers (FAO).' },
  { code: 'A2', name: 'UN Second Administrative Level Boundary Project', description: 'UN second administrative level boundary project codes.' },
  { code: 'A3', name: 'Global Administrative Areas', description: 'Global administrative areas (gadm.org).' },
  { code: 'A4', name: 'ISO Country (3166-1 alpha-2)', description: 'Two-letter ISO country codes.' },
  { code: 'G1', name: 'Geonames', description: 'Identifier from geonames.org.' },
  { code: 'G2', name: 'OpenStreetMap', description: 'OpenStreetMap node, way or relation identifier.' },
  { code: '99', name: 'Reporting Organisation', description: 'A vocabulary maintained by the reporting organisation.' },
];

export function getGeographicVocabularyName(code: string | null | undefined): string {
  if (!code) return '';
  return GEOGRAPHIC_VOCABULARY.find(e => e.code === code)?.name ?? '';
}

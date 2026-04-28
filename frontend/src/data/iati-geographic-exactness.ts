/**
 * IATI GeographicExactness Codelist
 * Used for location/exactness/@code attribute
 * https://iatistandard.org/en/iati-standard/203/codelists/geographicexactness/
 */

export interface GeographicExactness {
  code: '1' | '2';
  name: string;
  description: string;
}

export const GEOGRAPHIC_EXACTNESS: GeographicExactness[] = [
  {
    code: '1',
    name: 'Exact',
    description: 'The designated geographic location is exact.',
  },
  {
    code: '2',
    name: 'Approximate',
    description: 'The designated geographic location is approximate.',
  },
];

export function getGeographicExactnessName(code: string | null | undefined): string {
  if (!code) return '';
  return GEOGRAPHIC_EXACTNESS.find(e => e.code === code)?.name ?? '';
}

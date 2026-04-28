/**
 * IATI GeographicLocationClass Codelist
 * Used for location/location-class/@code attribute
 * https://iatistandard.org/en/iati-standard/203/codelists/geographiclocationclass/
 */

export interface GeographicLocationClass {
  code: '1' | '2' | '3' | '4';
  name: string;
  description: string;
}

export const GEOGRAPHIC_LOCATION_CLASS: GeographicLocationClass[] = [
  {
    code: '1',
    name: 'Administrative Region',
    description: 'Administrative division of a country, e.g. region, district, province.',
  },
  {
    code: '2',
    name: 'Populated Place',
    description: 'City, town, village or other inhabited place.',
  },
  {
    code: '3',
    name: 'Structure',
    description: 'A physical or man-made feature, such as a building or monument.',
  },
  {
    code: '4',
    name: 'Other Topographical Feature',
    description: 'Geographic features such as mountains, rivers, forests, etc.',
  },
];

export function getGeographicLocationClassName(code: string | null | undefined): string {
  if (!code) return '';
  return GEOGRAPHIC_LOCATION_CLASS.find(e => e.code === code)?.name ?? '';
}

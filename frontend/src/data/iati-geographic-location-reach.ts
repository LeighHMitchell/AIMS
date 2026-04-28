/**
 * IATI GeographicLocationReach Codelist
 * Used for location/location-reach/@code attribute
 * https://iatistandard.org/en/iati-standard/203/codelists/geographiclocationreach/
 */

export interface GeographicLocationReach {
  code: '1' | '2';
  name: string;
  description: string;
}

export const GEOGRAPHIC_LOCATION_REACH: GeographicLocationReach[] = [
  {
    code: '1',
    name: 'Activity',
    description: 'The location specifies where the activity takes place.',
  },
  {
    code: '2',
    name: 'Intended Beneficiaries',
    description: 'The location specifies where the intended beneficiaries of the activity live.',
  },
];

export function getGeographicLocationReachName(code: string | null | undefined): string {
  if (!code) return '';
  return GEOGRAPHIC_LOCATION_REACH.find(e => e.code === code)?.name ?? '';
}

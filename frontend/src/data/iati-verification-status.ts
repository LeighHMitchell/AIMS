/**
 * IATI VerificationStatus Codelist
 * Used for location/@verification-status attribute
 * https://iatistandard.org/en/iati-standard/203/codelists/verificationstatus/
 */

export interface VerificationStatus {
  code: '0' | '1';
  name: string;
  description: string;
}

export const VERIFICATION_STATUS: VerificationStatus[] = [
  {
    code: '0',
    name: 'Unverified',
    description: 'The location data has not been verified.',
  },
  {
    code: '1',
    name: 'Verified',
    description: 'The location data has been verified.',
  },
];

export function getVerificationStatusName(code: string | null | undefined): string {
  if (!code) return '';
  return VERIFICATION_STATUS.find(e => e.code === code)?.name ?? '';
}

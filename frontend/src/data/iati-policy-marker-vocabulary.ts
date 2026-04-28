/**
 * IATI PolicyMarkerVocabulary Codelist
 * Used for policy-marker/@vocabulary attribute
 * https://iatistandard.org/en/iati-standard/203/codelists/policymarkervocabulary/
 */

export interface PolicyMarkerVocabulary {
  code: string;
  name: string;
  description: string;
}

export const POLICY_MARKER_VOCABULARY: PolicyMarkerVocabulary[] = [
  {
    code: '1',
    name: 'OECD DAC CRS',
    description: 'OECD DAC Creditor Reporting System policy markers.',
  },
  {
    code: '99',
    name: 'Reporting Organisation',
    description: 'A vocabulary maintained by the reporting organisation.',
  },
];

export function getPolicyMarkerVocabularyName(code: string | null | undefined): string {
  if (!code) return '';
  return POLICY_MARKER_VOCABULARY.find(e => e.code === code)?.name ?? '';
}

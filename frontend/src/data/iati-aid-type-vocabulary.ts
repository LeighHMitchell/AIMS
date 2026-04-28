/**
 * IATI AidTypeVocabulary Codelist
 * Used for default-aid-type/@vocabulary and transaction/aid-type/@vocabulary
 * https://iatistandard.org/en/iati-standard/203/codelists/aidtypevocabulary/
 */

export interface AidTypeVocabulary {
  code: '1' | '2' | '3' | '4';
  name: string;
  description: string;
}

export const AID_TYPE_VOCABULARY: AidTypeVocabulary[] = [
  {
    code: '1',
    name: 'OECD DAC',
    description: 'OECD DAC AidType codelist (e.g. A01, A02, B01, C01, D01).',
  },
  {
    code: '2',
    name: 'Earmarking Category',
    description: 'OECD DAC Earmarking category codelist.',
  },
  {
    code: '3',
    name: 'Earmarking Modality',
    description: 'OECD DAC Earmarking modality codelist.',
  },
  {
    code: '4',
    name: 'Cash and Voucher Modalities',
    description: 'Cash and voucher assistance modality codelist.',
  },
];

export function getAidTypeVocabularyName(code: string | null | undefined): string {
  if (!code) return '';
  return AID_TYPE_VOCABULARY.find(e => e.code === code)?.name ?? '';
}

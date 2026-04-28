/**
 * IATI ResultVocabulary Codelist
 * Used for result/indicator/@vocabulary attribute
 * https://iatistandard.org/en/iati-standard/203/codelists/resultvocabulary/
 */

export interface ResultVocabulary {
  code: string;
  name: string;
  description: string;
}

export const RESULT_VOCABULARY: ResultVocabulary[] = [
  {
    code: '1',
    name: 'WHO Registry of Indicators',
    description: 'World Health Organization indicator registry.',
  },
  {
    code: '2',
    name: 'Reporting Organisation',
    description: 'A vocabulary maintained by the reporting organisation.',
  },
  {
    code: '99',
    name: 'Reporting Organisation 2',
    description: 'Alternative reporting-organisation vocabulary.',
  },
];

export function getResultVocabularyName(code: string | null | undefined): string {
  if (!code) return '';
  return RESULT_VOCABULARY.find(e => e.code === code)?.name ?? '';
}

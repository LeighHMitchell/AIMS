/**
 * IATI TagVocabulary Codelist
 * Used for tag/@vocabulary attribute
 * https://iatistandard.org/en/iati-standard/203/codelists/tagvocabulary/
 */

export interface TagVocabulary {
  code: string;
  name: string;
  description: string;
}

export const TAG_VOCABULARY: TagVocabulary[] = [
  {
    code: '1',
    name: 'Agrovoc',
    description: 'FAO Agrovoc multilingual agricultural thesaurus.',
  },
  {
    code: '2',
    name: 'UN Sustainable Development Goals (SDG)',
    description: 'Tags referencing UN Sustainable Development Goals.',
  },
  {
    code: '3',
    name: 'UN Sustainable Development Goals (SDG) Targets',
    description: 'Tags referencing specific SDG targets.',
  },
  {
    code: '99',
    name: 'Reporting Organisation',
    description: 'A vocabulary maintained by the reporting organisation.',
  },
];

export function getTagVocabularyName(code: string | null | undefined): string {
  if (!code) return '';
  return TAG_VOCABULARY.find(e => e.code === code)?.name ?? '';
}

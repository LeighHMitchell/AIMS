/**
 * IATI HumanitarianScopeVocabulary Codelist
 * Used for humanitarian-scope/@vocabulary attribute
 * https://iatistandard.org/en/iati-standard/203/codelists/humanitarianscopevocabulary/
 */

export interface HumanitarianScopeVocabulary {
  code: string;
  name: string;
  description: string;
}

export const HUMANITARIAN_SCOPE_VOCABULARY: HumanitarianScopeVocabulary[] = [
  { code: '1-1', name: 'UN OCHA Financial Tracking Service (FTS) Emergencies', description: 'OCHA FTS emergency identifiers.' },
  { code: '1-2', name: 'Glide', description: 'GLIDE disaster identifier (glidenumber.net).' },
  { code: '1-3', name: 'Humanitarian Plan', description: 'OCHA humanitarian response plan identifier.' },
  { code: '2-1', name: 'UN OCHA Financial Tracking Service (FTS) Appeals', description: 'OCHA FTS appeal identifiers.' },
  { code: '99', name: 'Reporting Organisation', description: 'A vocabulary maintained by the reporting organisation.' },
];

export function getHumanitarianScopeVocabularyName(code: string | null | undefined): string {
  if (!code) return '';
  return HUMANITARIAN_SCOPE_VOCABULARY.find(e => e.code === code)?.name ?? '';
}

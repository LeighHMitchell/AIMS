// IATI Humanitarian Codelists
// Reference: https://iatistandard.org/en/guidance/standard-guidance/humanitarian/

export const HUMANITARIAN_SCOPE_TYPES = [
  {
    code: '1',
    name: 'Emergency',
    description: 'A crisis or emergency, such as a natural disaster or conflict'
  },
  {
    code: '2',
    name: 'Appeal',
    description: 'An appeal for funding, such as a Flash Appeal or Humanitarian Response Plan'
  }
] as const;

export const HUMANITARIAN_SCOPE_VOCABULARIES = [
  {
    code: '1-2',
    name: 'Glide',
    description: 'Global Identifier Number (GlideNumber) - for emergencies',
    url: 'http://glidenumber.net/glide/public/search/search.jsp',
    example: 'EQ-2015-000048-NPL (Nepal Earthquake April 2015)'
  },
  {
    code: '2-1',
    name: 'Humanitarian Plan',
    description: 'UN OCHA Humanitarian Response Plan codes - for appeals',
    url: 'https://fts.unocha.org/plan-code-list-iati',
    example: 'FNPL15 (Nepal Flash Appeal 2015)'
  },
  {
    code: '99',
    name: 'Reporting Organisation',
    description: 'Custom vocabulary defined by reporting organisation',
    url: '',
    example: 'Organisation-specific emergency code'
  }
] as const;

// Helper function to get vocabulary name by code
export function getVocabularyName(code: string): string {
  const vocab = HUMANITARIAN_SCOPE_VOCABULARIES.find(v => v.code === code);
  return vocab ? vocab.name : code;
}

// Helper function to get scope type name by code
export function getScopeTypeName(code: string): string {
  const type = HUMANITARIAN_SCOPE_TYPES.find(t => t.code === code);
  return type ? type.name : code;
}

// Validate vocabulary code based on scope type
export function isValidVocabulary(type: '1' | '2', vocabulary: string): boolean {
  if (vocabulary === '99') return true; // Custom always valid
  if (type === '1') return vocabulary === '1-2'; // Emergency uses GLIDE
  if (type === '2') return vocabulary === '2-1' || vocabulary === '99'; // Appeal uses HRP or custom
  return false;
}


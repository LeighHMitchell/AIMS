/**
 * IATI HumanitarianScopeType Codelist
 * Used for humanitarian-scope/@type attribute
 * https://iatistandard.org/en/iati-standard/203/codelists/humanitarianscopetype/
 */

export interface HumanitarianScopeType {
  code: '1' | '2';
  name: string;
  description: string;
}

export const HUMANITARIAN_SCOPE_TYPE: HumanitarianScopeType[] = [
  {
    code: '1',
    name: 'Emergency',
    description: 'A specific humanitarian emergency.',
  },
  {
    code: '2',
    name: 'Appeal',
    description: 'A humanitarian appeal or response plan.',
  },
];

export function getHumanitarianScopeTypeName(code: string | null | undefined): string {
  if (!code) return '';
  return HUMANITARIAN_SCOPE_TYPE.find(e => e.code === code)?.name ?? '';
}

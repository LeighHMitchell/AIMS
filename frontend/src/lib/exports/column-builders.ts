/**
 * Column builders — small helpers that emit standard column-pairs for export
 * rows. Use these to keep the "code in one column, name in another" rule
 * consistent everywhere.
 *
 *   const aid = coded('aid_type', row.default_aid_type);
 *   row.aid_type_code = aid.code;
 *   row.aid_type_name = aid.name;
 *
 *   const money = monetary(row.value, row.value_currency, row.usd_value);
 *   row.value           = money.value;
 *   row.currency_code   = money.currencyCode;
 *   row.currency_name   = money.currencyName;
 *   row.usd_value       = money.usdValue;
 */

import { codeAndName, getCodelistLabel, type IatiCodelist } from '@/lib/iati/codelist-resolver';
import { ALL_CURRENCIES } from '@/data/currencies';
import { format as formatDate, parseISO, isValid } from 'date-fns';

const currencyNameByCode = new Map<string, string>(
  ALL_CURRENCIES.map(c => [c.code, c.name])
);

/**
 * Codelist code+name pair.
 * Currency is a special case: the registry prefixes the code to the name
 * (e.g. "USD - US Dollar") for select dropdowns. Exports want the clean name
 * only ("US Dollar") so the code+name columns don't duplicate.
 */
export function coded(list: IatiCodelist, code: string | number | null | undefined) {
  if (list === 'currency') {
    if (code === null || code === undefined || code === '') {
      return { code: '', name: '' };
    }
    const codeStr = String(code);
    return { code: codeStr, name: currencyNameByCode.get(codeStr) ?? '' };
  }
  return codeAndName(list, code);
}

/** Just the label for a code (use when you need a single column). */
export function label(list: IatiCodelist, code: string | number | null | undefined): string {
  return getCodelistLabel(list, code);
}

/**
 * Monetary triplet: original value, currency code+name, optional USD value.
 * Always returns all four fields so column structure stays consistent across
 * rows that have or lack USD conversion.
 */
export function monetary(
  value: number | string | null | undefined,
  currencyCode: string | null | undefined,
  usdValue?: number | string | null | undefined
) {
  const numeric = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const code = currencyCode ? String(currencyCode) : '';
  return {
    value: numeric(value),
    currencyCode: code,
    currencyName: code ? currencyNameByCode.get(code) ?? '' : '',
    usdValue: usdValue === undefined ? null : numeric(usdValue),
  };
}

/**
 * Flatten an IATI narrative array (multiple languages) into language-keyed
 * columns. Pass an array of `{ lang, text }`; receive an object whose keys
 * are `prefix_<lang>` (lowercased ISO 639-1).
 *
 *   narrative('title', [{lang:'en', text:'Foo'}, {lang:'fr', text:'Bar'}])
 *   // => { title_en: 'Foo', title_fr: 'Bar' }
 */
export function narrative(
  prefix: string,
  values: ReadonlyArray<{ lang?: string | null; text?: string | null }> | null | undefined
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!values) return out;
  for (const v of values) {
    if (!v?.text) continue;
    const lang = (v.lang ?? 'en').toLowerCase();
    const key = `${prefix}_${lang}`;
    if (out[key]) {
      out[key] = `${out[key]}; ${v.text}`;
    } else {
      out[key] = v.text;
    }
  }
  return out;
}

/**
 * ISO-format a date for export. Accepts a string, Date, or null.
 * Returns 'YYYY-MM-DD' or '' for nullish/invalid input.
 */
export function dateIso(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? parseISO(value) : value;
  if (!isValid(d)) return '';
  return formatDate(d, 'yyyy-MM-dd');
}

/**
 * ISO-8601 datetime export, second precision.
 */
export function dateTimeIso(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? parseISO(value) : value;
  if (!isValid(d)) return '';
  return formatDate(d, "yyyy-MM-dd'T'HH:mm:ss");
}

/** Boolean to "Yes"/"No"/empty. */
export function bool(value: boolean | null | undefined): 'Yes' | 'No' | '' {
  if (value === null || value === undefined) return '';
  return value ? 'Yes' : 'No';
}

/**
 * Org reference triplet — IATI participating-org pattern.
 * Returns ref + name + type code/name, all four guaranteed present.
 */
export function orgRef(input: {
  ref?: string | null;
  name?: string | null;
  typeCode?: string | null;
}) {
  const t = coded('organization_type', input.typeCode);
  return {
    ref: input.ref ?? '',
    name: input.name ?? '',
    typeCode: t.code,
    typeName: t.name,
  };
}

/**
 * Percentage formatter — clamps to a string with up to 4 dp, no trailing
 * zeros, no '%' sign (downstream consumers add their own column header).
 */
export function percentage(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(4).replace(/\.?0+$/, '');
}

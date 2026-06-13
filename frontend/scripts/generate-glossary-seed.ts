/**
 * Generates the seed INSERT statement for the glossary_terms migration
 * from the canonical term list in src/lib/glossary-terms.ts.
 *
 * Usage: npx tsx scripts/generate-glossary-seed.ts
 */
import { GLOSSARY_TERMS } from '../src/lib/glossary-terms'

const esc = (s: string) => s.replace(/'/g, "''")

const values = GLOSSARY_TERMS.map(
  (t) =>
    `  ('${esc(t.term)}', '${esc(t.category)}', '${esc(t.simple)}', '${esc(t.detailed)}')`
).join(',\n')

console.log(
  `INSERT INTO public.glossary_terms (term, category, simple_definition, detailed_definition) VALUES\n${values}\nON CONFLICT ((lower(term))) DO NOTHING;`
)

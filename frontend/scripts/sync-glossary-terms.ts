/**
 * Syncs the glossary_terms table to the canonical term list in
 * src/lib/glossary-terms.ts: updates existing rows (matched by term,
 * case-insensitive) and inserts any that are missing. Terms added
 * manually by super users in the Admin panel are left untouched.
 *
 * Usage: npx tsx scripts/sync-glossary-terms.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { GLOSSARY_TERMS } from '../src/lib/glossary-terms'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const { data: existing, error } = await supabase
    .from('glossary_terms')
    .select('id, term')
  if (error) {
    console.error('Failed to read glossary_terms:', error.message)
    process.exit(1)
  }

  const byLowerTerm = new Map(existing.map(row => [row.term.toLowerCase(), row.id]))
  let updated = 0
  let inserted = 0

  for (const term of GLOSSARY_TERMS) {
    const payload = {
      term: term.term,
      category: term.category,
      simple_definition: term.simple,
      detailed_definition: term.detailed,
    }
    const existingId = byLowerTerm.get(term.term.toLowerCase())
    if (existingId) {
      const { error: updateError } = await supabase
        .from('glossary_terms')
        .update(payload)
        .eq('id', existingId)
      if (updateError) {
        console.error(`Update failed for "${term.term}":`, updateError.message)
        process.exit(1)
      }
      updated++
    } else {
      const { error: insertError } = await supabase
        .from('glossary_terms')
        .insert(payload)
      if (insertError) {
        console.error(`Insert failed for "${term.term}":`, insertError.message)
        process.exit(1)
      }
      inserted++
    }
  }

  console.log(`Sync complete: ${updated} updated, ${inserted} inserted.`)

  const { data: check } = await supabase
    .from('glossary_terms')
    .select('detailed_definition')
    .eq('term', 'Working Group')
    .single()
  console.log('Working Group detailed length is now:', check?.detailed_definition?.length)
}

main()

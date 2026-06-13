/**
 * Applies the glossary_terms migration via the exec_sql RPC.
 *
 * Usage: npx tsx scripts/apply-glossary-migration.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

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
  const sqlPath = path.join(
    process.cwd(),
    'supabase/migrations/20260612000000_create_glossary_terms.sql'
  )
  const sql = fs.readFileSync(sqlPath, 'utf8')

  console.log('Applying glossary_terms migration...')
  const { error } = await supabase.rpc('exec_sql', { sql })
  if (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }

  const { count, error: countError } = await supabase
    .from('glossary_terms')
    .select('*', { count: 'exact', head: true })
  if (countError) {
    console.error('Verification query failed:', countError)
    process.exit(1)
  }
  console.log(`Migration applied. glossary_terms now has ${count} rows.`)
}

main()

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration() {
  console.log('Applying inherited flags migration...\n')

  const sql = `
    ALTER TABLE transactions
      ADD COLUMN IF NOT EXISTS flow_type_inherited BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS aid_type_inherited BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS tied_status_inherited BOOLEAN DEFAULT FALSE;
  `

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).single()

  if (error) {
    console.error('Migration failed:', error)
    console.log('\nTrying direct column addition...')
    
    // Try adding columns one by one
    const columns = [
      'flow_type_inherited',
      'aid_type_inherited', 
      'tied_status_inherited'
    ]

    for (const col of columns) {
      const { error: colError } = await supabase.rpc('exec_sql', {
        sql_query: `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ${col} BOOLEAN DEFAULT FALSE;`
      }).single()

      if (colError) {
        console.error(`Failed to add ${col}:`, colError)
      } else {
        console.log(`✓ Added column: ${col}`)
      }
    }
  } else {
    console.log('✓ Migration applied successfully!')
  }
}

applyMigration()

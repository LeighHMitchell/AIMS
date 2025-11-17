import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' }
})

async function addColumns() {
  console.log('Adding inherited flag columns...\n')

  // Use Supabase's from() with a raw SQL select to check and add columns
  const { data, error } = await supabase
    .from('transactions')
    .select('flow_type_inherited, aid_type_inherited, tied_status_inherited')
    .limit(1)

  if (error && error.code === '42703') {
    console.log('Columns do not exist yet. They need to be added via SQL.')
    console.log('Please run this SQL directly in your Supabase SQL Editor:\n')
    console.log('ALTER TABLE transactions')
    console.log('  ADD COLUMN IF NOT EXISTS flow_type_inherited BOOLEAN DEFAULT FALSE,')
    console.log('  ADD COLUMN IF NOT EXISTS aid_type_inherited BOOLEAN DEFAULT FALSE,')
    console.log('  ADD COLUMN IF NOT EXISTS tied_status_inherited BOOLEAN DEFAULT FALSE;')
  } else if (!error) {
    console.log('✓ Columns already exist!')
  } else {
    console.error('Error checking columns:', error)
  }
}

addColumns()

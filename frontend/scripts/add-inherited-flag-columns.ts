import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' }
})

async function addInheritedFlagColumns() {
  console.log('Adding inherited flag columns to transactions table...\n')

  try {
    // Use raw SQL query via Supabase
    const { error } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE transactions
          ADD COLUMN IF NOT EXISTS flow_type_inherited BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS aid_type_inherited BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS tied_status_inherited BOOLEAN DEFAULT FALSE;

        COMMENT ON COLUMN transactions.flow_type_inherited IS 'TRUE if flow_type was inherited from activity default_flow_type';
        COMMENT ON COLUMN transactions.aid_type_inherited IS 'TRUE if aid_type was inherited from activity default_aid_type';
        COMMENT ON COLUMN transactions.tied_status_inherited IS 'TRUE if tied_status was inherited from activity default_tied_status';
      `
    })

    if (error) {
      console.error('Error adding columns:', error)
      console.log('\n⚠️  The RPC function may not exist. Please run this SQL directly in your Supabase SQL Editor:\n')
      console.log(`
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS flow_type_inherited BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS aid_type_inherited BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tied_status_inherited BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN transactions.flow_type_inherited IS 'TRUE if flow_type was inherited from activity default_flow_type';
COMMENT ON COLUMN transactions.aid_type_inherited IS 'TRUE if aid_type was inherited from activity default_aid_type';
COMMENT ON COLUMN transactions.tied_status_inherited IS 'TRUE if tied_status was inherited from activity default_tied_status';
      `)
      process.exit(1)
    }

    console.log('✅ Columns added successfully!')

  } catch (error) {
    console.error('Unexpected error:', error)
    console.log('\n⚠️  Please run this SQL directly in your Supabase SQL Editor:\n')
    console.log(`
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS flow_type_inherited BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS aid_type_inherited BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tied_status_inherited BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN transactions.flow_type_inherited IS 'TRUE if flow_type was inherited from activity default_flow_type';
COMMENT ON COLUMN transactions.aid_type_inherited IS 'TRUE if aid_type was inherited from activity default_aid_type';
COMMENT ON COLUMN transactions.tied_status_inherited IS 'TRUE if tied_status was inherited from activity default_tied_status';
    `)
    process.exit(1)
  }
}

addInheritedFlagColumns()

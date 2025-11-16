import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  // Get one transaction to see the fields
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error:', error)
    return
  }

  if (data && data.length > 0) {
    console.log('Transaction fields:')
    console.log(Object.keys(data[0]).sort())
  }
}

checkSchema()

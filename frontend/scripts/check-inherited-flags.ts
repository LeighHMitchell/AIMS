import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkFlags() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error:', error)
    return
  }

  if (data && data.length > 0) {
    console.log('Transaction columns containing "inherited":')
    const fields = Object.keys(data[0]).filter(key => key.includes('inherited'))
    console.log(fields.sort())
  }
}

checkFlags()

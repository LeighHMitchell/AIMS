import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkColumns() {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error:', error)
    return
  }

  if (data && data.length > 0) {
    console.log('Activity columns containing "iati" or "identifier":')
    const fields = Object.keys(data[0]).filter(key => 
      key.toLowerCase().includes('iati') || key.toLowerCase().includes('identifier') || key.toLowerCase().includes('id')
    )
    console.log(fields.sort())
  }
}

checkColumns()

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDefaults() {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error:', error)
    return
  }

  if (data && data.length > 0) {
    console.log('Activity fields containing "default":')
    const fields = Object.keys(data[0]).filter(key => key.includes('default'))
    console.log(fields.sort())
    
    console.log('\nSample activity default values:')
    fields.forEach(field => {
      console.log(`  ${field}: ${data[0][field]}`)
    })
  }
}

checkDefaults()

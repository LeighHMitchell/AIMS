// Script to check and create subnational_breakdowns table
import { getSupabaseAdmin } from '../src/lib/supabase'

async function checkAndCreateTable() {
  const supabase = getSupabaseAdmin()
  
  console.log('🔍 Checking if subnational_breakdowns table exists...')
  
  // Test if table exists by trying to query it
  const { data, error } = await supabase
    .from('subnational_breakdowns')
    .select('count')
    .limit(1)
  
  if (error) {
    console.error('❌ Table does not exist or has issues:', error.message)
    console.log('📝 You need to run this SQL in your Supabase dashboard:')
    console.log('')
    console.log('CREATE TABLE IF NOT EXISTS public.subnational_breakdowns (')
    console.log('    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),')
    console.log('    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,')
    console.log('    region_name TEXT NOT NULL,')
    console.log('    is_nationwide BOOLEAN DEFAULT FALSE,')
    console.log('    percentage NUMERIC(5,2) CHECK (percentage >= 0 AND percentage <= 100),')
    console.log('    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),')
    console.log('    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),')
    console.log('    UNIQUE(activity_id, region_name)')
    console.log(');')
    console.log('')
    console.log('CREATE INDEX IF NOT EXISTS idx_subnational_breakdowns_activity_id ON public.subnational_breakdowns(activity_id);')
    console.log('')
    process.exit(1)
  } else {
    console.log('✅ Table exists and is accessible!')
    console.log('📊 Current records:', data)
  }
}

checkAndCreateTable().catch(console.error)
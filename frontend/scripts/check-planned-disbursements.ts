import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('=== planned_disbursements diagnostic ===\n')

  const { count: total, error: countErr } = await supabase
    .from('planned_disbursements')
    .select('*', { count: 'exact', head: true })

  if (countErr) {
    console.error('Error counting rows:', countErr)
    return
  }
  console.log(`Total rows: ${total}`)

  const { count: withProvider } = await supabase
    .from('planned_disbursements')
    .select('*', { count: 'exact', head: true })
    .not('provider_org_id', 'is', null)
  console.log(`Rows with non-null provider_org_id: ${withProvider}`)

  const { count: withProviderName } = await supabase
    .from('planned_disbursements')
    .select('*', { count: 'exact', head: true })
    .not('provider_org_name', 'is', null)
  console.log(`Rows with non-null provider_org_name (text): ${withProviderName}`)

  const { count: withReceiver } = await supabase
    .from('planned_disbursements')
    .select('*', { count: 'exact', head: true })
    .not('receiver_org_id', 'is', null)
  console.log(`Rows with non-null receiver_org_id: ${withReceiver}`)

  const { count: withUsdAmount } = await supabase
    .from('planned_disbursements')
    .select('*', { count: 'exact', head: true })
    .not('usd_amount', 'is', null)
  console.log(`Rows with non-null usd_amount: ${withUsdAmount}`)

  console.log('\n=== Sample rows ===')
  const { data: sample } = await supabase
    .from('planned_disbursements')
    .select('id, activity_id, amount, currency, usd_amount, period_start, period_end, provider_org_id, provider_org_name, receiver_org_id, receiver_org_name')
    .limit(5)
    .order('created_at', { ascending: false })

  sample?.forEach((r: any, i: number) => {
    console.log(`\n[${i + 1}]`)
    console.log(`  activity_id: ${r.activity_id}`)
    console.log(`  amount: ${r.amount} ${r.currency} (usd: ${r.usd_amount})`)
    console.log(`  period: ${r.period_start} → ${r.period_end}`)
    console.log(`  provider: id=${r.provider_org_id || 'NULL'}  name="${r.provider_org_name || 'NULL'}"`)
    console.log(`  receiver: id=${r.receiver_org_id || 'NULL'}  name="${r.receiver_org_name || 'NULL'}"`)
  })

  console.log('\n=== Top provider_org_names (text field) when id is null ===')
  const { data: nameCounts } = await supabase
    .from('planned_disbursements')
    .select('provider_org_name')
    .is('provider_org_id', null)
    .not('provider_org_name', 'is', null)
    .limit(50)

  const counts = new Map<string, number>()
  nameCounts?.forEach((r: any) => {
    if (r.provider_org_name) {
      counts.set(r.provider_org_name, (counts.get(r.provider_org_name) || 0) + 1)
    }
  })
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)
  sorted.forEach(([name, count]) => console.log(`  ${count}× "${name}"`))

  console.log('\n=== Activities with PDs (count) ===')
  const { count: activityCount } = await supabase
    .from('planned_disbursements')
    .select('activity_id', { count: 'exact', head: true })
  console.log(`Distinct activity_ids referenced (approx): ${activityCount}`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })

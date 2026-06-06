/**
 * One-off cleanup: delete all transactions for the CAPRED activity so it can be
 * re-imported cleanly. transaction_sector_lines cascade-delete via FK.
 * Usage: npx tsx scripts/cleanup-capred-transactions.ts
 */
import { getSupabaseAdmin } from '../src/lib/supabase';

async function main() {
  const supabase = getSupabaseAdmin();
  if (!supabase) { console.error('no admin client'); return; }

  // Find CAPRED activities (title may map to multiple draft imports)
  const { data: acts } = await supabase
    .from('activities')
    .select('id, title_narrative')
    .ilike('title_narrative', '%Resilient Economic Development%');

  for (const a of acts || []) {
    const { count: before } = await supabase
      .from('transactions').select('*', { count: 'exact', head: true }).eq('activity_id', a.id);
    if (!before) continue;
    const { error } = await supabase.from('transactions').delete().eq('activity_id', a.id);
    if (error) { console.error('delete failed for', a.id, error); continue; }
    await supabase
      .from('activities')
      .update({ sector_export_level: 'activity', sector_allocation_mode: 'activity' })
      .eq('id', a.id);
    console.log(`cleaned ${a.id}: ${before} -> 0, mode reset`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

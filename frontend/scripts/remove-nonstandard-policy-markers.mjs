/**
 * Remove all non-IATI-standard policy markers EXCEPT "Policy Marker A1".
 *
 * Keeps: the 12 official OECD-DAC / IATI v2.03 markers (is_iati_standard=true)
 *        + "Policy Marker A1" (the lone custom vocabulary=99 marker).
 * Removes: the leftover app-seeded custom markers (Human Rights, Peacebuilding,
 *        Rural Development, Private Sector, Digitalization, Rule of Law,
 *        Urban Development) — and their activity_policy_markers links.
 *
 * Backs everything up first. Run:
 *   node scripts/remove-nonstandard-policy-markers.mjs           (dry run)
 *   node scripts/remove-nonstandard-policy-markers.mjs --apply   (execute)
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

const APPLY = process.argv.includes('--apply')
const ROOT = path.resolve(process.cwd())
const envPath = fs.existsSync(path.join(ROOT, '.env.local'))
  ? path.join(ROOT, '.env.local')
  : path.join(ROOT, 'frontend', '.env.local')
const env = {}
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// keep these even though they aren't IATI standard
const KEEP_CODES = new Set(['A1'])

async function main() {
  console.log(APPLY ? '=== APPLY MODE ===\n' : '=== DRY RUN (pass --apply to execute) ===\n')

  const { data: markers, error } = await sb.from('policy_markers').select('*')
  if (error) throw error

  const toRemove = markers.filter(m => !m.is_iati_standard && !KEEP_CODES.has(m.code))
  if (toRemove.length === 0) { console.log('Nothing to remove.'); return }

  // Find affected links (by id or uuid form)
  const removeKeys = new Set(toRemove.flatMap(m => [String(m.id), String(m.uuid)]))
  const { data: allLinks } = await sb.from('activity_policy_markers').select('*')
  const affectedLinks = (allLinks || []).filter(l => removeKeys.has(String(l.policy_marker_id)))

  // Backup
  const backupPath = path.join(path.dirname(envPath), `policy-markers-removal-backup-2026-06-03.json`)
  fs.writeFileSync(backupPath, JSON.stringify({
    generatedAt: '2026-06-03',
    note: 'Backup before remove-nonstandard-policy-markers. Restore by re-inserting removed_markers and removed_links.',
    removed_markers: toRemove,
    removed_links: affectedLinks,
  }, null, 2))
  console.log(`Backup written: ${backupPath}\n`)

  console.log(`Markers to remove: ${toRemove.length}`)
  for (const m of toRemove) {
    const n = affectedLinks.filter(l => [String(m.id), String(m.uuid)].includes(String(l.policy_marker_id))).length
    console.log(`  - "${m.name}" (code=${m.code}) — ${n} activity link(s)`)
  }
  console.log(`Total activity links to delete: ${affectedLinks.length}`)

  if (!APPLY) { console.log('\nDry run only — re-run with --apply to execute.'); return }

  // Delete links first, then markers
  if (affectedLinks.length) {
    const linkIds = affectedLinks.map(l => l.id)
    for (let i = 0; i < linkIds.length; i += 100) {
      const batch = linkIds.slice(i, i + 100)
      const { error: e } = await sb.from('activity_policy_markers').delete().in('id', batch)
      if (e) throw e
    }
    console.log(`Deleted ${linkIds.length} activity links.`)
  }
  const markerIds = toRemove.map(m => m.id)
  const { error: e2 } = await sb.from('policy_markers').delete().in('id', markerIds)
  if (e2) {
    console.log(`⚠️  hard delete failed (${e2.message}); deactivating instead.`)
    await sb.from('policy_markers').update({ is_active: false }).in('id', markerIds)
  } else {
    console.log(`Deleted ${markerIds.length} policy markers.`)
  }
  console.log('\nApplied.')
}
main().catch(e => { console.error(e); process.exit(1) })

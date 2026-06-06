/**
 * Merge legacy (non-IATI-standard) policy markers into their IATI-standard
 * equivalents, then delete the now-empty legacy duplicates.
 *
 * Background: the app originally shipped text-coded "legacy" markers
 * (gender_equality, environment, …). The 12 official IATI-standard markers
 * (numeric iati_code 1–12) were added later, leaving ~9 concepts duplicated
 * with activity links split across both copies.
 *
 * This script:
 *   1. Backs up policy_markers + every affected activity_policy_markers row.
 *   2. For each legacy duplicate, repoints its activity links to the standard
 *      marker's UUID, de-duplicating per activity (keeps the higher significance).
 *   3. Deletes the legacy duplicate markers once they hold no links.
 *
 * Genuinely-custom legacy markers with no IATI equivalent (Human Rights,
 * Peacebuilding, Rural Development, Private Sector, Digitalization, Rule of Law,
 * Urban Development, Policy Marker A1) are left untouched.
 *
 * Run:  node scripts/merge-duplicate-policy-markers.mjs           (dry run)
 *       node scripts/merge-duplicate-policy-markers.mjs --apply   (execute)
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
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// legacy marker `code` -> standard marker `iati_code`
const MERGE_MAP = {
  gender_equality: '1',
  environment: '2',
  good_governance: '3',
  participatory_dev: '3',
  biodiversity: '5',
  climate_mitigation: '6',
  climate_adaptation: '7',
  disability: '11',
  nutrition: '12',
}

const log = (...a) => console.log(...a)

async function main() {
  log(APPLY ? '=== APPLY MODE ===' : '=== DRY RUN (pass --apply to execute) ===\n')

  const { data: markers, error: mErr } = await sb
    .from('policy_markers')
    .select('id, uuid, code, iati_code, name, vocabulary, is_iati_standard')
  if (mErr) throw mErr

  const stdByIati = new Map()
  for (const m of markers) if (m.is_iati_standard) stdByIati.set(String(m.iati_code), m)
  const legacyByCode = new Map()
  for (const m of markers) if (!m.is_iati_standard) legacyByCode.set(m.code, m)

  // Build the resolved merge plan
  const plan = []
  for (const [legacyCode, iati] of Object.entries(MERGE_MAP)) {
    const legacy = legacyByCode.get(legacyCode)
    const std = stdByIati.get(iati)
    if (!legacy) { log(`  skip: legacy "${legacyCode}" not found`); continue }
    if (!std) { log(`  skip: standard iati_code=${iati} not found`); continue }
    plan.push({ legacy, std })
  }

  // Pull all live links once
  const { data: links, error: lErr } = await sb
    .from('activity_policy_markers')
    .select('id, activity_id, policy_marker_id, significance')
    .is('deleted_at', null)
  if (lErr) throw lErr

  // Backup
  const stamp = '2026-06-03'
  const backupPath = path.join(path.dirname(envPath) === ROOT ? ROOT : path.join(ROOT, 'frontend'),
    `policy-markers-merge-backup-${stamp}.json`)
  const affectedLegacyKeys = new Set(plan.flatMap(p => [p.legacy.id, p.legacy.uuid].map(String)))
  const backup = {
    generatedAt: stamp,
    note: 'Backup before merge-duplicate-policy-markers. Restore by re-inserting deleted markers and resetting policy_marker_id/significance on listed link ids.',
    policy_markers: markers,
    affected_links: links.filter(l => affectedLegacyKeys.has(String(l.policy_marker_id))),
  }
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2))
  log(`Backup written: ${backupPath}\n`)

  const linksByActivity = new Map()
  for (const l of links) {
    if (!linksByActivity.has(l.activity_id)) linksByActivity.set(l.activity_id, [])
    linksByActivity.get(l.activity_id).push(l)
  }

  let repointed = 0, deduped = 0, sigBumped = 0, markersDeleted = 0

  for (const { legacy, std } of plan) {
    const legacyKeys = new Set([legacy.id, legacy.uuid].map(String))
    const stdKeys = new Set([std.id, std.uuid].map(String))
    const legacyLinks = links.filter(l => legacyKeys.has(String(l.policy_marker_id)))
    log(`\n• ${legacy.name} (legacy code=${legacy.code}) → ${std.name} (iati=${std.iati_code}): ${legacyLinks.length} link(s)`)

    for (const l of legacyLinks) {
      const sameActivity = linksByActivity.get(l.activity_id) || []
      const existingStd = sameActivity.find(x => stdKeys.has(String(x.policy_marker_id)) && x.id !== l.id)

      if (existingStd) {
        // Activity already linked to the standard marker → keep higher significance, drop legacy link
        const keepSig = Math.max(Number(l.significance ?? 0), Number(existingStd.significance ?? 0))
        if (Number(existingStd.significance ?? 0) < keepSig) {
          log(`    dedup ${l.activity_id}: bump std significance ${existingStd.significance} → ${keepSig}, delete legacy link`)
          if (APPLY) await sb.from('activity_policy_markers').update({ significance: keepSig, updated_at: new Date().toISOString() }).eq('id', existingStd.id)
          existingStd.significance = keepSig
          sigBumped++
        } else {
          log(`    dedup ${l.activity_id}: delete legacy link (std already sig ${existingStd.significance})`)
        }
        if (APPLY) await sb.from('activity_policy_markers').delete().eq('id', l.id)
        // remove from in-memory list so later legacy markers mapping to same std see it gone
        const arr = linksByActivity.get(l.activity_id)
        if (arr) linksByActivity.set(l.activity_id, arr.filter(x => x.id !== l.id))
        deduped++
      } else {
        // Repoint the legacy link to the standard marker's UUID
        log(`    repoint ${l.activity_id}: → ${std.name} (uuid)`)
        if (APPLY) await sb.from('activity_policy_markers').update({ policy_marker_id: std.uuid, updated_at: new Date().toISOString() }).eq('id', l.id)
        l.policy_marker_id = std.uuid
        repointed++
      }
    }

    // Delete the legacy marker (now linkless)
    log(`    remove legacy marker "${legacy.name}" (id=${legacy.id})`)
    if (APPLY) {
      const { error: delErr } = await sb.from('policy_markers').delete().eq('id', legacy.id)
      if (delErr) log(`      ⚠️  delete failed (${delErr.message}); deactivating instead`),
        await sb.from('policy_markers').update({ is_active: false }).eq('id', legacy.id)
    }
    markersDeleted++
  }

  log(`\n=== Summary ===`)
  log(`  links repointed:        ${repointed}`)
  log(`  links de-duplicated:    ${deduped}`)
  log(`  std significances bumped:${sigBumped}`)
  log(`  legacy markers removed:  ${markersDeleted}`)
  log(APPLY ? '\nApplied.' : '\nDry run only — re-run with --apply to execute.')
}

main().catch(e => { console.error(e); process.exit(1) })

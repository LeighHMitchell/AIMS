/**
 * IATI Auto-Sync Cron Route
 *
 * Runs daily at 2 AM UTC via Vercel Cron.
 * Fetches latest IATI data from the Datastore for activities with auto_sync=true,
 * compares with local data, and updates any that have changed.
 *
 * Activities with sync_status='outdated' (user edited locally) are skipped.
 *
 * Strategy: Batch by reporting_org_ref — group sync-enabled activities by their
 * reporting org, fetch all activities for each org from the Datastore in one
 * paginated query, then match locally.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  fetchActivitiesFromDatastore,
  syncSingleActivity,
  clearRateCache,
} from '@/lib/iati/sync-service'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

export async function GET(request: NextRequest) {
  // 1. Auth
  const authError = verifyCronSecret(request)
  if (authError) return authError

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    )
  }

  const IATI_API_KEY = process.env.IATI_API_KEY || process.env.NEXT_PUBLIC_IATI_API_KEY
  if (!IATI_API_KEY) {
    return NextResponse.json(
      { error: 'IATI API key not configured' },
      { status: 500 }
    )
  }

  console.log('[IATI Sync] Starting daily sync at', new Date().toISOString())

  // 2. Query sync-eligible activities
  //    auto_sync=true, sync_status != 'outdated', has iati_identifier
  //    Also fetch child record counts for change detection
  const { data: activities, error: queryError } = await supabase
    .from('activities')
    .select(`
      id,
      iati_identifier,
      reporting_org_ref,
      auto_sync_fields,
      sync_status,
      title_narrative,
      description_narrative,
      activity_status,
      planned_start_date,
      planned_end_date,
      actual_start_date,
      actual_end_date,
      recipient_countries
    `)
    .eq('auto_sync', true)
    .neq('sync_status', 'outdated')
    .not('iati_identifier', 'is', null)
    .limit(500) // Safety limit per run

  if (queryError) {
    console.error('[IATI Sync] Query error:', queryError.message)
    return NextResponse.json(
      { error: `Database query failed: ${queryError.message}` },
      { status: 500 }
    )
  }

  if (!activities?.length) {
    console.log('[IATI Sync] No activities to sync')
    return NextResponse.json({
      success: true,
      message: 'No activities to sync',
      synced: 0,
      total: 0,
    })
  }

  console.log(`[IATI Sync] Found ${activities.length} sync-eligible activities`)

  // Fetch child record counts for change detection
  // We do this in a single pass to avoid N+1 queries
  const activityIds = activities.map((a: any) => a.id)
  const countTables = [
    { table: 'transactions', key: '_txCount' },
    { table: 'activity_budgets', key: '_budgetCount' },
    { table: 'activity_sectors', key: '_sectorCount' },
    { table: 'activity_participating_organizations', key: '_orgCount' },
    { table: 'activity_locations', key: '_locationCount' },
    { table: 'activity_contacts', key: '_contactCount' },
    { table: 'activity_documents', key: '_documentCount' },
    { table: 'activity_policy_markers', key: '_policyMarkerCount' },
    { table: 'planned_disbursements', key: '_plannedDisbursementCount' },
  ]

  // Build a map of activity_id -> count metadata
  const countMap = new Map<string, Record<string, number>>()
  for (const id of activityIds) {
    countMap.set(id, {})
  }

  // Fetch counts for each child table in parallel
  await Promise.all(
    countTables.map(async ({ table, key }) => {
      try {
        // Query counts grouped by activity_id using individual count queries
        // (Supabase doesn't support GROUP BY well, so we batch with IN filter)
        for (let i = 0; i < activityIds.length; i += 100) {
          const batch = activityIds.slice(i, i + 100)
          const { data: rows } = await supabase
            .from(table)
            .select('activity_id')
            .in('activity_id', batch)

          if (rows) {
            // Count per activity
            const perActivity = new Map<string, number>()
            for (const row of rows) {
              perActivity.set(row.activity_id, (perActivity.get(row.activity_id) || 0) + 1)
            }
            perActivity.forEach((count, aid) => {
              const entry = countMap.get(aid)
              if (entry) entry[key] = count
            })
          }
        }
      } catch (err) {
        console.warn(`[IATI Sync] Error counting ${table}:`, err)
      }
    })
  )

  // Merge counts into activity objects
  for (const activity of activities) {
    const counts = countMap.get(activity.id) || {}
    Object.assign(activity, counts)
  }

  // 3. Group by reporting_org_ref
  const byOrg = new Map<string, typeof activities>()
  for (const a of activities) {
    const ref = a.reporting_org_ref
    if (!ref) continue
    if (!byOrg.has(ref)) byOrg.set(ref, [])
    byOrg.get(ref)!.push(a)
  }

  console.log(`[IATI Sync] Grouped into ${byOrg.size} reporting orgs`)

  // 4. Process each org with timeout guard
  const startTime = Date.now()
  const MAX_RUNTIME = 270_000 // 270s (leave 30s buffer before 300s timeout)
  let synced = 0
  let unchanged = 0
  let skipped = 0
  let failed = 0
  const errors: string[] = []

  // Clear USD rate cache at start of sync run
  clearRateCache()

  const orgEntries = Array.from(byOrg.entries())
  for (const [orgRef, orgActivities] of orgEntries) {
    if (Date.now() - startTime > MAX_RUNTIME) {
      console.log('[IATI Sync] Approaching timeout, stopping')
      break
    }

    try {
      // Fetch all activities for this org from the Datastore
      const iatiActivities = await fetchActivitiesFromDatastore(orgRef, IATI_API_KEY)
      const iatiMap = new Map(
        iatiActivities.map(a => [a.iatiIdentifier, a])
      )

      console.log(`[IATI Sync] Org ${orgRef}: ${iatiActivities.length} from Datastore, ${orgActivities.length} local`)

      // Sync each local activity
      for (const local of orgActivities) {
        if (Date.now() - startTime > MAX_RUNTIME) break

        const iatiData = iatiMap.get(local.iati_identifier)
        if (!iatiData) {
          skipped++
          continue
        }

        const result = await syncSingleActivity(
          supabase,
          local,
          iatiData,
          local.auto_sync_fields
        )

        switch (result.action) {
          case 'updated':
            synced++
            break
          case 'unchanged':
            unchanged++
            break
          case 'skipped':
            skipped++
            break
          case 'failed':
            failed++
            if (result.error) errors.push(result.error)
            break
        }

        // Log updated and failed results (skip unchanged to avoid noise)
        if (result.action === 'updated' || result.action === 'failed') {
          try {
            await supabase.from('iati_import_logs').insert({
              import_source: 'auto_sync',
              import_type: 'update_existing',
              import_status: result.action === 'failed' ? 'failed' : 'success',
              activity_id: local.id,
              iati_identifier: local.iati_identifier,
              activity_title: local.title_narrative || null,
              reporting_org_ref: orgRef,
              error_message: result.error || null,
              import_date: new Date().toISOString(),
            })
          } catch (logErr) {
            console.warn('[IATI Sync] Failed to write import log:', logErr)
          }
        }
      }
    } catch (err) {
      console.error(`[IATI Sync] Error processing org ${orgRef}:`, err)
      failed += orgActivities.length
      errors.push(`Org ${orgRef}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const duration = Date.now() - startTime
  console.log(`[IATI Sync] Complete: ${synced} synced, ${unchanged} unchanged, ${skipped} skipped, ${failed} failed (${duration}ms)`)

  // 5. Return summary
  return NextResponse.json({
    success: true,
    synced,
    unchanged,
    skipped,
    failed,
    total: activities.length,
    orgs_processed: byOrg.size,
    duration_ms: duration,
    ...(errors.length > 0 && { errors: errors.slice(0, 10) }),
  })
}

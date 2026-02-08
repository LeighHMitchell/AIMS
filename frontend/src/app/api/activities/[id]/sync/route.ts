import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  fetchSingleActivityFromDatastore,
  syncSingleActivity,
  clearRateCache,
} from '@/lib/iati/sync-service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/activities/[id]/sync
 * Trigger a manual sync for a single activity from the IATI Datastore.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { user, response: authResponse } = await requireAuth()
    if (authResponse) return authResponse

    const resolvedParams = await Promise.resolve(params)
    const { id } = resolvedParams

    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      )
    }

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

    // Fetch local activity
    const { data: activity, error: queryError } = await supabase
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
      .eq('id', id)
      .single()

    if (queryError || !activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      )
    }

    if (!activity.iati_identifier) {
      return NextResponse.json(
        { error: 'Activity has no IATI identifier' },
        { status: 400 }
      )
    }

    // Fetch child record counts for change detection
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

    await Promise.all(
      countTables.map(async ({ table, key }) => {
        try {
          const { data: rows } = await supabase
            .from(table)
            .select('activity_id')
            .eq('activity_id', id)

          ;(activity as any)[key] = rows?.length || 0
        } catch {
          ;(activity as any)[key] = 0
        }
      })
    )

    // Fetch from IATI Datastore
    let iatiActivity
    try {
      iatiActivity = await fetchSingleActivityFromDatastore(
        activity.iati_identifier,
        IATI_API_KEY
      )
    } catch (err) {
      return NextResponse.json(
        { error: `Failed to fetch from IATI Datastore: ${err instanceof Error ? err.message : String(err)}` },
        { status: 502 }
      )
    }

    if (!iatiActivity) {
      return NextResponse.json(
        { error: `Activity "${activity.iati_identifier}" not found in IATI Datastore` },
        { status: 404 }
      )
    }

    // Run the sync
    clearRateCache()
    const result = await syncSingleActivity(
      supabase,
      activity,
      iatiActivity,
      activity.auto_sync_fields
    )

    const lastSyncTime = new Date().toISOString()

    // Log to iati_import_logs
    try {
      await supabase.from('iati_import_logs').insert({
        import_source: 'manual_sync',
        import_type: 'update_existing',
        import_status: result.action === 'failed' ? 'failed' : 'success',
        activity_id: id,
        iati_identifier: activity.iati_identifier,
        activity_title: activity.title_narrative || null,
        reporting_org_ref: activity.reporting_org_ref || null,
        imported_by: user?.id || null,
        imported_by_email: user?.email || null,
        error_message: result.error || null,
        import_date: lastSyncTime,
      })
    } catch (logErr) {
      console.error('[Manual Sync] Failed to write import log:', logErr)
    }

    return NextResponse.json({
      success: result.action !== 'failed',
      action: result.action,
      fieldsChanged: result.fieldsChanged,
      error: result.error,
      lastSyncTime,
    })
  } catch (error) {
    console.error('[Manual Sync] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/activities/[id]/sync-history
 * Returns the last 20 sync log entries for an activity.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { supabase, response: authResponse } = await requireAuth()
    if (authResponse) return authResponse

    const resolvedParams = await Promise.resolve(params)
    const { id } = resolvedParams

    if (!id || !supabase) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      )
    }

    const { data: logs, error } = await supabase
      .from('iati_import_logs')
      .select('id, import_source, import_type, import_status, import_date, error_message, imported_by_email')
      .eq('activity_id', id)
      .in('import_source', ['manual_sync', 'auto_sync'])
      .order('import_date', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[Sync History] Query error:', error.message)
      return NextResponse.json(
        { error: 'Failed to fetch sync history' },
        { status: 500 }
      )
    }

    return NextResponse.json({ logs: logs || [] })
  } catch (error) {
    console.error('[Sync History] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

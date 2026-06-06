import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { CLINIC_ENTITIES, publicColumns, ClinicColumn } from '@/lib/data-clinic/entity-config'

function isMissing(col: ClinicColumn, value: any): boolean {
  if (col.type === 'money' || col.type === 'percent') {
    return value == null || value === '' || Number(value) === 0 || Number.isNaN(Number(value))
  }
  return value == null || value === ''
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth()
  if (authResponse) return authResponse
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { entity } = await params
  const config = CLINIC_ENTITIES[entity]
  if (!config) {
    return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 404 })
  }

  try {
    let query = supabase.from(config.table).select(config.select).limit(500)

    // Exclude recycle-bin rows: the child's own deleted_at (if it has one) and
    // always the parent activity's deleted_at via the inner join.
    if (config.hasOwnDeletedAt) {
      query = query.is('deleted_at', null)
    }
    query = query.is('activities.deleted_at', null)

    const { data, error } = await query
    if (error) {
      console.error(`[data-clinic/entity/${entity}] query error:`, error)
      return NextResponse.json(
        { error: 'Failed to fetch data', details: error.message },
        { status: 500 }
      )
    }

    const gapColumns = config.columns.filter((c) => c.gap)

    const rows = (data || [])
      .map((raw: any) => config.mapRow(raw))
      .filter((row: Record<string, any>) =>
        gapColumns.some((col) => isMissing(col, row[col.key]))
      )

    return NextResponse.json({
      label: config.label,
      columns: publicColumns(config),
      rows,
      total: rows.length,
    })
  } catch (err) {
    console.error(`[data-clinic/entity/${entity}] error:`, err)
    return NextResponse.json(
      { error: 'Failed to fetch data', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    )
  }
}

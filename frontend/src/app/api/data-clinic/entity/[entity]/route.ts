import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { CLINIC_ENTITIES, publicColumns, ClinicColumn } from '@/lib/data-clinic/entity-config'

/** Inline-edit a single editable field on one row. */
export async function PATCH(
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

  const body = await request.json().catch(() => ({}))
  const { id, field, value, orgId, orgName } = body as {
    id?: string; field?: string; value?: any; orgId?: string; orgName?: string
  }
  if (!id || !field) {
    return NextResponse.json({ error: 'id and field are required' }, { status: 400 })
  }

  // Org columns: link by setting the id + canonical name (both DB columns).
  const orgCol = config.columns.find((c) => c.key === field && c.type === 'org' && c.orgIdField && c.orgNameField)
  let update: Record<string, any>
  if (orgCol) {
    update = {
      [orgCol.orgIdField as string]: orgId || null,
      [orgCol.orgNameField as string]: orgName ?? null,
    }
  } else {
    // Only allow updating columns explicitly marked editable.
    const col = config.columns.find((c) => c.key === field && c.editable)
    if (!col) {
      return NextResponse.json({ error: `Field not editable: ${field}` }, { status: 400 })
    }
    let dbValue: any = value === '' || value == null ? null : value
    if (col.editor === 'number' && dbValue != null) {
      const n = Number(dbValue)
      dbValue = Number.isNaN(n) ? null : n
    }
    update = { [field]: dbValue }
  }

  const { error } = await supabase
    .from(config.table)
    .update(update)
    .eq('id', id)

  if (error) {
    console.error(`[data-clinic/entity/${entity}] update error:`, error)
    return NextResponse.json({ error: 'Failed to update', details: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

function isMissing(col: ClinicColumn, row: Record<string, any>): boolean {
  const value = row[col.key]
  if (col.type === 'org') {
    // present if linked by id OR has a free-text name
    return !row[`${col.key}_id`] && (value == null || value === '')
  }
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
        gapColumns.some((col) => isMissing(col, row))
      )

    if (config.enrich) {
      await config.enrich(rows, supabase)
    }

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

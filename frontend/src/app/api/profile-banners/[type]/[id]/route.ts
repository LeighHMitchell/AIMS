import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const VALID_TYPES = ['sdg', 'sector', 'location', 'policy_marker', 'tag'] as const

// Columns that hold per-profile customizations alongside the banner.
const OPTIONAL_COLS = ['description', 'color', 'icon'] as const

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth()
  if (authResponse) return authResponse

  const { type, id } = await params

  if (!VALID_TYPES.includes(type as any)) {
    return NextResponse.json({ error: 'Invalid profile type' }, { status: 400 })
  }

  const { data, error } = await supabase!
    .from('profile_banners')
    .select('banner, banner_position, description, color, icon')
    .eq('profile_type', type)
    .eq('profile_id', id)
    .maybeSingle()

  if (error) {
    // Tolerate the description/color/icon migration not being run yet
    if (/(description|color|icon)/i.test(error.message) && /(does not exist|schema cache)/i.test(error.message)) {
      const fallback = await supabase!
        .from('profile_banners')
        .select('banner, banner_position')
        .eq('profile_type', type)
        .eq('profile_id', id)
        .maybeSingle()
      return NextResponse.json(fallback.data || { banner: null, banner_position: 50 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || { banner: null, banner_position: 50, description: null, color: null, icon: null })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth()
  if (authResponse) return authResponse

  const { type, id } = await params

  if (!VALID_TYPES.includes(type as any)) {
    return NextResponse.json({ error: 'Invalid profile type' }, { status: 400 })
  }

  // Super-user gate — profile customizations are an admin capability.
  const { data: profile } = await supabase!.from('users').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'super_user') {
    return NextResponse.json({ error: 'Only super users can edit profiles' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  // Build a partial patch from only the keys present in the body, so a banner
  // save never wipes the description and vice-versa.
  const patch: Record<string, any> = {}
  if ('banner' in body) patch.banner = body.banner ?? null
  if ('banner_position' in body) patch.banner_position = body.banner_position ?? 50
  for (const col of OPTIONAL_COLS) {
    if (col in body) patch[col] = body[col] ?? null
  }
  patch.updated_by = user!.id
  patch.updated_at = new Date().toISOString()

  const runUpsertOrUpdate = async (data: Record<string, any>) => {
    // Update existing row if present (preserves untouched columns), else insert.
    const { data: existing } = await supabase!
      .from('profile_banners')
      .select('id')
      .eq('profile_type', type)
      .eq('profile_id', id)
      .maybeSingle()

    if (existing) {
      return supabase!
        .from('profile_banners')
        .update(data)
        .eq('id', existing.id)
        .select('banner, banner_position, description, color, icon')
        .single()
    }
    return supabase!
      .from('profile_banners')
      .insert({ profile_type: type, profile_id: id, ...data })
      .select('banner, banner_position, description, color, icon')
      .single()
  }

  let { data, error } = await runUpsertOrUpdate(patch)

  // Graceful fallback if the description/color/icon migration hasn't run yet
  if (error && /(description|color|icon)/i.test(error.message) && /(does not exist|schema cache)/i.test(error.message)) {
    const stripped = { ...patch }
    for (const col of OPTIONAL_COLS) delete stripped[col]
    const { data: existing } = await supabase!
      .from('profile_banners').select('id').eq('profile_type', type).eq('profile_id', id).maybeSingle()
    const res = existing
      ? await supabase!.from('profile_banners').update(stripped).eq('id', existing.id).select('banner, banner_position').single()
      : await supabase!.from('profile_banners').insert({ profile_type: type, profile_id: id, ...stripped }).select('banner, banner_position').single()
    data = res.data as any
    error = res.error
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

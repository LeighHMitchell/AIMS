import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const VALID_TYPES = ['sdg', 'sector', 'location'] as const

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
    .select('banner, banner_position')
    .eq('profile_type', type)
    .eq('profile_id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || { banner: null, banner_position: 50 })
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

  const body = await request.json()
  const { banner, banner_position } = body

  const { data, error } = await supabase!
    .from('profile_banners')
    .upsert(
      {
        profile_type: type,
        profile_id: id,
        banner: banner ?? null,
        banner_position: banner_position ?? 50,
        updated_by: user!.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'profile_type,profile_id' }
    )
    .select('banner, banner_position')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

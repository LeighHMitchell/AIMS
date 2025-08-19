import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[AIMS] PUT /api/users/[id] - Starting request for user:', params.id)
  
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    console.log('[AIMS] PUT /api/users/[id] - Update data:', body)
    
    // Update user profile (using existing database columns)
    const updateData: any = {
      first_name: body.first_name,
      last_name: body.last_name,
      role: body.role,
      organization_id: body.organization_id,
      organisation: body.organisation,
      department: body.department,
      telephone: body.telephone,
      website: body.website,
      mailing_address: body.mailing_address,
      updated_at: new Date().toISOString()
    }

    // Add optional fields that exist in the database schema
    if (body.title !== undefined) updateData.title = body.title === 'none' ? null : body.title
    if (body.middle_name !== undefined) updateData.middle_name = body.middle_name
    if (body.job_title !== undefined) updateData.job_title = body.job_title
    if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url
    
    // Try to add contact fields - they may exist from migrations
    try {
      if (body.contact_type !== undefined) updateData.contact_type = body.contact_type === 'none' ? null : body.contact_type
      if (body.secondary_email !== undefined) updateData.secondary_email = body.secondary_email
      if (body.secondary_phone !== undefined) updateData.secondary_phone = body.secondary_phone
      if (body.fax_number !== undefined) updateData.fax_number = body.fax_number
      if (body.notes !== undefined) updateData.notes = body.notes
    } catch (error) {
      console.log('[API] Some contact fields not available yet:', error)
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()
    
    if (error) {
      console.error('[AIMS] Error updating user profile:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    console.log('[AIMS] Updated user in Supabase:', data.email)
    return NextResponse.json(data, { status: 200 })
    
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[AIMS] DELETE /api/users/[id] - Starting request for user:', params.id)
  
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      )
    }

    // First, delete the user profile
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('id', params.id)
    
    if (profileError) {
      console.error('[AIMS] Error deleting user profile:', profileError)
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      )
    }
    
    // Then delete the auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(params.id)
    
    if (authError) {
      console.error('[AIMS] Error deleting auth user:', authError)
      // Profile is already deleted, so we'll continue
    }
    
    console.log('[AIMS] Deleted user:', params.id)
    return NextResponse.json({ success: true }, { status: 200 })
    
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}

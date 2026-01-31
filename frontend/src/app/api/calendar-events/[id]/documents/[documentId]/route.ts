import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// DELETE - Remove a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { supabase, user, response: authResponse } = await requireAuth()
    if (authResponse) return authResponse
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: eventId, documentId } = await params

    // Create service role client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get the document to verify ownership and get storage path
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('calendar_event_documents')
      .select('*, calendar_events!inner(organizer_id)')
      .eq('id', documentId)
      .eq('event_id', eventId)
      .single()

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if user can delete (uploader, event organizer, or admin)
    const isUploader = document.uploaded_by_id === user.id
    const isOrganizer = document.calendar_events?.organizer_id === user.id
    const isAdmin = user.role === 'admin'

    if (!isUploader && !isOrganizer && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized to delete this document' }, { status: 403 })
    }

    // Delete from storage
    const { error: storageError } = await supabaseAdmin.storage
      .from('calendar-documents')
      .remove([document.storage_path])

    if (storageError) {
      console.error('Storage delete error:', storageError)
      // Continue anyway to delete the record
    }

    // Delete the document record
    const { error: deleteError } = await supabaseAdmin
      .from('calendar_event_documents')
      .delete()
      .eq('id', documentId)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Document deleted successfully' })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Get a signed download URL for a document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { supabase, response: authResponse } = await requireAuth()
    if (authResponse) return authResponse

    const { id: eventId, documentId } = await params

    // Create service role client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get the document
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('calendar_event_documents')
      .select('*')
      .eq('id', documentId)
      .eq('event_id', eventId)
      .single()

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Generate a signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('calendar-documents')
      .createSignedUrl(document.storage_path, 3600)

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError)
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
    }

    return NextResponse.json({
      downloadUrl: signedUrlData.signedUrl,
      fileName: document.file_name
    })
  } catch (error) {
    console.error('Error getting download URL:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

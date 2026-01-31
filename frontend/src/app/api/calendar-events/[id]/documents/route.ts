import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// GET - List documents for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, response: authResponse } = await requireAuth()
    if (authResponse) return authResponse

    const { id: eventId } = await params

    const { data: documents, error } = await supabase
      .from('calendar_event_documents')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching documents:', error)
      throw error
    }

    // Transform to camelCase
    const transformedDocuments = documents?.map((doc: any) => ({
      id: doc.id,
      eventId: doc.event_id,
      fileName: doc.file_name,
      fileType: doc.file_type,
      fileSize: doc.file_size,
      fileUrl: doc.file_url,
      storagePath: doc.storage_path,
      uploadedById: doc.uploaded_by_id,
      uploadedByName: doc.uploaded_by_name,
      documentType: doc.document_type,
      description: doc.description,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at
    })) || []

    return NextResponse.json({ documents: transformedDocuments })
  } catch (error) {
    console.error('Error in documents API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Upload a document to an event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user, response: authResponse } = await requireAuth()
    if (authResponse) return authResponse
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: eventId } = await params

    // Verify the event exists
    const { data: event, error: eventError } = await supabase
      .from('calendar_events')
      .select('id, organizer_id')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Parse the multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const documentType = formData.get('documentType') as string || 'other'
    const description = formData.get('description') as string || ''

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Allowed: PDF, Word, Excel, PowerPoint, text, CSV, and images'
      }, { status: 400 })
    }

    // Create service role client for storage operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Generate unique file path
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `calendar-events/${eventId}/${timestamp}-${sanitizedFileName}`

    // Upload file to storage
    const fileBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabaseAdmin.storage
      .from('calendar-documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      // If bucket doesn't exist, try to create it
      if (uploadError.message.includes('bucket') || uploadError.message.includes('not found')) {
        // Try creating the bucket
        await supabaseAdmin.storage.createBucket('calendar-documents', {
          public: false,
          fileSizeLimit: 10485760 // 10MB
        })

        // Retry upload
        const { error: retryError } = await supabaseAdmin.storage
          .from('calendar-documents')
          .upload(storagePath, fileBuffer, {
            contentType: file.type,
            upsert: false
          })

        if (retryError) {
          console.error('Retry upload error:', retryError)
          return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
        }
      } else {
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
      }
    }

    // Get the public URL (or signed URL for private buckets)
    const { data: urlData } = supabaseAdmin.storage
      .from('calendar-documents')
      .getPublicUrl(storagePath)

    const fileUrl = urlData.publicUrl

    // Get user's name
    const userName = user.name ||
      (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}`.trim() : null) ||
      user.email ||
      'Unknown'

    // Insert document record
    const { data: document, error: insertError } = await supabaseAdmin
      .from('calendar_event_documents')
      .insert({
        event_id: eventId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_url: fileUrl,
        storage_path: storagePath,
        uploaded_by_id: user.id,
        uploaded_by_name: userName,
        document_type: documentType,
        description: description || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      // Clean up uploaded file
      await supabaseAdmin.storage.from('calendar-documents').remove([storagePath])
      return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 })
    }

    // Transform response
    const transformedDocument = {
      id: document.id,
      eventId: document.event_id,
      fileName: document.file_name,
      fileType: document.file_type,
      fileSize: document.file_size,
      fileUrl: document.file_url,
      storagePath: document.storage_path,
      uploadedById: document.uploaded_by_id,
      uploadedByName: document.uploaded_by_name,
      documentType: document.document_type,
      description: document.description,
      createdAt: document.created_at,
      updatedAt: document.updated_at
    }

    return NextResponse.json({
      message: 'Document uploaded successfully',
      document: transformedDocument
    })
  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

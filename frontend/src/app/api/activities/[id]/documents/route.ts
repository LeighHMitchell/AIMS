import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Fetch documents for an activity
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const activityId = params.id;

    // Query documents directly (bypassing the function for now)
    const { data: documents, error } = await supabase
      .from('activity_documents')
      .select('*')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching activity documents:', error);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    // Transform to IATI DocumentLink format for frontend compatibility
    const iatiDocuments = documents.map((doc: any) => ({
      url: doc.url,
      format: doc.format,
      title: doc.title || [{ text: doc.file_name || 'Untitled', lang: 'en' }],
      description: doc.description || [{ text: '', lang: 'en' }],
      categoryCode: doc.category_code,
      languageCodes: doc.language_codes || ['en'],
      documentDate: doc.document_date || undefined,
      recipientCountries: doc.recipient_countries || [],
      thumbnailUrl: doc.thumbnail_url,
      isImage: doc.format?.startsWith('image/') || false,
      // Metadata for frontend
      _id: doc.id,
      _fileName: doc.file_name,
      _fileSize: doc.file_size,
      _isExternal: doc.is_external,
      _createdAt: doc.created_at,
      _updatedAt: doc.updated_at,
      _uploadedBy: doc.uploaded_by_email,
      _uploadedByName: doc.uploaded_by_name,
    }));

    return NextResponse.json({
      documents: iatiDocuments,
      count: documents.length
    });

  } catch (error) {
    console.error('Activity documents API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add a new document (external URL or metadata for uploaded file)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const activityId = params.id;
    const body = await request.json();

    // TODO: Add authentication when auth pattern is established
    const user = { id: 'system' }; // Temporary user for development

    // Validate required fields
    if (!body.url || !body.format || !body.title || !body.categoryCode) {
      return NextResponse.json({ 
        error: 'Missing required fields: url, format, title, categoryCode' 
      }, { status: 400 });
    }

    // Check if user has permission to add documents to this activity
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select(`
        id,
        created_by,
        activity_contributors(user_id, role)
      `)
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    const hasPermission = activity.created_by === user.id ||
      (activity.activity_contributors && activity.activity_contributors.some((contrib: any) => 
        contrib.user_id === user.id && ['editor', 'admin'].includes(contrib.role)
      ));

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Prepare document data
    const documentData = {
      activity_id: activityId,
      url: body.url,
      format: body.format,
      title: body.title, // Should be JSONB array of narratives
      description: body.description || [{ text: '', lang: 'en' }],
      category_code: body.categoryCode,
      language_codes: body.languageCodes || ['en'],
      document_date: body.documentDate || null,
      recipient_countries: body.recipientCountries || [],
      file_name: body.fileName || null,
      file_size: body.fileSize || 0,
      file_path: body.filePath || null,
      thumbnail_url: body.thumbnailUrl || null,
      is_external: body.isExternal || false,
      uploaded_by: user.id
    };

    // Insert document record
    const { data: document, error: dbError } = await supabase
      .from('activity_documents')
      .insert(documentData)
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 });
    }

    // Return the created document in IATI format
    const iatiDocument = {
      url: document.url,
      format: document.format,
      title: document.title,
      description: document.description,
      categoryCode: document.category_code,
      languageCodes: document.language_codes,
      documentDate: document.document_date,
      recipientCountries: document.recipient_countries,
      thumbnailUrl: document.thumbnail_url,
      isImage: document.format?.startsWith('image/') || false,
      // Metadata
      _id: document.id,
      _fileName: document.file_name,
      _fileSize: document.file_size,
      _isExternal: document.is_external,
      _createdAt: document.created_at,
      _updatedAt: document.updated_at,
    };

    return NextResponse.json({
      document: iatiDocument,
      message: 'Document added successfully'
    });

  } catch (error) {
    console.error('Add document API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update an existing document
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const activityId = params.id;
    const body = await request.json();

    // TODO: Add authentication when auth pattern is established
    const user = { id: 'system' }; // Temporary user for development

    if (!body.documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Check if document exists and user has permission
    const { data: existingDoc, error: fetchError } = await supabase
      .from('activity_documents')
      .select(`
        *,
        activities!inner(created_by, activity_contributors(user_id, role))
      `)
      .eq('id', body.documentId)
      .eq('activity_id', activityId)
      .single();

    if (fetchError || !existingDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const activity = existingDoc.activities;
    const hasPermission = activity.created_by === user.id ||
      existingDoc.uploaded_by === user.id ||
      (activity.activity_contributors && activity.activity_contributors.some((contrib: any) => 
        contrib.user_id === user.id && ['editor', 'admin'].includes(contrib.role)
      ));

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Prepare update data (only include fields that are provided)
    const updateData: any = {};
    if (body.url !== undefined) updateData.url = body.url;
    if (body.format !== undefined) updateData.format = body.format;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.categoryCode !== undefined) updateData.category_code = body.categoryCode;
    if (body.languageCodes !== undefined) updateData.language_codes = body.languageCodes;
    if (body.documentDate !== undefined) updateData.document_date = body.documentDate;
    if (body.recipientCountries !== undefined) updateData.recipient_countries = body.recipientCountries;
    if (body.thumbnailUrl !== undefined) updateData.thumbnail_url = body.thumbnailUrl;

    // Update document record
    const { data: document, error: updateError } = await supabase
      .from('activity_documents')
      .update(updateData)
      .eq('id', body.documentId)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
    }

    // Return updated document in IATI format
    const iatiDocument = {
      url: document.url,
      format: document.format,
      title: document.title,
      description: document.description,
      categoryCode: document.category_code,
      languageCodes: document.language_codes,
      documentDate: document.document_date,
      recipientCountries: document.recipient_countries,
      thumbnailUrl: document.thumbnail_url,
      isImage: document.format?.startsWith('image/') || false,
      // Metadata
      _id: document.id,
      _fileName: document.file_name,
      _fileSize: document.file_size,
      _isExternal: document.is_external,
      _createdAt: document.created_at,
      _updatedAt: document.updated_at,
    };

    return NextResponse.json({
      document: iatiDocument,
      message: 'Document updated successfully'
    });

  } catch (error) {
    console.error('Update document API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const activityId = params.id;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // TODO: Add authentication when auth pattern is established
    const user = { id: 'system' }; // Temporary user for development

    // Check if document exists and user has permission
    const { data: existingDoc, error: fetchError } = await supabase
      .from('activity_documents')
      .select(`
        *,
        activities!inner(created_by, activity_contributors(user_id, role))
      `)
      .eq('id', documentId)
      .eq('activity_id', activityId)
      .single();

    if (fetchError || !existingDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const activity = existingDoc.activities;
    const hasPermission = activity.created_by === user.id ||
      existingDoc.uploaded_by === user.id ||
      (activity.activity_contributors && activity.activity_contributors.some((contrib: any) => 
        contrib.user_id === user.id && ['admin'].includes(contrib.role)
      ));

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // If it's an uploaded file, delete from storage
    if (!existingDoc.is_external && existingDoc.file_path) {
      const { error: storageError } = await supabase.storage
        .from('activity-documents')
        .remove([existingDoc.file_path]);

      if (storageError) {
        console.warn('Failed to delete file from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete document record
    const { error: deleteError } = await supabase
      .from('activity_documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      console.error('Database delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Delete document API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

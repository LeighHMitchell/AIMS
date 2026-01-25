import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { generatePdfThumbnailBuffer } from '@/lib/pdf-thumbnail-generator';

export const dynamic = 'force-dynamic';

// Helper to check if user is a super user or admin
async function isSuperUser(supabase: any, userId: string): Promise<boolean> {
  const { data: user, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !user) return false;
  return user.role === 'super_user' || user.role === 'admin';
}

// POST - Upload a standalone library document (super users only)
export async function POST(request: NextRequest) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase || !user) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Check if user is a super user
    const hasPermission = await isSuperUser(supabase, user.id);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Only super users can upload library documents' },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const isExternal = formData.get('isExternal') === 'true';
    const externalUrl = formData.get('url') as string | null;
    
    // Metadata from form
    const titleJson = formData.get('title') as string | null;
    const descriptionJson = formData.get('description') as string | null;
    const categoryCode = formData.get('categoryCode') as string | null;
    const languageCodesJson = formData.get('languageCodes') as string | null;
    const documentDate = formData.get('documentDate') as string | null;
    const recipientCountriesJson = formData.get('recipientCountries') as string | null;
    const organizationId = formData.get('organizationId') as string | null;
    const format = formData.get('format') as string | null;

    // Parse JSON fields
    let title: Array<{ text: string; lang: string }> = [];
    let description: Array<{ text: string; lang: string }> = [];
    let languageCodes: string[] = ['en'];
    let recipientCountries: string[] = [];

    try {
      if (titleJson) title = JSON.parse(titleJson);
      if (descriptionJson) description = JSON.parse(descriptionJson);
      if (languageCodesJson) languageCodes = JSON.parse(languageCodesJson);
      if (recipientCountriesJson) recipientCountries = JSON.parse(recipientCountriesJson);
    } catch (parseError) {
      console.error('[Library Upload] Error parsing JSON fields:', parseError);
    }

    // Validate: either file or external URL required
    if (!file && !externalUrl) {
      return NextResponse.json(
        { error: 'Either a file or external URL is required' },
        { status: 400 }
      );
    }

    // Validate title
    if (!title || title.length === 0) {
      // Use filename or URL as default title
      const defaultTitle = file?.name?.replace(/\.[^/.]+$/, '') || externalUrl || 'Untitled';
      title = [{ text: defaultTitle, lang: 'en' }];
    }

    let url: string;
    let fileSize = 0;
    let fileName: string | null = null;
    let filePath: string | null = null;
    let fileFormat: string;
    let thumbnailUrl: string | null = null;
    let thumbnailPath: string | null = null;

    if (isExternal && externalUrl) {
      // External URL document
      url = externalUrl;
      fileFormat = format || 'application/octet-stream';
      
      // Try to infer format from URL if not provided
      if (!format) {
        const urlLower = externalUrl.toLowerCase();
        if (urlLower.endsWith('.pdf')) fileFormat = 'application/pdf';
        else if (urlLower.endsWith('.doc')) fileFormat = 'application/msword';
        else if (urlLower.endsWith('.docx')) fileFormat = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (urlLower.endsWith('.xls')) fileFormat = 'application/vnd.ms-excel';
        else if (urlLower.endsWith('.xlsx')) fileFormat = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        else if (urlLower.endsWith('.jpg') || urlLower.endsWith('.jpeg')) fileFormat = 'image/jpeg';
        else if (urlLower.endsWith('.png')) fileFormat = 'image/png';
      }
    } else if (file) {
      // File upload
      
      // Validate file size (50MB limit)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: 'File size exceeds 50MB limit' },
          { status: 400 }
        );
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/svg+xml',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'application/json',
        'application/xml',
        'text/xml',
        'video/mp4',
        'video/webm',
        'audio/mpeg',
        'audio/wav',
        'application/zip',
      ];

      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Unsupported file type' },
          { status: 400 }
        );
      }

      // Generate unique filename and storage path
      const uniqueId = uuidv4();
      const fileExtension = file.name.split('.').pop() || 'bin';
      const storagePath = `library/${uniqueId}.${fileExtension}`;

      console.log('[Library Upload] Attempting upload:', {
        userId: user.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        storagePath,
        bucket: 'library-documents'
      });

      // Convert file to ArrayBuffer and Buffer for upload and thumbnail generation
      const fileArrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(fileArrayBuffer);

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('library-documents')
        .upload(storagePath, buffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('[Library Upload] Storage upload error:', {
          message: uploadError.message,
          name: uploadError.name,
          cause: uploadError.cause,
          stack: uploadError.stack,
          fullError: JSON.stringify(uploadError, null, 2)
        });
        return NextResponse.json(
          { error: 'Failed to upload file to storage', details: uploadError.message },
          { status: 500 }
        );
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('library-documents')
        .getPublicUrl(storagePath);

      url = urlData.publicUrl;
      fileSize = file.size;
      fileName = file.name;
      filePath = storagePath;
      fileFormat = file.type;

      // Generate thumbnail for PDFs
      if (file.type === 'application/pdf') {
        try {
          console.log('[Library Upload] Generating PDF thumbnail...');
          const thumbnailBuffer = await generatePdfThumbnailBuffer(buffer, {
            width: 300,
            height: 400,
            quality: 85,
          });

          if (thumbnailBuffer) {
            // Upload thumbnail to storage
            const thumbnailStoragePath = `library/thumbnails/${uniqueId}_thumb.jpg`;

            const { error: thumbUploadError } = await supabase.storage
              .from('library-documents')
              .upload(thumbnailStoragePath, thumbnailBuffer, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: false,
              });

            if (!thumbUploadError) {
              const { data: thumbUrlData } = supabase.storage
                .from('library-documents')
                .getPublicUrl(thumbnailStoragePath);

              thumbnailUrl = thumbUrlData.publicUrl;
              thumbnailPath = thumbnailStoragePath;
              console.log('[Library Upload] Thumbnail generated:', thumbnailUrl);
            } else {
              console.error('[Library Upload] Thumbnail upload error:', thumbUploadError);
            }
          }
        } catch (thumbError) {
          console.error('[Library Upload] Thumbnail generation failed:', thumbError);
          // Continue without thumbnail - not a critical error
        }
      }

      // Generate thumbnail for images (just resize the original)
      if (file.type.startsWith('image/') && !file.type.includes('svg')) {
        try {
          console.log('[Library Upload] Generating image thumbnail...');
          const sharp = (await import('sharp')).default;
          const thumbnailBuffer = await sharp(buffer)
            .resize(300, 400, {
              fit: 'inside',
              withoutEnlargement: false,
            })
            .jpeg({ quality: 85 })
            .toBuffer();

          // Upload thumbnail to storage
          const thumbnailStoragePath = `library/thumbnails/${uniqueId}_thumb.jpg`;

          const { error: thumbUploadError } = await supabase.storage
            .from('library-documents')
            .upload(thumbnailStoragePath, thumbnailBuffer, {
              contentType: 'image/jpeg',
              cacheControl: '3600',
              upsert: false,
            });

          if (!thumbUploadError) {
            const { data: thumbUrlData } = supabase.storage
              .from('library-documents')
              .getPublicUrl(thumbnailStoragePath);

            thumbnailUrl = thumbUrlData.publicUrl;
            thumbnailPath = thumbnailStoragePath;
            console.log('[Library Upload] Thumbnail generated:', thumbnailUrl);
          } else {
            console.error('[Library Upload] Thumbnail upload error:', thumbUploadError);
          }
        } catch (thumbError) {
          console.error('[Library Upload] Image thumbnail generation failed:', thumbError);
          // Continue without thumbnail - not a critical error
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid upload configuration' },
        { status: 400 }
      );
    }

    // Create document record in database
    const documentData: Record<string, any> = {
      url,
      format: fileFormat,
      title,
      description: description.length > 0 ? description : null,
      category_code: categoryCode || null,
      language_codes: languageCodes,
      document_date: documentDate || null,
      recipient_countries: recipientCountries.length > 0 ? recipientCountries : null,
      file_name: fileName,
      file_size: fileSize,
      file_path: filePath,
      is_external: isExternal,
      organization_id: organizationId || null,
      uploaded_by: user.id,
    };

    // Add thumbnail fields if generated
    if (thumbnailUrl) {
      documentData.thumbnail_url = thumbnailUrl;
    }
    if (thumbnailPath) {
      documentData.thumbnail_path = thumbnailPath;
    }

    const { data: document, error: dbError } = await supabase
      .from('library_documents')
      .insert(documentData)
      .select(`
        *,
        organizations:organization_id(id, name, acronym)
      `)
      .single();

    if (dbError) {
      console.error('[Library Upload] Database insert error:', dbError);

      // Clean up uploaded files if database insert fails
      const filesToRemove: string[] = [];
      if (filePath) {
        filesToRemove.push(filePath);
      }
      if (thumbnailPath) {
        filesToRemove.push(thumbnailPath);
      }
      if (filesToRemove.length > 0) {
        await supabase.storage
          .from('library-documents')
          .remove(filesToRemove);
      }

      return NextResponse.json(
        { error: 'Failed to save document record', details: dbError.message },
        { status: 500 }
      );
    }

    // Extract title for response
    const primaryTitle = title.find(t => t.lang === 'en')?.text || title[0]?.text || 'Untitled';

    return NextResponse.json({
      success: true,
      document: {
        id: `standalone-${document.id}`,
        url: document.url,
        format: document.format,
        title: primaryTitle,
        titleNarratives: document.title,
        description: description[0]?.text,
        descriptionNarratives: document.description,
        categoryCode: document.category_code,
        languageCodes: document.language_codes,
        documentDate: document.document_date,
        recipientCountries: document.recipient_countries,
        fileName: document.file_name,
        fileSize: document.file_size,
        isExternal: document.is_external,
        thumbnailUrl: document.thumbnail_url || null,
        sourceType: 'standalone',
        sourceId: document.id,
        sourceName: 'Library',
        linkedEntities: [],
        reportingOrgId: document.organization_id,
        reportingOrgName: document.organizations?.name || document.organizations?.acronym,
        createdAt: document.created_at,
        updatedAt: document.updated_at,
      },
    });
  } catch (error) {
    console.error('[Library Upload] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { generatePdfThumbnail } from '@/lib/thumbnail-generator';
import { writeFile, mkdir, unlink, rmdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Create Supabase client with service role key for file uploads
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Maximum file size for PDF downloads (10MB)
const MAX_PDF_SIZE = 10 * 1024 * 1024;

// Download timeout (30 seconds)
const DOWNLOAD_TIMEOUT = 30000;

export async function POST(request: NextRequest) {
  try {
    const { url, activityId } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return NextResponse.json(
          { error: 'URL must use http:// or https://' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Check if it's likely a PDF (by extension or content-type)
    const isLikelyPdf = 
      url.toLowerCase().endsWith('.pdf') ||
      url.toLowerCase().includes('application/pdf') ||
      url.toLowerCase().includes('pdf');

    if (!isLikelyPdf) {
      return NextResponse.json(
        { error: 'URL must point to a PDF file' },
        { status: 400 }
      );
    }

    // Validate Supabase configuration
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase storage not configured' },
        { status: 500 }
      );
    }

    // Create Supabase client with service role for file operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download PDF with timeout
    let pdfBuffer: Buffer;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AIMS-ThumbnailGenerator/1.0)',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
      }

      // Check content type
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/pdf') && !url.toLowerCase().endsWith('.pdf')) {
        return NextResponse.json(
          { error: 'URL does not appear to be a PDF file' },
          { status: 400 }
        );
      }

      // Check file size
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > MAX_PDF_SIZE) {
        return NextResponse.json(
          { error: `PDF file is too large (max ${MAX_PDF_SIZE / 1024 / 1024}MB)` },
          { status: 400 }
        );
      }

      // Read response as buffer
      const arrayBuffer = await response.arrayBuffer();
      pdfBuffer = Buffer.from(arrayBuffer);

      if (pdfBuffer.length > MAX_PDF_SIZE) {
        return NextResponse.json(
          { error: `PDF file is too large (max ${MAX_PDF_SIZE / 1024 / 1024}MB)` },
          { status: 400 }
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Download timeout - PDF took too long to download' },
          { status: 408 }
        );
      }
      if (error instanceof Error) {
        return NextResponse.json(
          { error: `Failed to download PDF: ${error.message}` },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to download PDF' },
        { status: 500 }
      );
    }

    // Create temporary directory for PDF processing
    const tempDir = join(process.cwd(), 'temp', 'pdf-thumbnails');
    await mkdir(tempDir, { recursive: true });
    
    const tempPdfPath = join(tempDir, `pdf_${uuidv4()}.pdf`);

    try {
      // Write PDF to temporary file
      await writeFile(tempPdfPath, pdfBuffer);

      // Generate thumbnail using existing function
      const thumbnailResult = await generatePdfThumbnail(tempPdfPath, tempDir);

      if (!thumbnailResult) {
        throw new Error('Thumbnail generation returned no result');
      }

      // Upload thumbnail to Supabase Storage
      const thumbnailBuffer = await require('fs').promises.readFile(thumbnailResult.thumbnailPath);
      const thumbnailStoragePath = `documents/${activityId || 'external'}/thumbnails/thumb_${uuidv4()}.jpg`;

      const { data: thumbUploadData, error: thumbUploadError } = await supabase.storage
        .from('uploads')
        .upload(thumbnailStoragePath, thumbnailBuffer, {
          cacheControl: '3600',
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (thumbUploadError) {
        console.error('Supabase thumbnail upload error:', thumbUploadError);
        // Continue with local thumbnail URL as fallback
        return NextResponse.json({
          thumbnailUrl: thumbnailResult.thumbnailUrl,
          warning: 'Thumbnail generated but failed to upload to storage',
        });
      }

      // Get public URL for uploaded thumbnail
      const { data: thumbUrlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(thumbnailStoragePath);

      // Clean up temporary files
      await unlink(tempPdfPath);
      await unlink(thumbnailResult.thumbnailPath);

      return NextResponse.json({
        thumbnailUrl: thumbUrlData.publicUrl,
      });

    } catch (error) {
      // Clean up temp PDF file on error
      try {
        if (existsSync(tempPdfPath)) {
          await unlink(tempPdfPath);
        }
      } catch (cleanupError) {
        console.warn('Failed to clean up temp PDF file:', cleanupError);
      }

      // Clean up temp directory
      try {
        if (existsSync(tempDir)) {
          const files = await require('fs').promises.readdir(tempDir);
          for (const file of files) {
            try {
              await unlink(join(tempDir, file));
            } catch {
              // Ignore individual file cleanup errors
            }
          }
        }
      } catch (cleanupError) {
        console.warn('Failed to clean up temp directory:', cleanupError);
      }

      if (error instanceof Error) {
        return NextResponse.json(
          { error: `Failed to generate thumbnail: ${error.message}` },
          { status: 500 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate thumbnail' },
      { status: 500 }
    );
  }
}

// Add OPTIONS method for CORS if needed
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}








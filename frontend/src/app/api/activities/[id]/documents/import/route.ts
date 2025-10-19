import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Import activity-level document links from XML
 * This handles bulk import of document links parsed from IATI XML
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not available' }, { status: 500 });
  }

  try {
    const activityId = params.id;
    const { documents } = await request.json();

    console.log(`[Document Import API] Starting import for activity: ${activityId}`);
    console.log(`[Document Import API] Documents count: ${documents?.length || 0}`);

    // Validation
    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    if (!documents || !Array.isArray(documents)) {
      return NextResponse.json({ 
        error: 'Documents array is required',
        details: 'Body must contain a "documents" array'
      }, { status: 400 });
    }

    if (documents.length === 0) {
      return NextResponse.json({ 
        success: 0, 
        failed: 0, 
        errors: [],
        message: 'No documents to import'
      });
    }

    // Verify activity exists
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id')
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    const results = { success: 0, failed: 0, errors: [] as any[] };

    // Process each document
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      
      try {
        // Validate required fields
        if (!doc.url || !doc.url.trim()) {
          results.failed++;
          results.errors.push({ 
            index: i + 1, 
            url: doc.url || 'missing', 
            error: 'Missing or empty URL' 
          });
          continue;
        }

        // Prepare document data for insertion
        const documentData = {
          activity_id: activityId,
          url: doc.url.trim(),
          format: doc.format || 'application/octet-stream',
          // Convert title string to JSONB narrative array
          title: doc.title 
            ? [{ text: doc.title, lang: doc.language_code || 'en' }]
            : [{ text: 'Document', lang: 'en' }],
          // Convert description string to JSONB narrative array
          description: doc.description 
            ? [{ text: doc.description, lang: doc.language_code || 'en' }]
            : [],
          category_code: doc.category_code || 'A01', // Default to "Pre- and post-project impact appraisal"
          language_codes: [doc.language_code || 'en'],
          document_date: doc.document_date || null,
          recipient_countries: [],
          is_external: true,
          uploaded_by: null, // System import, no specific user
          file_name: null,
          file_size: 0,
          file_path: null,
          thumbnail_url: null
        };

        console.log(`[Document Import API] Inserting document ${i + 1}:`, {
          url: documentData.url,
          format: documentData.format,
          category: documentData.category_code
        });

        // Insert document into database
        const { error: insertError } = await supabase
          .from('activity_documents')
          .insert(documentData);

        if (insertError) {
          console.error(`[Document Import API] Error inserting document ${i + 1}:`, insertError);
          results.failed++;
          results.errors.push({ 
            index: i + 1, 
            url: doc.url, 
            error: insertError.message || 'Database insertion failed'
          });
        } else {
          results.success++;
          console.log(`[Document Import API] Successfully inserted document ${i + 1}`);
        }
      } catch (docError: any) {
        console.error(`[Document Import API] Exception processing document ${i + 1}:`, docError);
        results.failed++;
        results.errors.push({ 
          index: i + 1, 
          url: doc.url || 'unknown', 
          error: docError.message || 'Processing error'
        });
      }
    }

    console.log(`[Document Import API] Import complete: ${results.success} succeeded, ${results.failed} failed`);

    return NextResponse.json({
      success: results.success,
      failed: results.failed,
      errors: results.errors,
      message: `Imported ${results.success} of ${documents.length} documents`
    });

  } catch (error: any) {
    console.error('[Document Import API] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
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


import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { DOCUMENT_CATEGORIES } from '@/lib/iatiDocumentLink';

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

// Helper to extract title from JSONB
function extractTitle(titleData: any): string {
  if (!titleData) return 'Untitled';
  if (typeof titleData === 'string') return titleData;
  if (Array.isArray(titleData)) {
    const enNarrative = titleData.find((n: any) => n.lang === 'en');
    if (enNarrative?.text) return enNarrative.text;
    if (titleData[0]?.text) return titleData[0].text;
  }
  if (typeof titleData === 'object' && titleData.en) return titleData.en;
  return 'Untitled';
}

// Helper to get category name from code
function getCategoryName(code: string | null | undefined): string | undefined {
  if (!code) return undefined;
  const category = DOCUMENT_CATEGORIES.find(c => c.code === code);
  return category?.name;
}

// Parse document ID to get source type and actual ID
function parseDocumentId(id: string): { sourceType: string; actualId: string } | null {
  const parts = id.split('-');
  if (parts.length < 2) return null;
  
  const sourceType = parts[0];
  const actualId = parts.slice(1).join('-');
  
  return { sourceType, actualId };
}

// GET - Fetch a single document by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const { id } = await params;
    const parsed = parseDocumentId(id);
    
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid document ID format' }, { status: 400 });
    }

    const { sourceType, actualId } = parsed;

    let document: any = null;

    switch (sourceType) {
      case 'standalone':
        const { data: standaloneDoc, error: standaloneError } = await supabase
          .from('library_documents')
          .select(`
            *,
            organizations:organization_id(id, name, acronym),
            users:uploaded_by(id, email, raw_user_meta_data)
          `)
          .eq('id', actualId)
          .single();

        if (standaloneError || !standaloneDoc) {
          return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        const user = standaloneDoc.users;
        const userName = user?.raw_user_meta_data
          ? `${user.raw_user_meta_data.first_name || ''} ${user.raw_user_meta_data.last_name || ''}`.trim()
          : undefined;

        document = {
          id,
          url: standaloneDoc.url,
          format: standaloneDoc.format,
          title: extractTitle(standaloneDoc.title),
          titleNarratives: standaloneDoc.title,
          description: extractTitle(standaloneDoc.description),
          descriptionNarratives: standaloneDoc.description,
          categoryCode: standaloneDoc.category_code,
          categoryName: getCategoryName(standaloneDoc.category_code),
          languageCodes: standaloneDoc.language_codes,
          documentDate: standaloneDoc.document_date,
          recipientCountries: standaloneDoc.recipient_countries,
          fileName: standaloneDoc.file_name,
          fileSize: standaloneDoc.file_size,
          filePath: standaloneDoc.file_path,
          isExternal: standaloneDoc.is_external,
          sourceType: 'standalone',
          sourceId: standaloneDoc.id,
          sourceName: 'Library',
          linkedEntities: [],
          uploadedBy: standaloneDoc.uploaded_by,
          uploadedByEmail: user?.email,
          uploadedByName: userName,
          reportingOrgId: standaloneDoc.organization_id,
          reportingOrgName: standaloneDoc.organizations?.name || standaloneDoc.organizations?.acronym,
          createdAt: standaloneDoc.created_at,
          updatedAt: standaloneDoc.updated_at,
        };
        break;

      case 'activity':
        const { data: activityDoc, error: activityError } = await supabase
          .from('activity_documents')
          .select(`
            *,
            activities:activity_id(
              id,
              title_narrative,
              reporting_org_id,
              organizations:reporting_org_id(id, name, acronym)
            )
          `)
          .eq('id', actualId)
          .single();

        if (activityError || !activityDoc) {
          return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        document = {
          id,
          url: activityDoc.url,
          format: activityDoc.format,
          title: extractTitle(activityDoc.title),
          titleNarratives: activityDoc.title,
          description: extractTitle(activityDoc.description),
          descriptionNarratives: activityDoc.description,
          categoryCode: activityDoc.category_code,
          categoryName: getCategoryName(activityDoc.category_code),
          languageCodes: activityDoc.language_codes,
          documentDate: activityDoc.document_date,
          recipientCountries: activityDoc.recipient_countries,
          fileName: activityDoc.file_name,
          fileSize: activityDoc.file_size,
          filePath: activityDoc.file_path,
          isExternal: activityDoc.is_external,
          thumbnailUrl: activityDoc.thumbnail_url,
          sourceType: 'activity',
          sourceId: activityDoc.activity_id,
          sourceName: activityDoc.activities?.title_narrative || 'Unknown Activity',
          sourceUrl: `/activities/${activityDoc.activity_id}`,
          linkedEntities: [{
            type: 'activity',
            id: activityDoc.activity_id,
            name: activityDoc.activities?.title_narrative || 'Unknown Activity',
            url: `/activities/${activityDoc.activity_id}`
          }],
          reportingOrgId: activityDoc.activities?.reporting_org_id,
          reportingOrgName: activityDoc.activities?.organizations?.name,
          createdAt: activityDoc.created_at,
          updatedAt: activityDoc.updated_at,
        };
        break;

      case 'transaction':
        const { data: transactionDoc, error: transactionError } = await supabase
          .from('transaction_documents')
          .select(`
            *,
            transactions:transaction_id(
              uuid,
              ref,
              activity_id,
              activities:activity_id(
                id,
                title_narrative,
                reporting_org_id,
                organizations:reporting_org_id(id, name, acronym)
              )
            )
          `)
          .eq('id', actualId)
          .single();

        if (transactionError || !transactionDoc) {
          return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        const transaction = transactionDoc.transactions;
        const txActivity = transaction?.activities;

        document = {
          id,
          url: transactionDoc.file_url || transactionDoc.external_url || '',
          format: transactionDoc.file_type || 'application/octet-stream',
          title: transactionDoc.file_name || 'Untitled',
          description: transactionDoc.description,
          fileName: transactionDoc.file_name,
          fileSize: transactionDoc.file_size,
          isExternal: !!transactionDoc.external_url,
          sourceType: 'transaction',
          sourceId: transactionDoc.transaction_id,
          sourceName: transaction?.ref || `Transaction`,
          sourceUrl: txActivity?.id ? `/activities/${txActivity.id}?tab=transactions` : undefined,
          linkedEntities: [{
            type: 'transaction',
            id: transactionDoc.transaction_id,
            name: transaction?.ref || 'Transaction',
            url: txActivity?.id ? `/activities/${txActivity.id}?tab=transactions` : undefined
          }],
          reportingOrgId: txActivity?.reporting_org_id,
          reportingOrgName: txActivity?.organizations?.name,
          createdAt: transactionDoc.created_at,
          updatedAt: transactionDoc.updated_at,
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Unsupported document source type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('[Library GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update a standalone library document (super users only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase || !user) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const { id } = await params;
    const parsed = parseDocumentId(id);

    if (!parsed) {
      return NextResponse.json({ error: 'Invalid document ID format' }, { status: 400 });
    }

    const { sourceType, actualId } = parsed;

    // Only standalone documents can be updated through this API
    if (sourceType !== 'standalone') {
      return NextResponse.json(
        { error: 'Only standalone library documents can be updated through this API' },
        { status: 400 }
      );
    }

    // Check if user is a super user
    const hasPermission = await isSuperUser(supabase, user.id);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Only super users can update library documents' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updateData: any = {};

    // Build update data from allowed fields
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.categoryCode !== undefined) updateData.category_code = body.categoryCode;
    if (body.languageCodes !== undefined) updateData.language_codes = body.languageCodes;
    if (body.documentDate !== undefined) updateData.document_date = body.documentDate || null;
    if (body.recipientCountries !== undefined) updateData.recipient_countries = body.recipientCountries;
    if (body.organizationId !== undefined) updateData.organization_id = body.organizationId || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: document, error: updateError } = await supabase
      .from('library_documents')
      .update(updateData)
      .eq('id', actualId)
      .select(`
        *,
        organizations:organization_id(id, name, acronym)
      `)
      .single();

    if (updateError) {
      console.error('[Library PATCH] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update document', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      document: {
        id,
        url: document.url,
        format: document.format,
        title: extractTitle(document.title),
        titleNarratives: document.title,
        description: extractTitle(document.description),
        descriptionNarratives: document.description,
        categoryCode: document.category_code,
        categoryName: getCategoryName(document.category_code),
        languageCodes: document.language_codes,
        documentDate: document.document_date,
        recipientCountries: document.recipient_countries,
        fileName: document.file_name,
        fileSize: document.file_size,
        isExternal: document.is_external,
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
    console.error('[Library PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a standalone library document (super users only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase || !user) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const { id } = await params;
    const parsed = parseDocumentId(id);

    if (!parsed) {
      return NextResponse.json({ error: 'Invalid document ID format' }, { status: 400 });
    }

    const { sourceType, actualId } = parsed;

    // Only standalone documents can be deleted through this API
    if (sourceType !== 'standalone') {
      return NextResponse.json(
        { error: 'Only standalone library documents can be deleted through this API. Other documents must be deleted from their source.' },
        { status: 400 }
      );
    }

    // Check if user is a super user
    const hasPermission = await isSuperUser(supabase, user.id);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Only super users can delete library documents' },
        { status: 403 }
      );
    }

    // Get document to check for file path
    const { data: document, error: fetchError } = await supabase
      .from('library_documents')
      .select('*')
      .eq('id', actualId)
      .single();

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete file from storage if it's not external
    if (!document.is_external && document.file_path) {
      const { error: storageError } = await supabase.storage
        .from('library-documents')
        .remove([document.file_path]);

      if (storageError) {
        console.warn('[Library DELETE] Failed to delete file from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete document record
    const { error: deleteError } = await supabase
      .from('library_documents')
      .delete()
      .eq('id', actualId);

    if (deleteError) {
      console.error('[Library DELETE] Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete document', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('[Library DELETE] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

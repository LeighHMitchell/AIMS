/**
 * Bulk IATI Import API Route
 * Creates multiple new activities from IATI XML with selected indices
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { IATIXMLParser } from '@/lib/xml-parser';

interface BulkImportRequest {
  xmlContent: string;
  activityIndices: number[];
  createNew: boolean;
}

interface BulkImportResponse {
  success: boolean;
  created?: number;
  updated?: number;
  activityIds?: string[];
  errors?: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse<BulkImportResponse>> {
  try {
    console.log('[Bulk IATI Import] Starting bulk import');
    
    const body: BulkImportRequest = await request.json();
    const { xmlContent, activityIndices, createNew } = body;

    // Validate request
    if (!xmlContent || !activityIndices || activityIndices.length === 0) {
      return NextResponse.json({
        success: false,
        errors: ['Missing required fields: xmlContent and activityIndices']
      }, { status: 400 });
    }

    console.log('[Bulk IATI Import] Importing', activityIndices.length, 'activities');

    // Initialize results
    const results: BulkImportResponse = {
      success: true,
      created: 0,
      updated: 0,
      activityIds: [],
      errors: []
    };

    const supabase = getSupabaseAdmin();

    // Parse XML
    let parser: IATIXMLParser;
    try {
      parser = new IATIXMLParser(xmlContent);
    } catch (error) {
      console.error('[Bulk IATI Import] Failed to parse XML:', error);
      return NextResponse.json({
        success: false,
        errors: ['Failed to parse XML: ' + (error instanceof Error ? error.message : 'Unknown error')]
      }, { status: 400 });
    }

    // Process each selected activity
    for (const activityIndex of activityIndices) {
      try {
        console.log(`[Bulk IATI Import] Processing activity at index ${activityIndex}`);
        
        // Parse the specific activity
        const parsedActivity = parser.parseActivityByIndex(activityIndex);
        console.log(`[Bulk IATI Import] Parsed activity:`, parsedActivity.iatiIdentifier, parsedActivity.title);

        // Check if activity already exists
        const { data: existingActivity } = await supabase
          .from('activities')
          .select('id')
          .eq('iati_id', parsedActivity.iatiIdentifier)
          .single();

        if (existingActivity && !createNew) {
          // Update existing activity
          console.log(`[Bulk IATI Import] Updating existing activity:`, existingActivity.id);
          
          const { error: updateError } = await supabase
            .from('activities')
            .update({
              title: parsedActivity.title || 'Untitled Activity',
              description: parsedActivity.description,
              activity_status: parsedActivity.activityStatus,
              planned_start_date: parsedActivity.plannedStartDate,
              planned_end_date: parsedActivity.plannedEndDate,
              actual_start_date: parsedActivity.actualStartDate,
              actual_end_date: parsedActivity.actualEndDate,
              default_currency: parsedActivity.defaultCurrency,
              collaboration_type: parsedActivity.collaborationType,
              activity_scope: parsedActivity.activityScope,
              language: parsedActivity.language,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingActivity.id);

          if (updateError) {
            console.error(`[Bulk IATI Import] Failed to update activity:`, updateError);
            results.errors?.push(`Failed to update activity ${parsedActivity.iatiIdentifier}: ${updateError.message}`);
          } else {
            results.updated = (results.updated || 0) + 1;
            results.activityIds?.push(existingActivity.id);
          }

        } else {
          // Create new activity
          console.log(`[Bulk IATI Import] Creating new activity for:`, parsedActivity.iatiIdentifier);
          
          const { data: newActivity, error: createError } = await supabase
            .from('activities')
            .insert({
              iati_id: parsedActivity.iatiIdentifier,
              title: parsedActivity.title || 'Untitled Activity',
              description: parsedActivity.description,
              activity_status: parsedActivity.activityStatus,
              planned_start_date: parsedActivity.plannedStartDate,
              planned_end_date: parsedActivity.plannedEndDate,
              actual_start_date: parsedActivity.actualStartDate,
              actual_end_date: parsedActivity.actualEndDate,
              default_currency: parsedActivity.defaultCurrency,
              collaboration_type: parsedActivity.collaborationType,
              activity_scope: parsedActivity.activityScope,
              language: parsedActivity.language,
              reporting_org_ref: parsedActivity.reportingOrg?.ref,
              reporting_org_name: parsedActivity.reportingOrg?.narrative,
              reporting_org_type: parsedActivity.reportingOrg?.type,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (createError) {
            console.error(`[Bulk IATI Import] Failed to create activity:`, createError);
            results.errors?.push(`Failed to create activity ${parsedActivity.iatiIdentifier}: ${createError.message}`);
          } else if (newActivity) {
            console.log(`[Bulk IATI Import] Created activity with ID:`, newActivity.id);
            results.created = (results.created || 0) + 1;
            results.activityIds?.push(newActivity.id);

            // Import related data for the new activity
            try {
              // Import sectors
              if (parsedActivity.sectors && parsedActivity.sectors.length > 0) {
                console.log(`[Bulk IATI Import] Importing ${parsedActivity.sectors.length} sectors for activity ${newActivity.id}`);
                
                const sectorsToInsert = parsedActivity.sectors.map((sector: any) => ({
                  activity_id: newActivity.id,
                  code: sector.code,
                  name: sector.name,
                  percentage: sector.percentage || 100,
                  vocabulary: sector.vocabulary || '1',
                  vocabulary_uri: sector.vocabularyUri
                }));

                const { error: sectorsError } = await supabase
                  .from('activity_sectors')
                  .insert(sectorsToInsert);

                if (sectorsError) {
                  console.error(`[Bulk IATI Import] Failed to import sectors:`, sectorsError);
                }
              }

              // Import recipient countries
              if (parsedActivity.recipientCountries && parsedActivity.recipientCountries.length > 0) {
                console.log(`[Bulk IATI Import] Importing ${parsedActivity.recipientCountries.length} countries for activity ${newActivity.id}`);
                
                const countriesToInsert = parsedActivity.recipientCountries.map((country: any) => ({
                  activity_id: newActivity.id,
                  country_code: country.code,
                  percentage: country.percentage || 100
                }));

                const { error: countriesError } = await supabase
                  .from('activity_recipient_countries')
                  .insert(countriesToInsert);

                if (countriesError) {
                  console.error(`[Bulk IATI Import] Failed to import countries:`, countriesError);
                }
              }

              // Import transactions
              if (parsedActivity.transactions && parsedActivity.transactions.length > 0) {
                console.log(`[Bulk IATI Import] Importing ${parsedActivity.transactions.length} transactions for activity ${newActivity.id}`);
                
                const transactionsToInsert = parsedActivity.transactions.map((transaction: any) => ({
                  activity_id: newActivity.id,
                  type: transaction.type,
                  date: transaction.date,
                  value: transaction.value,
                  currency: transaction.currency || parsedActivity.defaultCurrency,
                  description: transaction.description,
                  provider_org_ref: transaction.providerOrg?.ref,
                  provider_org_name: transaction.providerOrg?.name,
                  receiver_org_ref: transaction.receiverOrg?.ref,
                  receiver_org_name: transaction.receiverOrg?.name,
                  flow_type: transaction.flowType,
                  finance_type: transaction.financeType,
                  aid_type: transaction.aidType,
                  tied_status: transaction.tiedStatus
                }));

                const { error: transactionsError } = await supabase
                  .from('transactions')
                  .insert(transactionsToInsert);

                if (transactionsError) {
                  console.error(`[Bulk IATI Import] Failed to import transactions:`, transactionsError);
                }
              }

            } catch (relatedDataError) {
              console.error(`[Bulk IATI Import] Error importing related data:`, relatedDataError);
              results.errors?.push(`Failed to import related data for ${parsedActivity.iatiIdentifier}`);
            }
          }
        }

      } catch (activityError) {
        console.error(`[Bulk IATI Import] Error processing activity at index ${activityIndex}:`, activityError);
        results.errors?.push(`Error processing activity at index ${activityIndex}: ${activityError instanceof Error ? activityError.message : 'Unknown error'}`);
      }
    }

    // Determine overall success
    results.success = (results.errors?.length || 0) === 0;

    console.log('[Bulk IATI Import] Completed:', results);

    return NextResponse.json(results, { 
      status: results.success ? 200 : 207 // 207 Multi-Status for partial success
    });

  } catch (error) {
    console.error('[Bulk IATI Import] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      errors: ['Unexpected error: ' + (error instanceof Error ? error.message : 'Unknown error')]
    }, { status: 500 });
  }
}


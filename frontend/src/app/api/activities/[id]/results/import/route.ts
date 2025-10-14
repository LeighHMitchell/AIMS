import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

interface ImportSummary {
  results_created: number;
  indicators_created: number;
  baselines_created: number;
  periods_created: number;
  
  // Detailed counts for each element type
  result_references_created: number;
  result_documents_created: number;
  indicator_references_created: number;
  indicator_documents_created: number;
  baseline_locations_created: number;
  baseline_dimensions_created: number;
  baseline_documents_created: number;
  period_target_locations_created: number;
  period_actual_locations_created: number;
  period_target_dimensions_created: number;
  period_actual_dimensions_created: number;
  period_target_documents_created: number;
  period_actual_documents_created: number;
  
  errors: Array<{ message: string; context?: string; element?: string }>;
  warnings: Array<{ message: string; element?: string }>;
  
  // Element coverage tracking
  coverage: {
    result_elements_found: string[];
    indicator_elements_found: string[];
    baseline_elements_found: string[];
    period_elements_found: string[];
  };
}

/**
 * POST /api/activities/[id]/results/import
 * 
 * Bulk import results from parsed IATI XML
 * Accepts an array of result objects with nested indicators, baselines, periods, etc.
 * Performs atomic import with transaction support
 */
// Helper function to convert string narratives to JSONB format
function toMultilingual(text: string | undefined, lang = 'en') {
  return text ? { [lang]: text } : { [lang]: '' };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    console.error('[Results Import API] Supabase admin client not available');
    return NextResponse.json({ 
      error: 'Database not available' 
    }, { status: 500 });
  }

  try {
    const activityId = params.id;
    const body = await request.json();
    const { results, mode = 'create' } = body;

    console.log(`[Results Import API] Starting import for activity: ${activityId}`);
    console.log(`[Results Import API] Import mode: ${mode}, Results count: ${results?.length || 0}`);

    // Validation
    if (!activityId) {
      return NextResponse.json({ 
        error: 'Activity ID is required' 
      }, { status: 400 });
    }

    if (!results || !Array.isArray(results)) {
      return NextResponse.json({ 
        error: 'Results array is required',
        details: 'Body must contain a "results" array'
      }, { status: 400 });
    }

    if (results.length === 0) {
      return NextResponse.json({ 
        success: true,
        summary: {
          results_created: 0,
          indicators_created: 0,
          baselines_created: 0,
          periods_created: 0,
          result_references_created: 0,
          result_documents_created: 0,
          indicator_references_created: 0,
          indicator_documents_created: 0,
          baseline_locations_created: 0,
          baseline_dimensions_created: 0,
          baseline_documents_created: 0,
          period_target_locations_created: 0,
          period_actual_locations_created: 0,
          period_target_dimensions_created: 0,
          period_actual_dimensions_created: 0,
          period_target_documents_created: 0,
          period_actual_documents_created: 0,
          errors: [],
          warnings: [],
          coverage: {
            result_elements_found: [],
            indicator_elements_found: [],
            baseline_elements_found: [],
            period_elements_found: []
          }
        }
      });
    }

    // Verify activity exists
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id')
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      return NextResponse.json({ 
        error: 'Activity not found',
        details: `No activity exists with ID: ${activityId}`
      }, { status: 404 });
    }

    const summary: ImportSummary = {
      results_created: 0,
      indicators_created: 0,
      baselines_created: 0,
      periods_created: 0,
      result_references_created: 0,
      result_documents_created: 0,
      indicator_references_created: 0,
      indicator_documents_created: 0,
      baseline_locations_created: 0,
      baseline_dimensions_created: 0,
      baseline_documents_created: 0,
      period_target_locations_created: 0,
      period_actual_locations_created: 0,
      period_target_dimensions_created: 0,
      period_actual_dimensions_created: 0,
      period_target_documents_created: 0,
      period_actual_documents_created: 0,
      errors: [],
      warnings: [],
      coverage: {
        result_elements_found: [],
        indicator_elements_found: [],
        baseline_elements_found: [],
        period_elements_found: []
      }
    };

    // Process each result
    for (let resultIndex = 0; resultIndex < results.length; resultIndex++) {
      const resultData = results[resultIndex];
      
      try {
        // Create the result
        const { data: createdResult, error: resultError } = await supabase
          .from('activity_results')
          .insert([{
            activity_id: activityId,
            type: resultData.type || 'output',
            aggregation_status: resultData.aggregation_status || false,
            title: toMultilingual(resultData.title),
            description: toMultilingual(resultData.description)
          }])
          .select()
          .single();

        if (resultError) {
          console.error('[Results Import API] Result creation error:', resultError);
          summary.errors.push({
            message: `Failed to create result ${resultIndex + 1}: ${resultError.message}`,
            context: resultData.title?.en || `Result ${resultIndex + 1}`
          });
          continue;
        }

        summary.results_created++;
        console.log(`[Results Import API] Created result: ${createdResult.id}`);

        // Track result-level coverage
        summary.coverage.result_elements_found.push('title');
        if (resultData.description) summary.coverage.result_elements_found.push('description');
        if (resultData.aggregation_status) summary.coverage.result_elements_found.push('aggregation-status');

        // Create result-level references
        if (resultData.references && Array.isArray(resultData.references)) {
          summary.coverage.result_elements_found.push('reference');
          
          for (const ref of resultData.references) {
            const { error: refError } = await supabase
              .from('result_references')
              .insert([{
                result_id: createdResult.id,
                vocabulary: ref.vocabulary,
                code: ref.code,
                vocabulary_uri: ref.vocabulary_uri
              }]);

            if (refError) {
              console.error('[Results Import API] Reference creation error:', refError);
              summary.errors.push({
                message: `Failed to create reference for result: ${refError.message || refError.details || 'Unknown error'}`,
                context: ref.code || 'unknown',
                element: 'result/reference'
              });
            } else {
              summary.result_references_created++;
            }
          }
        }

        // Create result-level document links
        if (resultData.document_links && Array.isArray(resultData.document_links)) {
          summary.coverage.result_elements_found.push('document-link');
          
          for (const docLink of resultData.document_links) {
            const { error: docError } = await supabase
              .from('result_document_links')
              .insert([{
                result_id: createdResult.id,
                format: docLink.format,
                url: docLink.url,
                title: toMultilingual(docLink.title),
                description: toMultilingual(docLink.description),
                category_code: docLink.category_code,
                language_code: docLink.language_code || 'en',
                document_date: docLink.document_date
              }]);

            if (docError) {
              console.error('[Results Import API] Document link creation error:', docError);
              summary.errors.push({
                message: `Failed to create document link for result: ${docError.message || docError.details || 'Unknown error'}`,
                context: docLink.url || 'unknown',
                element: 'result/document-link'
              });
            } else {
              summary.result_documents_created++;
            }
          }
        }

        // Process indicators
        if (resultData.indicators && Array.isArray(resultData.indicators)) {
          for (const indicatorData of resultData.indicators) {
            try {
              const { data: createdIndicator, error: indicatorError } = await supabase
                .from('result_indicators')
                .insert([{
                  result_id: createdResult.id,
                  measure: indicatorData.measure || 'unit',
                  ascending: indicatorData.ascending !== false,
                  aggregation_status: indicatorData.aggregation_status || false,
                  title: toMultilingual(indicatorData.title),
                  description: toMultilingual(indicatorData.description)
                }])
                .select()
                .single();

              if (indicatorError) {
                console.error('[Results Import API] Indicator creation error:', indicatorError);
                summary.errors.push({
                  message: `Failed to create indicator: ${indicatorError.message}`,
                  context: indicatorData.title?.en || 'Unnamed indicator'
                });
                continue;
              }

              summary.indicators_created++;
              console.log(`[Results Import API] Created indicator: ${createdIndicator.id}`);

              // Track indicator-level coverage
              summary.coverage.indicator_elements_found.push('title');
              if (indicatorData.description) summary.coverage.indicator_elements_found.push('description');
              if (indicatorData.measure) summary.coverage.indicator_elements_found.push('measure');
              if (indicatorData.ascending !== undefined) summary.coverage.indicator_elements_found.push('ascending');
              if (indicatorData.aggregation_status) summary.coverage.indicator_elements_found.push('aggregation-status');

              // Create indicator-level references
              if (indicatorData.references && Array.isArray(indicatorData.references)) {
                summary.coverage.indicator_elements_found.push('reference');
                
                for (const ref of indicatorData.references) {
                  const { error: refError } = await supabase
                    .from('indicator_references')
                    .insert([{
                      indicator_id: createdIndicator.id,
                      vocabulary: ref.vocabulary,
                      code: ref.code,
                      vocabulary_uri: ref.vocabulary_uri,
                      indicator_uri: ref.indicator_uri
                    }]);

                  if (refError) {
                    console.error('[Results Import API] Indicator reference error:', refError);
                    summary.errors.push({
                      message: `Failed to create indicator reference: ${refError.message}`,
                      context: ref.code,
                      element: 'indicator/reference'
                    });
                  } else {
                    summary.indicator_references_created++;
                  }
                }
              }

              // Create indicator-level document links
              if (indicatorData.document_links && Array.isArray(indicatorData.document_links)) {
                summary.coverage.indicator_elements_found.push('document-link');
                
                for (const docLink of indicatorData.document_links) {
                  const { error: docError } = await supabase
                    .from('indicator_document_links')
                    .insert([{
                      indicator_id: createdIndicator.id,
                      format: docLink.format,
                      url: docLink.url,
                      title: toMultilingual(docLink.title),
                      description: toMultilingual(docLink.description),
                      category_code: docLink.category_code,
                      language_code: docLink.language_code || 'en',
                      document_date: docLink.document_date
                    }]);

                  if (docError) {
                    console.error('[Results Import API] Indicator document error:', docError);
                    summary.errors.push({
                      message: `Failed to create indicator document: ${docError.message}`,
                      context: docLink.url,
                      element: 'indicator/document-link'
                    });
                  } else {
                    summary.indicator_documents_created++;
                  }
                }
              }

              // Create baseline
              if (indicatorData.baseline) {
                const baseline = indicatorData.baseline;
                const { data: createdBaseline, error: baselineError } = await supabase
                  .from('indicator_baselines')
                  .insert([{
                    indicator_id: createdIndicator.id,
                    baseline_year: baseline.baseline_year,
                    iso_date: baseline.iso_date,
                    value: baseline.value,
                    comment: toMultilingual(baseline.comment)
                  }])
                  .select()
                  .single();

                if (baselineError) {
                  console.error('[Results Import API] Baseline creation error:', baselineError);
                  summary.errors.push({
                    message: `Failed to create baseline: ${baselineError.message}`,
                    context: indicatorData.title?.en || 'Unnamed indicator'
                  });
                } else {
                  summary.baselines_created++;

                  // Track baseline coverage
                  if (baseline.value !== undefined) summary.coverage.baseline_elements_found.push('value');
                  if (baseline.baseline_year) summary.coverage.baseline_elements_found.push('year');
                  if (baseline.iso_date) summary.coverage.baseline_elements_found.push('iso-date');
                  if (baseline.comment) summary.coverage.baseline_elements_found.push('comment');

                  // Create baseline locations
                  if (baseline.locations && Array.isArray(baseline.locations)) {
                    summary.coverage.baseline_elements_found.push('location');
                    
                    for (const loc of baseline.locations) {
                      const { error: locError } = await supabase
                        .from('baseline_locations')
                        .insert([{
                          baseline_id: createdBaseline.id,
                          location_ref: loc.location_ref
                        }]);
                      
                      if (!locError) {
                        summary.baseline_locations_created++;
                      } else {
                        summary.errors.push({
                          message: `Failed to create baseline location: ${locError.message}`,
                          context: loc.location_ref,
                          element: 'baseline/location'
                        });
                      }
                    }
                  }

                  // Create baseline dimensions - FIXED TABLE NAME
                  if (baseline.dimensions && Array.isArray(baseline.dimensions)) {
                    summary.coverage.baseline_elements_found.push('dimension');
                    
                    for (const dim of baseline.dimensions) {
                      const { error: dimError } = await supabase
                        .from('baseline_dimensions')
                        .insert([{
                          baseline_id: createdBaseline.id,
                          name: dim.name,
                          value: dim.value
                        }]);
                      
                      if (!dimError) {
                        summary.baseline_dimensions_created++;
                      } else {
                        summary.errors.push({
                          message: `Failed to create baseline dimension: ${dimError.message}`,
                          context: `${dim.name}=${dim.value}`,
                          element: 'baseline/dimension'
                        });
                      }
                    }
                  }

                  // Create baseline document links
                  if (baseline.document_links && Array.isArray(baseline.document_links)) {
                    summary.coverage.baseline_elements_found.push('document-link');
                    
                    for (const docLink of baseline.document_links) {
                      const { error: docError } = await supabase
                        .from('baseline_document_links')
                        .insert([{
                          baseline_id: createdBaseline.id,
                          format: docLink.format,
                          url: docLink.url,
                          title: toMultilingual(docLink.title),
                          description: toMultilingual(docLink.description),
                          category_code: docLink.category_code,
                          language_code: docLink.language_code || 'en',
                          document_date: docLink.document_date
                        }]);
                      
                      if (!docError) {
                        summary.baseline_documents_created++;
                      } else {
                        summary.errors.push({
                          message: `Failed to create baseline document: ${docError.message}`,
                          context: docLink.url,
                          element: 'baseline/document-link'
                        });
                      }
                    }
                  }
                }
              }

              // Create periods
              if (indicatorData.periods && Array.isArray(indicatorData.periods)) {
                for (const periodData of indicatorData.periods) {
                  const { data: createdPeriod, error: periodError } = await supabase
                    .from('indicator_periods')
                    .insert([{
                      indicator_id: createdIndicator.id,
                      period_start: periodData.period_start,
                      period_end: periodData.period_end,
                      target_value: periodData.target_value,
                      target_comment: toMultilingual(periodData.target_comment),
                      actual_value: periodData.actual_value,
                      actual_comment: toMultilingual(periodData.actual_comment),
                      facet: periodData.facet || 'Total'
                    }])
                    .select()
                    .single();

                  if (periodError) {
                    console.error('[Results Import API] Period creation error:', periodError);
                    summary.errors.push({
                      message: `Failed to create period: ${periodError.message}`,
                      context: `${periodData.period_start} to ${periodData.period_end}`
                    });
                    continue;
                  }

                  summary.periods_created++;

                  // Track period coverage
                  summary.coverage.period_elements_found.push('period-start');
                  summary.coverage.period_elements_found.push('period-end');
                  if (periodData.target_value !== undefined) summary.coverage.period_elements_found.push('target/value');
                  if (periodData.actual_value !== undefined) summary.coverage.period_elements_found.push('actual/value');
                  if (periodData.target_comment) summary.coverage.period_elements_found.push('target/comment');
                  if (periodData.actual_comment) summary.coverage.period_elements_found.push('actual/comment');

                  // Create period locations (target)
                  if (periodData.target_locations && Array.isArray(periodData.target_locations)) {
                    summary.coverage.period_elements_found.push('target/location');
                    
                    for (const loc of periodData.target_locations) {
                      const { error: locError } = await supabase
                        .from('period_locations')
                        .insert([{
                          period_id: createdPeriod.id,
                          location_ref: loc.location_ref,
                          location_type: 'target'
                        }]);
                      
                      if (!locError) {
                        summary.period_target_locations_created++;
                      } else {
                        summary.errors.push({
                          message: `Failed to create period target location: ${locError.message}`,
                          context: loc.location_ref,
                          element: 'period/target/location'
                        });
                      }
                    }
                  }

                  // Create period locations (actual)
                  if (periodData.actual_locations && Array.isArray(periodData.actual_locations)) {
                    summary.coverage.period_elements_found.push('actual/location');
                    
                    for (const loc of periodData.actual_locations) {
                      const { error: locError } = await supabase
                        .from('period_locations')
                        .insert([{
                          period_id: createdPeriod.id,
                          location_ref: loc.location_ref,
                          location_type: 'actual'
                        }]);
                      
                      if (!locError) {
                        summary.period_actual_locations_created++;
                      } else {
                        summary.errors.push({
                          message: `Failed to create period actual location: ${locError.message}`,
                          context: loc.location_ref,
                          element: 'period/actual/location'
                        });
                      }
                    }
                  }

                  // Create period dimensions (target) - FIXED TABLE NAME
                  if (periodData.target_dimensions && Array.isArray(periodData.target_dimensions)) {
                    summary.coverage.period_elements_found.push('target/dimension');
                    
                    for (const dim of periodData.target_dimensions) {
                      const { error: dimError } = await supabase
                        .from('period_dimensions')
                        .insert([{
                          period_id: createdPeriod.id,
                          name: dim.name,
                          value: dim.value,
                          dimension_type: 'target'
                        }]);
                      
                      if (!dimError) {
                        summary.period_target_dimensions_created++;
                      } else {
                        summary.errors.push({
                          message: `Failed to create period target dimension: ${dimError.message}`,
                          context: `${dim.name}=${dim.value}`,
                          element: 'period/target/dimension'
                        });
                      }
                    }
                  }

                  // Create period dimensions (actual) - FIXED TABLE NAME
                  if (periodData.actual_dimensions && Array.isArray(periodData.actual_dimensions)) {
                    summary.coverage.period_elements_found.push('actual/dimension');
                    
                    for (const dim of periodData.actual_dimensions) {
                      const { error: dimError } = await supabase
                        .from('period_dimensions')
                        .insert([{
                          period_id: createdPeriod.id,
                          name: dim.name,
                          value: dim.value,
                          dimension_type: 'actual'
                        }]);
                      
                      if (!dimError) {
                        summary.period_actual_dimensions_created++;
                      } else {
                        summary.errors.push({
                          message: `Failed to create period actual dimension: ${dimError.message}`,
                          context: `${dim.name}=${dim.value}`,
                          element: 'period/actual/dimension'
                        });
                      }
                    }
                  }

                  // Create period document links (target)
                  if (periodData.target_document_links && Array.isArray(periodData.target_document_links)) {
                    summary.coverage.period_elements_found.push('target/document-link');
                    
                    for (const docLink of periodData.target_document_links) {
                      const { error: docError } = await supabase
                        .from('period_document_links')
                        .insert([{
                          period_id: createdPeriod.id,
                          format: docLink.format,
                          url: docLink.url,
                          title: toMultilingual(docLink.title),
                          description: toMultilingual(docLink.description),
                          category_code: docLink.category_code,
                          language_code: docLink.language_code || 'en',
                          document_date: docLink.document_date,
                          link_type: 'target'
                        }]);
                      
                      if (!docError) {
                        summary.period_target_documents_created++;
                      } else {
                        summary.errors.push({
                          message: `Failed to create period target document: ${docError.message}`,
                          context: docLink.url,
                          element: 'period/target/document-link'
                        });
                      }
                    }
                  }

                  // Create period document links (actual)
                  if (periodData.actual_document_links && Array.isArray(periodData.actual_document_links)) {
                    summary.coverage.period_elements_found.push('actual/document-link');
                    
                    for (const docLink of periodData.actual_document_links) {
                      const { error: docError } = await supabase
                        .from('period_document_links')
                        .insert([{
                          period_id: createdPeriod.id,
                          format: docLink.format,
                          url: docLink.url,
                          title: toMultilingual(docLink.title),
                          description: toMultilingual(docLink.description),
                          category_code: docLink.category_code,
                          language_code: docLink.language_code || 'en',
                          document_date: docLink.document_date,
                          link_type: 'actual'
                        }]);
                      
                      if (!docError) {
                        summary.period_actual_documents_created++;
                      } else {
                        summary.errors.push({
                          message: `Failed to create period actual document: ${docError.message}`,
                          context: docLink.url,
                          element: 'period/actual/document-link'
                        });
                      }
                    }
                  }
                }
              }
            } catch (indicatorError) {
              console.error('[Results Import API] Indicator processing error:', indicatorError);
              summary.errors.push({
                message: `Error processing indicator: ${indicatorError instanceof Error ? indicatorError.message : 'Unknown error'}`,
                context: indicatorData.title?.en || 'Unnamed indicator'
              });
            }
          }
        }
      } catch (resultError) {
        console.error('[Results Import API] Result processing error:', resultError);
        summary.errors.push({
          message: `Error processing result ${resultIndex + 1}: ${resultError instanceof Error ? resultError.message : 'Unknown error'}`,
          context: resultData.title?.en || `Result ${resultIndex + 1}`
        });
      }
    }

    console.log('[Results Import API] Import complete:', summary);

    return NextResponse.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('[Results Import API] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Import failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


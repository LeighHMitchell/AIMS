import type { SupabaseClient } from '@supabase/supabase-js';
import type { ParsedIATIResult } from './parse-results-xml';

export interface ResultsImportSummary {
  results_created: number;
  indicators_created: number;
  baselines_created: number;
  periods_created: number;
  errors: Array<{ message: string; context?: string; element?: string }>;
}

function toMultilingual(text: string | undefined, lang = 'en') {
  return text ? { [lang]: text } : { [lang]: '' };
}

/**
 * Import parsed IATI results into the database for a given activity.
 * Writes to the full 14-table results hierarchy:
 *   activity_results → result_references, result_document_links,
 *   result_indicators → indicator_references, indicator_document_links,
 *   indicator_baselines → baseline_locations, baseline_dimensions, baseline_document_links,
 *   indicator_periods → period_locations, period_dimensions, period_document_links
 *
 * Inserts are sequential because child records need the parent's auto-generated ID.
 */
export async function importResultsForActivity(
  supabase: SupabaseClient,
  activityId: string,
  results: ParsedIATIResult[]
): Promise<ResultsImportSummary> {
  const summary: ResultsImportSummary = {
    results_created: 0,
    indicators_created: 0,
    baselines_created: 0,
    periods_created: 0,
    errors: [],
  };

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
          description: toMultilingual(resultData.description),
        }])
        .select()
        .single();

      if (resultError) {
        summary.errors.push({
          message: `Failed to create result ${resultIndex + 1}: ${resultError.message}`,
          context: resultData.title || `Result ${resultIndex + 1}`,
        });
        continue;
      }

      summary.results_created++;

      // Create result-level references
      if (resultData.references && resultData.references.length > 0) {
        for (const ref of resultData.references) {
          const { error: refError } = await supabase
            .from('result_references')
            .insert([{
              result_id: createdResult.id,
              vocabulary: ref.vocabulary,
              code: ref.code,
              vocabulary_uri: ref.vocabulary_uri,
            }]);

          if (refError) {
            summary.errors.push({
              message: `Failed to create result reference: ${refError.message || 'Unknown error'}`,
              context: ref.code || 'unknown',
              element: 'result/reference',
            });
          }
        }
      }

      // Create result-level document links
      if (resultData.document_links && resultData.document_links.length > 0) {
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
              document_date: docLink.document_date,
            }]);

          if (docError) {
            summary.errors.push({
              message: `Failed to create result document link: ${docError.message || 'Unknown error'}`,
              context: docLink.url || 'unknown',
              element: 'result/document-link',
            });
          }
        }
      }

      // Process indicators
      if (resultData.indicators && resultData.indicators.length > 0) {
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
                description: toMultilingual(indicatorData.description),
              }])
              .select()
              .single();

            if (indicatorError) {
              summary.errors.push({
                message: `Failed to create indicator: ${indicatorError.message}`,
                context: indicatorData.title || 'Unnamed indicator',
              });
              continue;
            }

            summary.indicators_created++;

            // Create indicator-level references
            if (indicatorData.references && indicatorData.references.length > 0) {
              for (const ref of indicatorData.references) {
                const { error: refError } = await supabase
                  .from('indicator_references')
                  .insert([{
                    indicator_id: createdIndicator.id,
                    vocabulary: ref.vocabulary,
                    code: ref.code,
                    vocabulary_uri: ref.vocabulary_uri,
                    indicator_uri: ref.indicator_uri,
                  }]);

                if (refError) {
                  summary.errors.push({
                    message: `Failed to create indicator reference: ${refError.message}`,
                    context: ref.code,
                    element: 'indicator/reference',
                  });
                }
              }
            }

            // Create indicator-level document links
            if (indicatorData.document_links && indicatorData.document_links.length > 0) {
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
                    document_date: docLink.document_date,
                  }]);

                if (docError) {
                  summary.errors.push({
                    message: `Failed to create indicator document: ${docError.message}`,
                    context: docLink.url,
                    element: 'indicator/document-link',
                  });
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
                  comment: toMultilingual(baseline.comment),
                }])
                .select()
                .single();

              if (baselineError) {
                summary.errors.push({
                  message: `Failed to create baseline: ${baselineError.message}`,
                  context: indicatorData.title || 'Unnamed indicator',
                });
              } else {
                summary.baselines_created++;

                // Create baseline locations
                if (baseline.locations && baseline.locations.length > 0) {
                  for (const loc of baseline.locations) {
                    const { error: locError } = await supabase
                      .from('baseline_locations')
                      .insert([{
                        baseline_id: createdBaseline.id,
                        location_ref: loc.location_ref,
                      }]);

                    if (locError) {
                      summary.errors.push({
                        message: `Failed to create baseline location: ${locError.message}`,
                        context: loc.location_ref,
                        element: 'baseline/location',
                      });
                    }
                  }
                }

                // Create baseline dimensions
                if (baseline.dimensions && baseline.dimensions.length > 0) {
                  for (const dim of baseline.dimensions) {
                    const { error: dimError } = await supabase
                      .from('baseline_dimensions')
                      .insert([{
                        baseline_id: createdBaseline.id,
                        name: dim.name,
                        value: dim.value,
                      }]);

                    if (dimError) {
                      summary.errors.push({
                        message: `Failed to create baseline dimension: ${dimError.message}`,
                        context: `${dim.name}=${dim.value}`,
                        element: 'baseline/dimension',
                      });
                    }
                  }
                }

                // Create baseline document links
                if (baseline.document_links && baseline.document_links.length > 0) {
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
                        document_date: docLink.document_date,
                      }]);

                    if (docError) {
                      summary.errors.push({
                        message: `Failed to create baseline document: ${docError.message}`,
                        context: docLink.url,
                        element: 'baseline/document-link',
                      });
                    }
                  }
                }
              }
            }

            // Create periods
            if (indicatorData.periods && indicatorData.periods.length > 0) {
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
                    facet: 'Total',
                  }])
                  .select()
                  .single();

                if (periodError) {
                  summary.errors.push({
                    message: `Failed to create period: ${periodError.message}`,
                    context: `${periodData.period_start} to ${periodData.period_end}`,
                  });
                  continue;
                }

                summary.periods_created++;

                // Period target locations
                if (periodData.target_locations && periodData.target_locations.length > 0) {
                  for (const loc of periodData.target_locations) {
                    const { error: locError } = await supabase
                      .from('period_locations')
                      .insert([{
                        period_id: createdPeriod.id,
                        location_ref: loc.location_ref,
                        location_type: 'target',
                      }]);
                    if (locError) {
                      summary.errors.push({
                        message: `Failed to create period target location: ${locError.message}`,
                        context: loc.location_ref,
                        element: 'period/target/location',
                      });
                    }
                  }
                }

                // Period actual locations
                if (periodData.actual_locations && periodData.actual_locations.length > 0) {
                  for (const loc of periodData.actual_locations) {
                    const { error: locError } = await supabase
                      .from('period_locations')
                      .insert([{
                        period_id: createdPeriod.id,
                        location_ref: loc.location_ref,
                        location_type: 'actual',
                      }]);
                    if (locError) {
                      summary.errors.push({
                        message: `Failed to create period actual location: ${locError.message}`,
                        context: loc.location_ref,
                        element: 'period/actual/location',
                      });
                    }
                  }
                }

                // Period target dimensions
                if (periodData.target_dimensions && periodData.target_dimensions.length > 0) {
                  for (const dim of periodData.target_dimensions) {
                    const { error: dimError } = await supabase
                      .from('period_dimensions')
                      .insert([{
                        period_id: createdPeriod.id,
                        name: dim.name,
                        value: dim.value,
                        dimension_type: 'target',
                      }]);
                    if (dimError) {
                      summary.errors.push({
                        message: `Failed to create period target dimension: ${dimError.message}`,
                        context: `${dim.name}=${dim.value}`,
                        element: 'period/target/dimension',
                      });
                    }
                  }
                }

                // Period actual dimensions
                if (periodData.actual_dimensions && periodData.actual_dimensions.length > 0) {
                  for (const dim of periodData.actual_dimensions) {
                    const { error: dimError } = await supabase
                      .from('period_dimensions')
                      .insert([{
                        period_id: createdPeriod.id,
                        name: dim.name,
                        value: dim.value,
                        dimension_type: 'actual',
                      }]);
                    if (dimError) {
                      summary.errors.push({
                        message: `Failed to create period actual dimension: ${dimError.message}`,
                        context: `${dim.name}=${dim.value}`,
                        element: 'period/actual/dimension',
                      });
                    }
                  }
                }

                // Period target document links
                if (periodData.target_document_links && periodData.target_document_links.length > 0) {
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
                        link_type: 'target',
                      }]);
                    if (docError) {
                      summary.errors.push({
                        message: `Failed to create period target document: ${docError.message}`,
                        context: docLink.url,
                        element: 'period/target/document-link',
                      });
                    }
                  }
                }

                // Period actual document links
                if (periodData.actual_document_links && periodData.actual_document_links.length > 0) {
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
                        link_type: 'actual',
                      }]);
                    if (docError) {
                      summary.errors.push({
                        message: `Failed to create period actual document: ${docError.message}`,
                        context: docLink.url,
                        element: 'period/actual/document-link',
                      });
                    }
                  }
                }
              }
            }
          } catch (indicatorError) {
            summary.errors.push({
              message: `Error processing indicator: ${indicatorError instanceof Error ? indicatorError.message : 'Unknown error'}`,
              context: indicatorData.title || 'Unnamed indicator',
            });
          }
        }
      }
    } catch (resultError) {
      summary.errors.push({
        message: `Error processing result ${resultIndex + 1}: ${resultError instanceof Error ? resultError.message : 'Unknown error'}`,
        context: resultData.title || `Result ${resultIndex + 1}`,
      });
    }
  }

  return summary;
}

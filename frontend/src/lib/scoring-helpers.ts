/**
 * Scoring Helpers — server-side functions for calculating and storing scores.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ScoringStage, ScoringCriterion } from '@/types/project-bank';
import { calculateScore } from './scoring-engine';

/**
 * Fetch active rubric criteria for a given stage.
 */
export async function getActiveRubricCriteria(
  supabase: SupabaseClient,
  stage: ScoringStage
): Promise<{ rubricVersionId: string; criteria: ScoringCriterion[] } | null> {
  // Get active rubric version
  const { data: version, error: vErr } = await supabase
    .from('scoring_rubric_versions')
    .select('id')
    .eq('is_active', true)
    .single();

  if (vErr || !version) return null;

  // Get criteria for this version + stage
  const { data: criteria, error: cErr } = await supabase
    .from('scoring_criteria')
    .select('*')
    .eq('rubric_version_id', version.id)
    .eq('stage', stage);

  if (cErr || !criteria || criteria.length === 0) return null;

  return { rubricVersionId: version.id, criteria: criteria as ScoringCriterion[] };
}

/**
 * Build a flat data bag from a project for scoring, including nested FS1 narrative.
 */
async function buildProjectDataBag(
  supabase: SupabaseClient,
  projectId: string
): Promise<Record<string, any> | null> {
  const { data: project, error } = await supabase
    .from('project_bank_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error || !project) return null;

  // Fetch FS1 narrative if it exists
  const { data: narrative } = await supabase
    .from('fs1_narratives')
    .select('*')
    .eq('project_id', projectId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Merge into a data bag
  const dataBag: Record<string, any> = { ...project };
  if (narrative) {
    dataBag.fs1_narrative = narrative;
  }

  return dataBag;
}

/**
 * Calculate and store a score snapshot for a project.
 *
 * @returns The inserted project_scores row, or null on failure.
 */
export async function calculateAndStoreScore(
  supabase: SupabaseClient,
  projectId: string,
  stage: ScoringStage,
  userId: string | null,
  triggeredBy: string = 'manual'
): Promise<any | null> {
  // 1. Get active rubric criteria
  const rubric = await getActiveRubricCriteria(supabase, stage);
  if (!rubric) return null;

  // 2. Build project data bag
  const dataBag = await buildProjectDataBag(supabase, projectId);
  if (!dataBag) return null;

  // 3. Fetch project documents
  const { data: documents } = await supabase
    .from('project_documents')
    .select('*')
    .eq('project_id', projectId);

  // 4. Calculate score
  const result = calculateScore(dataBag, documents || [], rubric.criteria);

  // 5. Insert immutable snapshot
  const { data: score, error: insertErr } = await supabase
    .from('project_scores')
    .insert({
      project_id: projectId,
      rubric_version_id: rubric.rubricVersionId,
      stage,
      composite_score: result.composite_score,
      dimension_scores: result.dimension_scores,
      triggered_by: triggeredBy,
      calculated_by: userId,
    })
    .select()
    .single();

  if (insertErr || !score) {
    console.error('[Scoring] Failed to insert score:', insertErr?.message);
    return null;
  }

  // 6. Update denormalized latest_score on project
  await supabase
    .from('project_bank_projects')
    .update({
      latest_score: result.composite_score,
      latest_score_stage: stage,
      latest_score_id: score.id,
    })
    .eq('id', projectId);

  return score;
}

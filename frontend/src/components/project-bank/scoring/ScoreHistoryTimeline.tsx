"use client"

import { Badge } from "@/components/ui/badge"
import { MiniRadarChart } from "./MiniRadarChart"
import type { ProjectScore, ScoringStage } from "@/types/project-bank"

const STAGE_LABELS: Record<ScoringStage, string> = {
  intake: 'Intake',
  fs1: 'FS-1',
  fs2: 'FS-2',
}

const STAGE_COLORS: Record<ScoringStage, string> = {
  intake: 'bg-muted text-foreground',
  fs1: 'bg-sky-100 text-sky-700',
  fs2: 'bg-indigo-100 text-indigo-700',
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-foreground'
  if (score >= 40) return 'text-steel-600'
  return 'text-destructive'
}

interface ScoreHistoryTimelineProps {
  scores: ProjectScore[]
}

export function ScoreHistoryTimeline({ scores }: ScoreHistoryTimelineProps) {
  if (scores.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No score history yet. Scores are calculated when a project is submitted or reviewed.
      </p>
    )
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[59px] top-0 bottom-0 w-px bg-border" />

      <div className="space-y-4">
        {scores.map((score, idx) => (
          <div key={score.id} className="flex items-start gap-4 relative">
            {/* Date column */}
            <div className="w-[52px] text-right flex-shrink-0 pt-1">
              <div className="text-xs text-muted-foreground">
                {new Date(score.calculated_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {new Date(score.calculated_at).toLocaleDateString('en-US', { year: 'numeric' })}
              </div>
            </div>

            {/* Dot on timeline */}
            <div className="relative z-10 flex-shrink-0 mt-2">
              <div className={`w-3 h-3 rounded-full border-2 border-background ${idx === 0 ? 'bg-foreground' : 'bg-muted-foreground/40'}`} />
            </div>

            {/* Content */}
            <div className="flex-1 bg-muted/30 rounded-lg p-3 border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${getScoreColor(Number(score.composite_score))}`}>
                    {Number(score.composite_score).toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">/100</span>
                  <Badge variant="outline" className={`text-[10px] ${STAGE_COLORS[score.stage]}`}>
                    {STAGE_LABELS[score.stage]}
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {score.triggered_by.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Mini radar */}
              <div className="flex justify-center">
                <MiniRadarChart dimensionScores={score.dimension_scores} size={140} showLabels />
              </div>

              {score.rubric_version && (
                <div className="text-[10px] text-muted-foreground text-center mt-1">
                  Rubric: {(score.rubric_version as any).label || `v${(score.rubric_version as any).version_number}`}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

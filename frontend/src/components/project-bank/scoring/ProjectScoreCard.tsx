"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw } from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import { DimensionHelpIcon } from "./DimensionHelpIcon"
import type { ProjectScore, ScoringDimension, ScoringStage } from "@/types/project-bank"

const STAGES: ScoringStage[] = ['intake', 'fs1', 'fs2', 'fs3']

const STAGE_TITLES: Record<ScoringStage, string> = {
  intake: 'Project Intake',
  fs1: 'Preliminary Feasibility',
  fs2: 'Detailed Feasibility',
  fs3: 'PPP/VGF Structuring',
}

const DIMENSION_LABELS: Record<ScoringDimension, string> = {
  msdp_alignment: 'MSDP Alignment',
  financial_viability: 'Financial Viability',
  technical_maturity: 'Technical Maturity',
  environmental_social_risk: 'Env/Social Risk Mgmt',
  institutional_capacity: 'Institutional Capacity',
}

const DIMENSIONS: ScoringDimension[] = [
  'msdp_alignment',
  'financial_viability',
  'technical_maturity',
  'environmental_social_risk',
  'institutional_capacity',
]

function getScoreColor(score: number): string {
  if (score >= 70) return '#4c5568'
  if (score >= 40) return '#7b95a7'
  return '#dc2625'
}

interface ProjectScoreCardProps {
  projectId: string
  onViewDetails?: () => void
}

export function ProjectScoreCard({ projectId, onViewDetails }: ProjectScoreCardProps) {
  const [stageScores, setStageScores] = useState<Record<ScoringStage, ProjectScore | null>>({
    intake: null, fs1: null, fs2: null, fs3: null,
  })
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)

  const fetchScores = async () => {
    try {
      const [intakeRes, fs1Res, fs2Res, fs3Res] = await Promise.all([
        apiFetch(`/api/project-bank/${projectId}/score/latest?stage=intake`),
        apiFetch(`/api/project-bank/${projectId}/score/latest?stage=fs1`),
        apiFetch(`/api/project-bank/${projectId}/score/latest?stage=fs2`),
        apiFetch(`/api/project-bank/${projectId}/score/latest?stage=fs3`),
      ])

      const intake = intakeRes.ok ? await intakeRes.json() : null
      const fs1 = fs1Res.ok ? await fs1Res.json() : null
      const fs2 = fs2Res.ok ? await fs2Res.json() : null
      const fs3 = fs3Res.ok ? await fs3Res.json() : null

      setStageScores({ intake, fs1, fs2, fs3 })
      setLoading(false)

      // Auto-calculate if no scores exist at all
      if (!intake && !fs1 && !fs2 && !fs3) {
        autoCalculate()
      }
    } catch { setLoading(false) }
  }

  const autoCalculate = async () => {
    if (recalculating) return
    setRecalculating(true)
    try {
      const res = await apiFetch(`/api/project-bank/${projectId}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all_stages: true }),
      })
      if (res.ok) await fetchScores()
    } catch {} finally { setRecalculating(false) }
  }

  useEffect(() => { fetchScores() }, [projectId])

  const handleRecalculate = async () => {
    setRecalculating(true)
    try {
      const res = await apiFetch(`/api/project-bank/${projectId}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all_stages: true }),
      })
      if (res.ok) await fetchScores()
    } catch {} finally {
      setRecalculating(false)
    }
  }

  const scoredStages = STAGES.filter(s => stageScores[s] !== null)

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-body">Project Scores</CardTitle></CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (scoredStages.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-body">Project Scores</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleRecalculate}
              disabled={recalculating}
              title="Calculate Scores"
            >
              {recalculating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-helper text-muted-foreground">Calculating scores...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {scoredStages.map(stage => {
        const score = stageScores[stage]!
        const compositeScore = Number(score.composite_score)
        const color = getScoreColor(compositeScore)

        return (
          <Card key={stage}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-body">{STAGE_TITLES[stage]} Score</CardTitle>
                {stage === scoredStages[scoredStages.length - 1] && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleRecalculate}
                    disabled={recalculating}
                    title="Recalculate All Scores"
                  >
                    {recalculating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Score ring + label */}
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle
                      cx="18" cy="18" r="15.5"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="3"
                    />
                    <circle
                      cx="18" cy="18" r="15.5"
                      fill="none"
                      stroke={color}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${compositeScore * 0.974} 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-body font-bold" style={{ color }}>
                      {compositeScore.toFixed(0)}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-helper font-medium">Weighted Total</div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">across all 5 dimensions</p>
                </div>
              </div>

              {/* Dimension bars */}
              <div className="space-y-1.5">
                {DIMENSIONS.map(d => {
                  const ds = score.dimension_scores[d]
                  if (!ds) return null
                  const normalized = ds.normalized
                  return (
                    <div key={d}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5">
                          {DIMENSION_LABELS[d]}
                          <DimensionHelpIcon dimension={d} stage={stage} subScores={ds.sub_scores} />
                        </span>
                        <span className="text-[10px] font-medium" style={{ color: getScoreColor(normalized) }}>
                          {normalized.toFixed(0)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#e2e8f0' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, normalized)}%`,
                            backgroundColor: getScoreColor(normalized),
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* View Details link */}
      {onViewDetails && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-helper"
          onClick={onViewDetails}
        >
          View Details
        </Button>
      )}
    </div>
  )
}

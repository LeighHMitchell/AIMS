"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw } from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import type { ProjectScore, ScoringDimension, ScoringStage } from "@/types/project-bank"

const STAGE_LABELS: Record<ScoringStage, string> = {
  intake: 'Intake',
  fs1: 'FS-1',
  fs2: 'FS-2',
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

function getScoreBg(score: number): string {
  if (score >= 70) return '#f1f4f8'
  if (score >= 40) return '#e8edf2'
  return '#fef2f2'
}

interface ProjectScoreCardProps {
  projectId: string
  onViewDetails?: () => void
}

export function ProjectScoreCard({ projectId, onViewDetails }: ProjectScoreCardProps) {
  const [score, setScore] = useState<ProjectScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)

  const fetchScore = async () => {
    try {
      const res = await apiFetch(`/api/project-bank/${projectId}/score/latest`)
      if (res.ok) {
        setScore(await res.json())
        setLoading(false)
      } else {
        setLoading(false)
        autoCalculate()
      }
    } catch { setLoading(false) }
  }

  const autoCalculate = async () => {
    if (recalculating) return
    setRecalculating(true)
    try {
      const res = await apiFetch(`/api/project-bank/${projectId}/score`, { method: 'POST' })
      if (res.ok) setScore(await res.json())
    } catch {} finally { setRecalculating(false) }
  }

  useEffect(() => { fetchScore() }, [projectId])

  const handleRecalculate = async () => {
    setRecalculating(true)
    try {
      const res = await apiFetch(`/api/project-bank/${projectId}/score`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setScore(data)
      }
    } catch {} finally {
      setRecalculating(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm">Project Score</CardTitle></CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const compositeScore = score ? Number(score.composite_score) : 0
  const color = getScoreColor(compositeScore)
  const bg = getScoreBg(compositeScore)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Project Score</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleRecalculate}
            disabled={recalculating}
            title="Recalculate Score"
          >
            {recalculating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!score ? (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Calculating score...</span>
          </div>
        ) : (
          <>
            {/* Composite score ring */}
            <div className="flex items-center gap-3">
              <div
                className="relative w-14 h-14 flex-shrink-0"
                style={{ '--score-color': color } as React.CSSProperties}
              >
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
                  <span className="text-sm font-bold" style={{ color }}>
                    {compositeScore.toFixed(0)}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium">Composite Score</div>
                <Badge variant="outline" className="text-[10px] mt-0.5">
                  {STAGE_LABELS[score.stage]}
                </Badge>
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
                      <span className="text-[10px] text-muted-foreground truncate">{DIMENSION_LABELS[d]}</span>
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

            {/* View Details link */}
            {onViewDetails && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={onViewDetails}
              >
                View Details
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

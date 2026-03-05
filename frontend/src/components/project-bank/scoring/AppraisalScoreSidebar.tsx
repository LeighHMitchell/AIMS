"use client"

import { useEffect, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  environmental_social_risk: 'Env/Social Risk',
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

interface AppraisalScoreSidebarProps {
  projectId: string | undefined
  stage?: ScoringStage
  className?: string
}

export function AppraisalScoreSidebar({ projectId, stage, className }: AppraisalScoreSidebarProps) {
  const [score, setScore] = useState<ProjectScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)

  const fetchScore = async () => {
    if (!projectId) { setLoading(false); return }
    try {
      const stageParam = stage ? `?stage=${stage}` : ''
      const res = await apiFetch(`/api/project-bank/${projectId}/score/latest${stageParam}`)
      if (res.ok) {
        const data = await res.json()
        if (data) { setScore(data); setLoading(false) }
        else { setLoading(false); autoCalculate() }
      } else {
        setLoading(false)
        autoCalculate()
      }
    } catch { setLoading(false) }
  }

  const autoCalculate = async () => {
    if (!projectId || recalculating) return
    setRecalculating(true)
    try {
      const body = stage ? JSON.stringify({ stage }) : undefined
      const res = await apiFetch(`/api/project-bank/${projectId}/score`, {
        method: 'POST',
        ...(body ? { headers: { 'Content-Type': 'application/json' }, body } : {}),
      })
      if (res.ok) setScore(await res.json())
    } catch {} finally { setRecalculating(false) }
  }

  useEffect(() => { setScore(null); setLoading(true); fetchScore() }, [projectId, stage])

  const handleRecalculate = async () => {
    if (!projectId) return
    setRecalculating(true)
    try {
      const body = stage ? JSON.stringify({ stage }) : undefined
      const res = await apiFetch(`/api/project-bank/${projectId}/score`, {
        method: 'POST',
        ...(body ? { headers: { 'Content-Type': 'application/json' }, body } : {}),
      })
      if (res.ok) setScore(await res.json())
    } catch {} finally { setRecalculating(false) }
  }

  if (!projectId) return null

  const compositeScore = score ? Number(score.composite_score) : 0
  const color = score ? getScoreColor(compositeScore) : '#94a3b8'

  return (
    <div className={`p-4 rounded-lg border shadow-lg bg-[#f6f5f3] border-[#5f7f7a]/20 ${className || ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project Score</div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleRecalculate}
          disabled={recalculating}
          title="Recalculate Score"
        >
          {recalculating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : !score ? (
        <div className="flex items-center justify-center gap-2 py-3">
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Calculating score...</span>
        </div>
      ) : (
        <>
          {/* Large composite score */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold" style={{ color }}>
              {compositeScore.toFixed(0)}
            </span>
            <span className="text-sm text-muted-foreground">/100</span>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {STAGE_LABELS[score.stage]}
            </span>
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
                    <span className="text-[10px] text-muted-foreground">{DIMENSION_LABELS[d]}</span>
                    <span className="text-[10px] font-medium" style={{ color: getScoreColor(normalized) }}>
                      {normalized.toFixed(0)}
                    </span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#d4d4d4' }}>
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
        </>
      )}
    </div>
  )
}

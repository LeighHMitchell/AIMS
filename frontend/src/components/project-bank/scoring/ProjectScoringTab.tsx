"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ChevronDown, ChevronRight, RefreshCw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts'
import { apiFetch } from "@/lib/api-fetch"
import { ScoreHistoryTimeline } from "./ScoreHistoryTimeline"
import type { ProjectScore, ScoringDimension, ScoringStage, DimensionScoreResult } from "@/types/project-bank"

const STAGES: ScoringStage[] = ['intake', 'fs1', 'fs2']

const STAGE_LABELS: Record<ScoringStage, string> = {
  intake: 'Project Intake',
  fs1: 'Preliminary Feasibility',
  fs2: 'Detailed Feasibility',
}

const DIMENSION_LABELS: Record<ScoringDimension, string> = {
  msdp_alignment: 'MSDP Alignment',
  financial_viability: 'Financial Viability',
  technical_maturity: 'Technical Maturity',
  environmental_social_risk: 'Env & Social Risk Management',
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

interface ProjectScoringTabProps {
  projectId: string
}

export function ProjectScoringTab({ projectId }: ProjectScoringTabProps) {
  const [stageScores, setStageScores] = useState<Record<ScoringStage, ProjectScore | null>>({
    intake: null, fs1: null, fs2: null,
  })
  const [allScores, setAllScores] = useState<ProjectScore[]>([])
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)
  const [expandedDimensions, setExpandedDimensions] = useState<Set<string>>(new Set())

  const fetchScores = async () => {
    try {
      const [intakeRes, fs1Res, fs2Res, historyRes] = await Promise.all([
        apiFetch(`/api/project-bank/${projectId}/score/latest?stage=intake`),
        apiFetch(`/api/project-bank/${projectId}/score/latest?stage=fs1`),
        apiFetch(`/api/project-bank/${projectId}/score/latest?stage=fs2`),
        apiFetch(`/api/project-bank/${projectId}/score`),
      ])

      const intake = intakeRes.ok ? await intakeRes.json() : null
      const fs1 = fs1Res.ok ? await fs1Res.json() : null
      const fs2 = fs2Res.ok ? await fs2Res.json() : null

      setStageScores({ intake, fs1, fs2 })

      if (historyRes.ok) setAllScores(await historyRes.json())
    } catch {} finally {
      setLoading(false)
    }
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

  const toggleDimension = (d: string) => {
    setExpandedDimensions(prev => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d)
      else next.add(d)
      return next
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Score cards skeleton */}
        <div className="grid gap-4 grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <Skeleton className="h-10 w-16 mb-1" />
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-[160px] w-[200px] rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Dimension details skeleton */}
        <Card>
          <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  const scoredStages = STAGES.filter(s => stageScores[s] !== null)
  const latestScore = stageScores.fs2 || stageScores.fs1 || stageScores.intake

  return (
    <div className="space-y-6">
      {/* 1. Stage Score Cards */}
      {scoredStages.length > 0 ? (
        <div className={`grid gap-4 ${scoredStages.length === 1 ? 'grid-cols-1' : scoredStages.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {scoredStages.map(stage => {
            const score = stageScores[stage]!
            const composite = Number(score.composite_score)
            const radarData = DIMENSIONS.map(d => ({
              dimension: DIMENSION_LABELS[d].replace(' & ', '\n& ').replace('Management', 'Mgmt'),
              score: score.dimension_scores[d]?.normalized ?? 0,
              fullMark: 100,
            }))

            return (
              <Card key={stage}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{STAGE_LABELS[stage]}</CardTitle>
                    {stage === latestScore?.stage && (
                      <Badge variant="outline" className="text-[10px]">Latest</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center">
                    <div
                      className="text-4xl font-bold"
                      style={{ color: getScoreColor(composite) }}
                    >
                      {composite.toFixed(0)}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">out of 100</div>

                    <div className="w-full max-w-[200px]">
                      <ResponsiveContainer width="100%" height={160}>
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis
                            dataKey="dimension"
                            tick={{ fontSize: 8, fill: '#64748b' }}
                          />
                          <PolarRadiusAxis
                            angle={90}
                            domain={[0, 100]}
                            tick={false}
                          />
                          <Radar
                            dataKey="score"
                            stroke="#4c5568"
                            fill="#7b95a7"
                            fillOpacity={0.35}
                            strokeWidth={1.5}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Mini dimension bars */}
                    <div className="w-full space-y-1 mt-1">
                      {DIMENSIONS.map(d => {
                        const ds = score.dimension_scores[d]
                        if (!ds) return null
                        const n = ds.normalized
                        return (
                          <div key={d} className="flex items-center gap-2">
                            <span className="text-[9px] text-muted-foreground w-24 truncate">{DIMENSION_LABELS[d]}</span>
                            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#e2e8f0' }}>
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${Math.min(100, n)}%`, backgroundColor: getScoreColor(n) }}
                              />
                            </div>
                            <span className="text-[9px] font-medium w-6 text-right" style={{ color: getScoreColor(n) }}>
                              {n.toFixed(0)}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    <div className="text-[10px] text-muted-foreground mt-2">
                      {new Date(score.calculated_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">No score has been calculated yet.</p>
              <Button onClick={handleRecalculate} disabled={recalculating}>
                {recalculating ? 'Calculating...' : 'Calculate Score Now'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recalculate button */}
      {scoredStages.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
            disabled={recalculating}
            className="gap-1.5"
          >
            {recalculating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Recalculate All Stages
          </Button>
        </div>
      )}

      {/* 2. Dimension Breakdown (for latest score) */}
      {latestScore && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Dimension Breakdown</CardTitle>
              <Badge variant="outline">{STAGE_LABELS[latestScore.stage]}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {DIMENSIONS.map(d => {
              const ds = latestScore.dimension_scores[d]
              if (!ds) return null
              const isExpanded = expandedDimensions.has(d)
              return (
                <DimensionCard
                  key={d}
                  dimension={d}
                  result={ds}
                  isExpanded={isExpanded}
                  onToggle={() => toggleDimension(d)}
                />
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* 3. Score History */}
      <Card>
        <CardHeader>
          <CardTitle>Score History</CardTitle>
        </CardHeader>
        <CardContent>
          <ScoreHistoryTimeline scores={allScores} />
        </CardContent>
      </Card>
    </div>
  )
}

function DimensionCard({
  dimension,
  result,
  isExpanded,
  onToggle,
}: {
  dimension: ScoringDimension
  result: DimensionScoreResult
  isExpanded: boolean
  onToggle: () => void
}) {
  const normalized = result.normalized

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">{DIMENSION_LABELS[dimension]}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-24 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#e2e8f0' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, normalized)}%`,
                backgroundColor: getScoreColor(normalized),
              }}
            />
          </div>
          <span className="text-sm font-bold w-10 text-right" style={{ color: getScoreColor(normalized) }}>
            {normalized.toFixed(0)}
          </span>
          <span className="text-xs text-muted-foreground w-8">
            ({result.raw_score}/{result.max_score})
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 border-t bg-muted/20">
          <table className="w-full mt-2">
            <thead className="bg-surface-muted">
              <tr className="text-xs text-muted-foreground">
                <th className="text-left font-medium py-1">Criterion</th>
                <th className="text-right font-medium py-1 w-16">Earned</th>
                <th className="text-right font-medium py-1 w-16">Max</th>
                <th className="text-right font-medium py-1 w-24">Progress</th>
              </tr>
            </thead>
            <tbody>
              {result.sub_scores.map(sub => {
                const pct = sub.max > 0 ? Math.round((sub.earned / sub.max) * 100) : 0
                return (
                  <tr key={sub.key} className="border-t border-border/50">
                    <td className="py-1.5 text-xs">{sub.label}</td>
                    <td className="py-1.5 text-xs text-right font-medium">{sub.earned}</td>
                    <td className="py-1.5 text-xs text-right text-muted-foreground">{sub.max}</td>
                    <td className="py-1.5">
                      <div className="flex items-center gap-1.5 justify-end">
                        <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#e2e8f0' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: pct >= 70 ? '#4c5568' : pct >= 40 ? '#7b95a7' : '#dc2625',
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-7 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

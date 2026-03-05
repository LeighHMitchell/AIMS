"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ChevronDown, ChevronRight, RefreshCw } from "lucide-react"
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts'
import { apiFetch } from "@/lib/api-fetch"
import { ScoreHistoryTimeline } from "./ScoreHistoryTimeline"
import type { ProjectScore, ScoringDimension, ScoringStage, DimensionScoreResult } from "@/types/project-bank"

const STAGE_LABELS: Record<ScoringStage, string> = {
  intake: 'Intake',
  fs1: 'FS-1',
  fs2: 'FS-2',
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
  const [latestScore, setLatestScore] = useState<ProjectScore | null>(null)
  const [scores, setScores] = useState<ProjectScore[]>([])
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)
  const [expandedDimensions, setExpandedDimensions] = useState<Set<string>>(new Set())

  const fetchScores = async () => {
    try {
      const [latestRes, historyRes] = await Promise.all([
        apiFetch(`/api/project-bank/${projectId}/score/latest`),
        apiFetch(`/api/project-bank/${projectId}/score`),
      ])
      if (latestRes.ok) {
        const data = await latestRes.json()
        setLatestScore(data)
      }
      if (historyRes.ok) {
        setScores(await historyRes.json())
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchScores() }, [projectId])

  const handleRecalculate = async () => {
    setRecalculating(true)
    try {
      const res = await apiFetch(`/api/project-bank/${projectId}/score`, { method: 'POST' })
      if (res.ok) {
        await fetchScores()
      }
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
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const compositeScore = latestScore ? Number(latestScore.composite_score) : 0
  const radarData = latestScore ? DIMENSIONS.map(d => ({
    dimension: DIMENSION_LABELS[d].replace(' & ', ' &\n'),
    score: latestScore.dimension_scores[d]?.normalized ?? 0,
    fullMark: 100,
  })) : []

  return (
    <div className="space-y-6">
      {/* 1. Current Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Score</CardTitle>
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
              Recalculate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!latestScore ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-3">No score has been calculated yet.</p>
              <Button onClick={handleRecalculate} disabled={recalculating}>
                {recalculating ? 'Calculating...' : 'Calculate Score Now'}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_300px] gap-6">
              {/* Left: score + radar */}
              <div className="flex flex-col items-center">
                <div className="text-center mb-4">
                  <div
                    className="text-5xl font-bold"
                    style={{ color: getScoreColor(compositeScore) }}
                  >
                    {compositeScore.toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">out of 100</div>
                  <Badge variant="outline" className="mt-2">
                    {STAGE_LABELS[latestScore.stage]} Score
                  </Badge>
                </div>
                <div className="w-full max-w-[280px]">
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis
                        dataKey="dimension"
                        tick={{ fontSize: 10, fill: '#64748b' }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={{ fontSize: 8, fill: '#94a3b8' }}
                      />
                      <Radar
                        dataKey="score"
                        stroke="#4c5568"
                        fill="#7b95a7"
                        fillOpacity={0.35}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right: dimension summary */}
              <div className="space-y-3">
                {DIMENSIONS.map(d => {
                  const ds = latestScore.dimension_scores[d]
                  if (!ds) return null
                  const normalized = ds.normalized
                  return (
                    <div key={d}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{DIMENSION_LABELS[d]}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold" style={{ color: getScoreColor(normalized) }}>
                            {normalized.toFixed(0)}
                          </span>
                          <span className="text-xs text-muted-foreground">({ds.weight}%)</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#e2e8f0' }}>
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

                {latestScore.rubric_version && (
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Rubric: {(latestScore.rubric_version as any).label || `v${(latestScore.rubric_version as any).version_number}`}
                    {' · '}
                    Calculated {new Date(latestScore.calculated_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Dimension Breakdown */}
      {latestScore && (
        <Card>
          <CardHeader>
            <CardTitle>Dimension Breakdown</CardTitle>
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
          <ScoreHistoryTimeline scores={scores} />
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
            <thead>
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

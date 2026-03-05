"use client"

import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts'
import type { DimensionScoreResult, ScoringDimension } from '@/types/project-bank'

const DIMENSION_SHORT_LABELS: Record<ScoringDimension, string> = {
  msdp_alignment: 'MSDP',
  financial_viability: 'Financial',
  technical_maturity: 'Technical',
  environmental_social_risk: 'Env/Social',
  institutional_capacity: 'Institutional',
}

const DIMENSIONS: ScoringDimension[] = [
  'msdp_alignment',
  'financial_viability',
  'technical_maturity',
  'environmental_social_risk',
  'institutional_capacity',
]

interface MiniRadarChartProps {
  dimensionScores: Record<ScoringDimension, DimensionScoreResult>
  size?: number
  showLabels?: boolean
}

export function MiniRadarChart({ dimensionScores, size = 120, showLabels = false }: MiniRadarChartProps) {
  const data = DIMENSIONS.map(d => ({
    dimension: DIMENSION_SHORT_LABELS[d],
    score: dimensionScores[d]?.normalized ?? 0,
    fullMark: 100,
  }))

  return (
    <ResponsiveContainer width={size} height={size}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="#e2e8f0" />
        {showLabels && (
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fontSize: 9, fill: '#64748b' }}
          />
        )}
        <Radar
          dataKey="score"
          stroke="#4c5568"
          fill="#7b95a7"
          fillOpacity={0.4}
          strokeWidth={1.5}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}

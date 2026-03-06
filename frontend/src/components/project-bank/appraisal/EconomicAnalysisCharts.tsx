"use client"

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, LineChart as LineChartIcon } from 'lucide-react'
import { CHART_COLOR_PALETTE } from '@/lib/chart-colors'
import { formatCurrency } from '@/lib/project-bank-utils'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'

// ── Types ──────────────────────────────────────────────────────

interface EconCostRow {
  year: number
  local_cost: number
  imported_cost: number
  labour_cost: number
}

interface EconBenefitRow {
  year: number
  [key: string]: number
}

type BenefitKey = string

interface ShadowPrices {
  standard_conversion_factor: number
  shadow_exchange_rate: number
  shadow_wage_rate: number
  social_discount_rate: number
}

const DEFAULT_SHADOW: ShadowPrices = {
  standard_conversion_factor: 0.9,
  shadow_exchange_rate: 1.1,
  shadow_wage_rate: 0.7,
  social_discount_rate: 12,
}

const BENEFIT_LABELS: Record<string, string> = {
  time_savings: 'Time Savings',
  vehicle_cost_savings: 'Vehicle Cost Savings',
  reduced_accident_costs: 'Reduced Accident Costs',
  agricultural_surplus: 'Agricultural Surplus',
  increased_productivity: 'Increased Productivity',
  health_benefits: 'Health Benefits',
  education_benefits: 'Education Benefits',
  employment_generation: 'Employment Generation',
  environmental_benefits: 'Environmental Benefits',
  carbon_emission_reduction: 'Carbon Emission Reduction',
  tourism_revenue: 'Tourism Revenue',
  energy_savings: 'Energy Savings',
  trade_facilitation: 'Trade Facilitation',
  increased_tax_revenue: 'Increased Tax Revenue',
  other: 'Other',
}

// Extended palette for many benefit categories
const BENEFIT_COLORS = [
  '#4c5568', '#7b95a7', '#dc2625', '#cfd0d5', '#5f7f7a',
  '#8b5cf6', '#d97706', '#059669', '#e11d48', '#6366f1',
  '#0891b2', '#ca8a04', '#9333ea', '#64748b', '#f59e0b',
]

type ChartMode = 'bar' | 'line'

// ── Formatters ─────────────────────────────────────────────────

function fmtAxis(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return `${v}`
}

function xAxisProps(len: number) {
  const angle = len > 15 ? -90 : len > 8 ? -45 : 0
  return {
    tick: { fontSize: 11 },
    angle,
    textAnchor: (len > 8 ? 'end' : 'middle') as 'end' | 'middle',
    height: len > 15 ? 60 : len > 8 ? 50 : 20,
    interval: 0 as const,
  }
}

// ── Component ──────────────────────────────────────────────────

interface EconomicAnalysisChartsProps {
  eirrCalculationData: any
  eirr?: number | null
  eirrNpv?: number | null
  eirrBcr?: number | null
  shadowPrices?: ShadowPrices
}

export function EconomicAnalysisCharts({
  eirrCalculationData,
  eirr,
  eirrNpv,
  eirrBcr,
  shadowPrices: propShadow,
}: EconomicAnalysisChartsProps) {
  const [costMode, setCostMode] = useState<ChartMode>('bar')
  const [benefitMode, setBenefitMode] = useState<ChartMode>('bar')
  const [netMode, setNetMode] = useState<ChartMode>('bar')

  const data = eirrCalculationData || {}
  const costs: EconCostRow[] = data.costs || []
  const benefits: EconBenefitRow[] = data.benefits || []
  const selectedCategories: BenefitKey[] = data.selected_benefit_categories || []
  const shadow = propShadow || data.shadow_prices || DEFAULT_SHADOW

  // Determine active benefit columns
  const activeCols = useMemo(() => {
    if (selectedCategories.length > 0) return selectedCategories
    // Auto-detect from data: any column with a non-zero value
    if (benefits.length === 0) return []
    const allKeys = Object.keys(benefits[0]).filter(k => k !== 'year')
    return allKeys.filter(k => benefits.some(b => (b[k] || 0) > 0))
  }, [selectedCategories, benefits])

  // Economic cost chart data (with shadow price adjustments)
  const costChartData = useMemo(() =>
    costs.map(row => ({
      year: row.year,
      local: Math.round(row.local_cost * shadow.standard_conversion_factor),
      imported: Math.round(row.imported_cost * shadow.shadow_exchange_rate),
      labour: Math.round(row.labour_cost * shadow.shadow_wage_rate),
    })),
    [costs, shadow],
  )

  // Economic benefit chart data
  const benefitChartData = useMemo(() =>
    benefits.map(row => {
      const d: Record<string, number> = { year: row.year }
      activeCols.forEach(k => { d[k] = row[k] || 0 })
      return d
    }),
    [benefits, activeCols],
  )

  // Net economic flow chart data
  const netFlowData = useMemo(() => {
    const costByYear = new Map<number, number>()
    costChartData.forEach(r => costByYear.set(r.year, r.local + r.imported + r.labour))

    const benefitByYear = new Map<number, number>()
    benefitChartData.forEach(r => {
      const total = activeCols.reduce((sum, k) => sum + ((r[k] as number) || 0), 0)
      benefitByYear.set(r.year as number, total)
    })

    const allYears = Array.from(new Set([
      ...Array.from(costByYear.keys()),
      ...Array.from(benefitByYear.keys()),
    ])).sort((a, b) => a - b)

    return allYears.map(year => ({
      year,
      costs: costByYear.get(year) || 0,
      benefits: benefitByYear.get(year) || 0,
      net: (benefitByYear.get(year) || 0) - (costByYear.get(year) || 0),
    }))
  }, [costChartData, benefitChartData, activeCols])

  const hasCosts = costs.length > 0 && costs.some(r => r.local_cost || r.imported_cost || r.labour_cost)
  const hasBenefits = benefits.length > 0 && activeCols.length > 0 && benefits.some(r => activeCols.some(k => r[k]))

  if (!hasCosts && !hasBenefits) return null

  const chartToggle = (mode: ChartMode, setMode: (m: ChartMode) => void) => (
    <div className="flex items-center gap-1 border rounded-md p-0.5">
      <button
        onClick={() => setMode('bar')}
        className={`p-1 rounded ${mode === 'bar' ? 'bg-muted' : 'hover:bg-muted/50'}`}
        title="Bar chart"
      >
        <BarChart3 className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => setMode('line')}
        className={`p-1 rounded ${mode === 'line' ? 'bg-muted' : 'hover:bg-muted/50'}`}
        title="Line chart"
      >
        <LineChartIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  )

  return (
    <Card>
      <CardHeader className="bg-surface-muted rounded-t-lg">
        <CardTitle className="text-base">Economic Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {/* EIRR Summary */}
        {(eirr != null || eirrNpv != null || eirrBcr != null) && (
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-surface-muted rounded-lg">
              <div className="text-xs text-muted-foreground">EIRR</div>
              <div
                className="text-lg font-bold tabular-nums mt-0.5"
                style={{ color: eirr != null ? (eirr >= 15 ? '#4c5568' : '#dc2625') : undefined }}
              >
                {eirr != null ? `${Number(eirr).toFixed(1)}%` : '—'}
              </div>
            </div>
            {eirrNpv != null && (
              <div className="p-3 bg-surface-muted rounded-lg">
                <div className="text-xs text-muted-foreground">ENPV</div>
                <div className="text-lg font-bold tabular-nums mt-0.5">
                  {formatCurrency(eirrNpv)}
                </div>
              </div>
            )}
            {eirrBcr != null && (
              <div className="p-3 bg-surface-muted rounded-lg">
                <div className="text-xs text-muted-foreground">BCR</div>
                <div
                  className="text-lg font-bold tabular-nums mt-0.5"
                  style={{ color: eirrBcr >= 1 ? '#4c5568' : '#dc2625' }}
                >
                  {Number(eirrBcr).toFixed(2)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Economic Costs Chart */}
        {hasCosts && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Economic Costs by Component</p>
              {chartToggle(costMode, setCostMode)}
            </div>
            <div className="border rounded-lg p-4 bg-background">
              <ResponsiveContainer width="100%" height={240}>
                {costMode === 'bar' ? (
                  <BarChart data={costChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="year" {...xAxisProps(costChartData.length)} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtAxis} />
                    <RechartsTooltip
                      formatter={(v: number, name: string) => [fmtAxis(v), name === 'local' ? 'Local (adj.)' : name === 'imported' ? 'Imported (adj.)' : 'Labour (adj.)']}
                      labelFormatter={(l) => `Year ${l}`}
                    />
                    <Legend formatter={(v) => v === 'local' ? 'Local' : v === 'imported' ? 'Imported' : 'Labour'} />
                    <Bar dataKey="local" stackId="costs" fill="#4c5568" />
                    <Bar dataKey="imported" stackId="costs" fill="#7b95a7" />
                    <Bar dataKey="labour" stackId="costs" fill="#cfd0d5" />
                  </BarChart>
                ) : (
                  <LineChart data={costChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="year" {...xAxisProps(costChartData.length)} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtAxis} />
                    <RechartsTooltip
                      formatter={(v: number, name: string) => [fmtAxis(v), name === 'local' ? 'Local (adj.)' : name === 'imported' ? 'Imported (adj.)' : 'Labour (adj.)']}
                      labelFormatter={(l) => `Year ${l}`}
                    />
                    <Legend formatter={(v) => v === 'local' ? 'Local' : v === 'imported' ? 'Imported' : 'Labour'} />
                    <Line type="monotone" dataKey="local" stroke="#4c5568" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="imported" stroke="#7b95a7" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="labour" stroke="#cfd0d5" strokeWidth={2} dot={false} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Economic Benefits Chart */}
        {hasBenefits && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Economic Benefits by Category</p>
              {chartToggle(benefitMode, setBenefitMode)}
            </div>
            <div className="border rounded-lg p-4 bg-background">
              <ResponsiveContainer width="100%" height={240}>
                {benefitMode === 'bar' ? (
                  <BarChart data={benefitChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="year" {...xAxisProps(benefitChartData.length)} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtAxis} />
                    <RechartsTooltip
                      formatter={(v: number, name: string) => [fmtAxis(v), BENEFIT_LABELS[name] || name]}
                      labelFormatter={(l) => `Year ${l}`}
                    />
                    <Legend formatter={(v) => BENEFIT_LABELS[v] || v} />
                    {activeCols.map((key, i) => (
                      <Bar key={key} dataKey={key} stackId="benefits" fill={BENEFIT_COLORS[i % BENEFIT_COLORS.length]} />
                    ))}
                  </BarChart>
                ) : (
                  <LineChart data={benefitChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="year" {...xAxisProps(benefitChartData.length)} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtAxis} />
                    <RechartsTooltip
                      formatter={(v: number, name: string) => [fmtAxis(v), BENEFIT_LABELS[name] || name]}
                      labelFormatter={(l) => `Year ${l}`}
                    />
                    <Legend formatter={(v) => BENEFIT_LABELS[v] || v} />
                    {activeCols.map((key, i) => (
                      <Line key={key} type="monotone" dataKey={key} stroke={BENEFIT_COLORS[i % BENEFIT_COLORS.length]} strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Net Economic Flow Chart */}
        {hasCosts && hasBenefits && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Net Economic Flow (Benefits minus Costs)</p>
              {chartToggle(netMode, setNetMode)}
            </div>
            <div className="border rounded-lg p-4 bg-background">
              <ResponsiveContainer width="100%" height={200}>
                {netMode === 'bar' ? (
                  <BarChart data={netFlowData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="year" {...xAxisProps(netFlowData.length)} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtAxis} />
                    <RechartsTooltip
                      formatter={(v: number, name: string) => [fmtAxis(v), name === 'net' ? 'Net Flow' : name === 'costs' ? 'Total Costs' : 'Total Benefits']}
                      labelFormatter={(l) => `Year ${l}`}
                    />
                    <Legend formatter={(v) => v === 'net' ? 'Net Flow' : v === 'costs' ? 'Total Costs' : 'Total Benefits'} />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                    <Bar dataKey="costs" fill="#dc2625" fillOpacity={0.2} stroke="#dc2625" strokeWidth={1} />
                    <Bar dataKey="benefits" fill="#4c5568" fillOpacity={0.2} stroke="#4c5568" strokeWidth={1} />
                    <Bar dataKey="net" fill="#5f7f7a" />
                  </BarChart>
                ) : (
                  <LineChart data={netFlowData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="year" {...xAxisProps(netFlowData.length)} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtAxis} />
                    <RechartsTooltip
                      formatter={(v: number, name: string) => [fmtAxis(v), name === 'net' ? 'Net Flow' : name === 'costs' ? 'Total Costs' : 'Total Benefits']}
                      labelFormatter={(l) => `Year ${l}`}
                    />
                    <Legend formatter={(v) => v === 'net' ? 'Net Flow' : v === 'costs' ? 'Total Costs' : 'Total Benefits'} />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="costs" stroke="#dc2625" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="benefits" stroke="#4c5568" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="net" stroke="#5f7f7a" strokeWidth={2.5} dot={false} strokeDasharray="5 3" />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

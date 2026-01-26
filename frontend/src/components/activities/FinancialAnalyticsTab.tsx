"use client"

import React, { useEffect, useState, useMemo, useCallback, useTransition, useRef } from 'react'
import * as d3 from 'd3'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { format, parseISO, getYear, getMonth, startOfMonth } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertCircle, TrendingUp, DollarSign, BarChart3, TrendingUpIcon, LineChart as LineChartIcon, Table as TableIcon, ChevronDown, Download, FileImage, Camera } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TransactionCalendarHeatmap } from './TransactionCalendarHeatmap'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { FinancialAnalyticsSkeleton } from './TabSkeletons'
import { 
  splitBudgetAcrossYears, 
  splitPlannedDisbursementAcrossYears, 
  splitTransactionAcrossYears 
} from '@/utils/year-allocation'
import { useOrganizations } from '@/hooks/use-organizations'
import { ActivitySpendTrajectoryChart } from '@/components/charts/ActivitySpendTrajectoryChart'
import { apiFetch } from '@/lib/api-fetch';

type TimePeriod = '1m' | '3m' | '6m' | '1y' | '5y' | 'all'
type GroupBy = 'year' | 'month'

interface FinancialAnalyticsTabProps {
  activityId: string
  transactions?: any[]
  budgets?: any[]
  plannedDisbursements?: any[]
}

// Custom interactive legend component
interface CustomLegendProps {
  payload?: any[]
  hiddenSeries: Set<string>
  onToggleSeries: (seriesName: string) => void
}

const CustomInteractiveLegend: React.FC<CustomLegendProps> = ({ payload, hiddenSeries, onToggleSeries }) => {
  if (!payload) return null

  return (
    <div className="flex flex-wrap justify-center gap-3 mt-4 mb-2">
      {payload.map((entry, index) => {
        const isHidden = hiddenSeries.has(entry.value)
        return (
          <button
            key={`legend-${index}`}
            onClick={() => onToggleSeries(entry.value)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all cursor-pointer hover:bg-slate-100 ${
              isHidden ? 'opacity-40' : 'opacity-100'
            }`}
            title={isHidden ? `Click to show ${entry.value}` : `Click to hide ${entry.value}`}
          >
            <div
              className="w-3 h-3 rounded-sm"
              style={{
                backgroundColor: entry.color,
                opacity: isHidden ? 0.5 : 1
              }}
            />
            <span
              className={`text-sm ${isHidden ? 'line-through text-slate-400' : 'text-slate-700'}`}
            >
              {entry.value}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Helper function to convert data with date field to timestamp for continuous time scale
 */
function convertToTimestampData(data: any[], dateField: string = 'date') {
  return data.map(item => ({
    ...item,
    timestamp: new Date(item[dateField]).getTime()
  }))
}

/**
 * Helper function to fill missing years with zero values for continuous timeline
 */
function fillMissingYears(data: any[], dateField: string = 'date') {
  if (data.length === 0) return []

  const years = data.map(d => getYear(new Date(d[dateField])))
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)
  const filled: any[] = []

  for (let year = minYear; year <= maxYear; year++) {
    const existing = data.find(d => getYear(new Date(d[dateField])) === year)
    if (existing) {
      filled.push(existing)
    } else {
      // Create zero-value entry for missing year
      const zeroEntry: any = {
        [dateField]: `${year}-01-01`,
        timestamp: new Date(`${year}-01-01`).getTime()
      }
      // Copy all numeric fields as zero
      if (data[0]) {
        Object.keys(data[0]).forEach(key => {
          if (typeof data[0][key] === 'number' && key !== 'timestamp') {
            zeroEntry[key] = 0
          } else if (key !== dateField && key !== 'timestamp') {
            zeroEntry[key] = data[0][key] // Copy non-numeric fields from first item
          }
        })
      }
      filled.push(zeroEntry)
    }
  }

  return filled.sort((a, b) => new Date(a[dateField]).getTime() - new Date(b[dateField]).getTime())
}

/**
 * Helper function to fill missing months with zero or carried-forward values
 */
function fillMissingMonths(data: any[], dateField: string = 'date', carryForward: boolean = false) {
  if (data.length === 0) return []

  const dates = data.map(d => new Date(d[dateField]))
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))

  const filled: any[] = []
  const dataMap = new Map(data.map(d => {
    const date = new Date(d[dateField])
    const key = `${getYear(date)}-${String(getMonth(date) + 1).padStart(2, '0')}`
    return [key, d]
  }))

  let currentDate = new Date(getYear(minDate), getMonth(minDate), 1)
  const endDate = new Date(getYear(maxDate), getMonth(maxDate), 1)

  let lastValues: any = {}

  while (currentDate <= endDate) {
    const monthKey = `${getYear(currentDate)}-${String(getMonth(currentDate) + 1).padStart(2, '0')}`

    if (dataMap.has(monthKey)) {
      const existing = dataMap.get(monthKey)!
      filled.push(existing)
      if (carryForward) {
        lastValues = { ...existing }
      }
    } else {
      const dateStr = `${getYear(currentDate)}-${String(getMonth(currentDate) + 1).padStart(2, '0')}-01`
      const entry: any = {
        [dateField]: dateStr,
        timestamp: new Date(dateStr).getTime()
      }

      if (carryForward && Object.keys(lastValues).length > 0) {
        // Carry forward last values
        Object.keys(lastValues).forEach(key => {
          if (key !== dateField && key !== 'timestamp') {
            entry[key] = lastValues[key]
          }
        })
      } else {
        // Zero values
        if (data[0]) {
          Object.keys(data[0]).forEach(key => {
            if (typeof data[0][key] === 'number' && key !== 'timestamp') {
              entry[key] = 0
            } else if (key !== dateField && key !== 'timestamp') {
              entry[key] = data[0][key]
            }
          })
        }
      }

      filled.push(entry)
    }

    currentDate.setMonth(currentDate.getMonth() + 1)
  }

  return filled
}

/**
 * Generate evenly spaced year ticks for x-axis
 * Returns an array of timestamps, one per year
 */
function generateYearTicks(data: any[], timestampField: string = 'timestamp') {
  if (!data || data.length === 0) return []

  const timestamps = data.map(d => d[timestampField])
  const minYear = getYear(new Date(Math.min(...timestamps)))
  const maxYear = getYear(new Date(Math.max(...timestamps)))

  const ticks: number[] = []
  for (let year = minYear; year <= maxYear; year++) {
    ticks.push(new Date(`${year}-01-01`).getTime())
  }

  return ticks
}

/**
 * D3-based Sankey visualization for funding source flow
 */
interface OrgInfo {
  name: string // Full organization name
  displayName: string // Acronym if available, otherwise full name
}

interface FundingSourceSankeyProps {
  data: {
    providers: { name: string; displayName: string; value: number }[]
    receivers: { name: string; displayName: string; value: number }[]
    flows: { provider: string; providerDisplay: string; receiver: string; receiverDisplay: string; value: number }[]
  }
  fundingSourceType: 'transactions' | 'planned'
  fundingTransactionType?: string // Single type (backward compat)
  fundingTransactionTypes?: string[] // Multiple types (new)
}

export const FundingSourceSankey: React.FC<FundingSourceSankeyProps> = ({
  data,
  fundingSourceType,
  fundingTransactionType,
  fundingTransactionTypes
}) => {
  const svgRef = useRef<SVGSVGElement>(null)

  // Calculate dynamic height based on number of nodes
  const calculateHeight = (numProviders: number, numReceivers: number) => {
    const maxNodes = Math.max(numProviders, numReceivers)
    const nodeHeight = 20 // minimum height per node
    const nodePadding = 12
    const marginTopBottom = 70 // top (30) + bottom (40) margins for labels

    // Calculate minimum height needed for nodes
    const minHeight = (maxNodes * nodeHeight) + ((maxNodes - 1) * nodePadding) + marginTopBottom

    // Return height between 450 and 850px (increased to accommodate margins)
    return Math.max(450, Math.min(850, minHeight + 120))
  }

  // Calculate initial height based on data
  const numProviders = Math.min(8, data.providers?.length || 0)
  const numReceivers = Math.min(8, data.receivers?.length || 0)
  const dynamicHeight = calculateHeight(numProviders, numReceivers)

  const [containerSize, setContainerSize] = useState({ width: 1200, height: dynamicHeight })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value)
  }

  // Update height when data changes
  useEffect(() => {
    const numProviders = Math.min(8, data.providers?.length || 0)
    const numReceivers = Math.min(8, data.receivers?.length || 0)
    const newHeight = calculateHeight(numProviders, numReceivers)

    setContainerSize(prev => ({
      ...prev,
      height: newHeight
    }))
  }, [data.providers?.length, data.receivers?.length])

  // Handle container resize
  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width } = entries[0].contentRect
        setContainerSize(prev => ({
          width: Math.max(800, width),
          height: prev.height
        }))
      }
    })

    if (svgRef.current?.parentElement) {
      resizeObserver.observe(svgRef.current.parentElement)
    }

    return () => resizeObserver.disconnect()
  }, [])

  // Render D3 Sankey
  useEffect(() => {
    if (!svgRef.current || !data.providers || data.providers.length === 0) return

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove()

    const width = containerSize.width
    const height = containerSize.height
    const margin = { top: 30, right: 220, bottom: 40, left: 220 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])
      .style('max-width', '100%')
      .style('height', `${height}px`)
      .style('font-family', 'system-ui, -apple-system, sans-serif')

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Create tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'absolute bg-white border border-slate-200 rounded-lg shadow-lg text-sm pointer-events-none z-50')
      .style('opacity', 0)

    // Prepare data - show top 8 providers and receivers
    const topProviders = data.providers.slice(0, 8)
    const topReceivers = data.receivers.slice(0, 8)
    const providerNames = new Set(topProviders.map(p => p.name))
    const receiverNames = new Set(topReceivers.map(r => r.name))

    // Filter flows to only include top providers and receivers
    const relevantFlows = data.flows.filter(f =>
      providerNames.has(f.provider) && receiverNames.has(f.receiver)
    )

    const totalValue = topProviders.reduce((sum, s) => sum + s.value, 0)

    // Calculate node positions
    const nodeWidth = 24
    const nodePadding = 12

    const providerHeight = innerHeight - (nodePadding * (topProviders.length - 1))
    const receiverHeight = innerHeight - (nodePadding * (topReceivers.length - 1))
    const providerScale = providerHeight / totalValue
    const receiverScale = receiverHeight / totalValue

    // Create nodes
    interface SankeyNode {
      id: string
      name: string // Full name for tooltips
      displayName: string // Acronym or short name for labels
      value: number
      x0: number
      x1: number
      y0: number
      y1: number
      height: number
      color: string
      type: 'provider' | 'receiver'
    }

    const nodes: SankeyNode[] = []
    // Custom color palette: Primary Scarlet, Pale Slate, Blue Slate, Cool Steel, Platinum
    const COLORS = ['#dc2625', '#cfd0d5', '#4c5568', '#7b95a7', '#f1f4f8']

    // Add provider nodes (left side)
    let providerY = 0
    topProviders.forEach((provider, index) => {
      const nodeHeight = Math.max(20, provider.value * providerScale)
      nodes.push({
        id: `provider-${provider.name}`,
        name: provider.name,
        displayName: provider.displayName || provider.name,
        value: provider.value,
        x0: 0,
        x1: nodeWidth,
        y0: providerY,
        y1: providerY + nodeHeight,
        height: nodeHeight,
        color: COLORS[index % COLORS.length],
        type: 'provider'
      })
      providerY += nodeHeight + nodePadding
    })

    // Add receiver nodes (right side)
    let receiverY = 0
    topReceivers.forEach((receiver, index) => {
      const nodeHeight = Math.max(20, receiver.value * receiverScale)
      nodes.push({
        id: `receiver-${receiver.name}`,
        name: receiver.name,
        displayName: receiver.displayName || receiver.name,
        value: receiver.value,
        x0: innerWidth - nodeWidth,
        x1: innerWidth,
        y0: receiverY,
        y1: receiverY + nodeHeight,
        height: nodeHeight,
        color: COLORS[(index + 3) % COLORS.length], // Offset colors for receivers
        type: 'receiver'
      })
      receiverY += nodeHeight + nodePadding
    })

    // Create node map for quick lookup
    const nodeMap = new Map(nodes.map(n => [n.id, n]))

    // Track cumulative heights for flow positioning
    const providerOutY = new Map<string, number>()
    const receiverInY = new Map<string, number>()

    nodes.forEach(n => {
      if (n.type === 'provider') {
        providerOutY.set(n.id, n.y0)
      } else {
        receiverInY.set(n.id, n.y0)
      }
    })

    // Draw links (flows from providers to receivers)
    const linkGroup = g.append('g')
      .attr('fill-opacity', 0.4)
      .attr('stroke', 'none')

    relevantFlows.forEach((flow, flowIndex) => {
      const providerNode = nodeMap.get(`provider-${flow.provider}`)
      const receiverNode = nodeMap.get(`receiver-${flow.receiver}`)

      if (!providerNode || !receiverNode) return

      // Calculate link height proportional to flow value
      const linkHeight = Math.max(2, flow.value * providerScale)

      // Get current Y positions
      const provY = providerOutY.get(providerNode.id) || providerNode.y0
      const recvY = receiverInY.get(receiverNode.id) || receiverNode.y0

      // Update positions for next flow
      providerOutY.set(providerNode.id, provY + linkHeight)
      receiverInY.set(receiverNode.id, recvY + linkHeight)

      // Create gradient for link
      const gradientId = `gradient-flow-${flowIndex}`
      const gradient = svg.append('defs').append('linearGradient')
        .attr('id', gradientId)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', providerNode.x1)
        .attr('x2', receiverNode.x0)

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', providerNode.color)

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', receiverNode.color)

      // Draw curved link path
      const x0 = providerNode.x1
      const x1 = receiverNode.x0
      const y0s = provY
      const y0e = provY + linkHeight
      const y1s = recvY
      const y1e = recvY + linkHeight

      const xi = d3.interpolateNumber(x0, x1)
      const x2 = xi(0.5)

      const path = `M${x0},${y0s}C${x2},${y0s} ${x2},${y1s} ${x1},${y1s}L${x1},${y1e}C${x2},${y1e} ${x2},${y0e} ${x0},${y0e}Z`

      linkGroup.append('path')
        .attr('d', path)
        .attr('fill', `url(#${gradientId})`)
        .style('cursor', 'pointer')
        .on('mouseover', function(event) {
          d3.select(this).attr('fill-opacity', 0.7)
          tooltip.style('opacity', 1)
          // Show display names in header, full names if different
          const providerLabel = flow.providerDisplay !== flow.provider 
            ? `${flow.providerDisplay} (${flow.provider})` 
            : flow.provider
          const receiverLabel = flow.receiverDisplay !== flow.receiver 
            ? `${flow.receiverDisplay} (${flow.receiver})` 
            : flow.receiver
          tooltip.html(`
            <div class="bg-slate-100 px-3 py-2 border-b border-slate-200 rounded-t-lg">
              <div class="font-semibold text-slate-900 text-sm">${providerLabel} → ${receiverLabel}</div>
            </div>
            <div class="p-2">
              <table class="w-full text-sm">
                <tbody>
                  <tr class="border-b border-slate-100 last:border-b-0">
                    <td class="py-1.5 pr-4 text-slate-700 font-medium">Amount</td>
                    <td class="py-1.5 text-right font-semibold text-slate-900">${formatCurrency(flow.value)}</td>
                  </tr>
                  <tr class="border-b border-slate-100 last:border-b-0">
                    <td class="py-1.5 pr-4 text-slate-700 font-medium">% of Total</td>
                    <td class="py-1.5 text-right font-semibold text-slate-900">${((flow.value / totalValue) * 100).toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
        })
        .on('mouseout', function() {
          d3.select(this).attr('fill-opacity', 0.4)
          tooltip.style('opacity', 0)
        })
    })

    // Draw nodes
    const nodeGroup = g.selectAll('.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')

    // Add node rectangles
    nodeGroup.append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.height)
      .attr('fill', d => d.color)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('rx', 4)
      .on('mouseover', function(event, d) {
        d3.select(this).style('filter', 'brightness(1.2)')
        tooltip.style('opacity', 1)
        // Show acronym and full name if they differ
        const nameDisplay = d.displayName !== d.name 
          ? `<div class="font-semibold">${d.displayName}</div><div class="text-xs text-gray-400 mb-1">${d.name}</div>`
          : `<div class="font-semibold">${d.name}</div>`
        tooltip.html(`
          <div class="bg-slate-100 px-3 py-2 border-b border-slate-200 rounded-t-lg">
            ${nameDisplay}
            <div class="text-xs text-slate-600 mt-0.5">${d.type === 'provider' ? 'Provider' : 'Receiver'}</div>
          </div>
          <div class="p-2">
            <table class="w-full text-sm">
              <tbody>
                <tr class="border-b border-slate-100 last:border-b-0">
                  <td class="py-1.5 pr-4 text-slate-700 font-medium">Amount</td>
                  <td class="py-1.5 text-right font-semibold text-slate-900">${formatCurrency(d.value)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
      })
      .on('mouseout', function() {
        d3.select(this).style('filter', 'none')
        tooltip.style('opacity', 0)
      })

    // Add node labels (using displayName - acronym if available)
    nodeGroup.append('text')
      .attr('x', d => d.type === 'provider' ? d.x0 - 8 : d.x1 + 8)
      .attr('y', d => (d.y0 + d.y1) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => d.type === 'provider' ? 'end' : 'start')
      .attr('font-size', '12px')
      .attr('font-weight', 'normal')
      .attr('fill', '#374151')
      .text(d => {
        const maxLength = 28
        const label = d.displayName || d.name
        return label.length > maxLength ? label.substring(0, maxLength) + '...' : label
      })
      .style('pointer-events', 'none')

    // Add value labels below node names
    nodeGroup.append('text')
      .attr('x', d => d.type === 'provider' ? d.x0 - 8 : d.x1 + 8)
      .attr('y', d => (d.y0 + d.y1) / 2 + 14)
      .attr('text-anchor', d => d.type === 'provider' ? 'end' : 'start')
      .attr('font-size', '10px')
      .attr('fill', '#6b7280')
      .text(d => formatCurrency(d.value))
      .style('pointer-events', 'none')

    // Cleanup tooltip on unmount
    return () => {
      tooltip.remove()
    }

  }, [data, containerSize])

  if (!data.providers || data.providers.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        <div className="text-center">
          <div className="text-lg font-medium">No funding source data available</div>
          <div className="text-sm mt-1">Add transactions or planned disbursements to see the flow</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full funding-source-chart py-4">
      <svg ref={svgRef} className="w-full" style={{ height: `${containerSize.height}px`, display: 'block' }} />
      <div className="border-t border-slate-200 pt-4 mt-4">
        <p className="text-xs text-slate-500 text-center">
          Flow width represents the funding amount from each provider to each receiver
          {data.providers.length > 8 && ` (showing top 8 of ${data.providers.length} providers)`}
        </p>
      </div>
    </div>
  )
}

export default function FinancialAnalyticsTab({ 
  activityId, 
  transactions = [], 
  budgets = [], 
  plannedDisbursements = [] 
}: FinancialAnalyticsTabProps) {
  const { organizations } = useOrganizations()
  const [loading, setLoading] = useState(true)
  const [rawBudgetVsActualData, setRawBudgetVsActualData] = useState<any[]>([])
  const [rawDisbursementData, setRawDisbursementData] = useState<any[]>([])
  const [cumulativeData, setCumulativeData] = useState<any[]>([])
  const [budgetCompositionData, setBudgetCompositionData] = useState<any[]>([])
  const [fundingSourceData, setFundingSourceData] = useState<any[]>([])
  const [commitmentRatio, setCommitmentRatio] = useState<number>(0)
  const [totalCommitment, setTotalCommitment] = useState<number>(0)
  const [totalDisbursement, setTotalDisbursement] = useState<number>(0)
  
  // Time period filters for different charts
  const [overviewTimePeriod, setOverviewTimePeriod] = useState<TimePeriod>('all')
  const [budgetTimePeriod, setBudgetTimePeriod] = useState<TimePeriod>('all')
  const [cumulativeTimePeriod, setCumulativeTimePeriod] = useState<TimePeriod>('all')
  const [disbursementTimePeriod, setDisbursementTimePeriod] = useState<TimePeriod>('all')
  
  // Grouping toggles for charts
  const [budgetGroupBy, setBudgetGroupBy] = useState<GroupBy>('year')
  const [disbursementGroupBy, setDisbursementGroupBy] = useState<GroupBy>('month')

  // Chart type toggles
  const [disbursementChartType, setDisbursementChartType] = useState<'line' | 'bar' | 'table'>('line')
  const [budgetChartType, setBudgetChartType] = useState<'line' | 'bar' | 'table' | 'total'>('bar')
  const [overviewChartType, setOverviewChartType] = useState<'line' | 'bar' | 'area' | 'table' | 'total'>('line')

  // Cumulative toggles
  const [isDisbursementCumulative, setIsDisbursementCumulative] = useState(false)
  const [isCumulative, setIsCumulative] = useState<boolean>(true)
  const [isBudgetCumulative, setIsBudgetCumulative] = useState<boolean>(false)
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set())
  const [hiddenBudgetSeries, setHiddenBudgetSeries] = useState<Set<string>>(new Set())
  const [hiddenDisbursementSeries, setHiddenDisbursementSeries] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  
  // Allocation method toggle
  const [allocationMethod, setAllocationMethod] = useState<'proportional' | 'period-start'>('proportional')

  // Funding Source Breakdown controls
  const [fundingSourceType, setFundingSourceType] = useState<'transactions' | 'planned'>('transactions')
  const [fundingTransactionType, setFundingTransactionType] = useState<'1' | '2' | '3' | '4'>('3')
  const [fundingChartType, setFundingChartType] = useState<'chart' | 'table'>('chart')

  const fetchFinancialAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      const response = await apiFetch(`/api/activities/${activityId}/financial-analytics`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch financial analytics')
      }

      const data = await response.json()
      
      // Store raw data for client-side grouping
      // Use startTransition to mark state updates as non-urgent to prevent UI blocking
      startTransition(() => {
        setRawBudgetVsActualData(data.rawBudgetData || [])
        setRawDisbursementData(data.rawDisbursementData || [])
        setCumulativeData(data.cumulative || [])
        setBudgetCompositionData(data.budgetComposition || [])
        setFundingSourceData(data.fundingSources || [])
        setCommitmentRatio(data.commitmentRatio || 0)
        setTotalCommitment(data.totalCommitment || 0)
        setTotalDisbursement(data.totalDisbursement || 0)
      })
    } catch (error) {
      console.error('Error fetching financial analytics:', error)
      toast.error('Failed to load financial analytics')
      setLoading(false)
    } finally {
      // Set loading to false outside transition so UI responds immediately
      setTimeout(() => setLoading(false), 0)
    }
  }, [activityId])

  useEffect(() => {
    if (!activityId) {
      return
    }
    fetchFinancialAnalytics()
  }, [activityId, fetchFinancialAnalytics])

  // Calculate cutoff date based on time period
  const getCutoffDate = (period: TimePeriod): Date | null => {
    if (period === 'all') return null
    
    const now = new Date()
    const cutoff = new Date()
    
    switch (period) {
      case '1m':
        cutoff.setMonth(now.getMonth() - 1)
        break
      case '3m':
        cutoff.setMonth(now.getMonth() - 3)
        break
      case '6m':
        cutoff.setMonth(now.getMonth() - 6)
        break
      case '1y':
        cutoff.setFullYear(now.getFullYear() - 1)
        break
      case '5y':
        cutoff.setFullYear(now.getFullYear() - 5)
        break
    }
    
    return cutoff
  }

  // Filter data by time period based on year field
  const filterDataByYear = (data: any[], period: TimePeriod) => {
    const cutoff = getCutoffDate(period)
    if (!cutoff) return data
    
    const cutoffYear = cutoff.getFullYear()
    return data.filter(item => {
      const year = parseInt(item.year)
      return !isNaN(year) && year >= cutoffYear
    })
  }

  // Filter data by time period based on date field
  const filterDataByDate = (data: any[], period: TimePeriod, dateField: string = 'date') => {
    const cutoff = getCutoffDate(period)
    if (!cutoff) return data
    
    return data.filter(item => {
      const itemDate = new Date(item[dateField])
      return itemDate >= cutoff
    })
  }

  // Group budget data by year or month
  const groupedBudgetVsActualData = useMemo(() => {
    // Helper to distribute a year's allocation across its months proportionally by days
    const distributeYearToMonths = (year: number, amount: number): Map<string, number> => {
      const monthMap = new Map<string, number>()
      const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 100 === 0 && year % 400 === 0)
      const daysInYear = isLeapYear ? 366 : 365
      
      // Days in each month
      const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
      
      for (let month = 0; month < 12; month++) {
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
        const allocatedAmount = (amount * daysInMonth[month]) / daysInYear
        monthMap.set(monthKey, allocatedAmount)
      }
      
      return monthMap
    }

    // If we have raw props, use them to support proportional allocation
    if (budgets.length > 0 || transactions.length > 0) {
      const grouped: any = {}

      // Process Budgets
      budgets.forEach((budget: any) => {
        // Determine allocations based on method
        let allocations: { year: number; amount: number }[] = []
        
        if (allocationMethod === 'proportional') {
          allocations = splitBudgetAcrossYears(budget)
        } else {
          // Period start allocation
          if (budget.period_start) {
            const startDate = new Date(budget.period_start)
            if (!isNaN(startDate.getTime())) {
              // Get value (prefer USD)
              let value = parseFloat(String(budget.usd_value)) || 0
              if (!value && budget.currency === 'USD' && budget.value) {
                value = parseFloat(String(budget.value)) || 0
              }
              if (value) {
                allocations = [{ year: startDate.getFullYear(), amount: value }]
              }
            }
          }
        }

        allocations.forEach(({ year, amount }) => {
          if (budgetGroupBy === 'year') {
            const key = year.toString()
            if (!grouped[key]) {
              grouped[key] = { period: key, year: year, sortKey: key, budget: 0, actual: 0 }
            }
            grouped[key].budget += amount
          } else {
            // Monthly grouping
            const monthAllocations = distributeYearToMonths(year, amount)
            monthAllocations.forEach((monthAmount, monthKey) => {
              // monthKey is "YYYY-MM"
              const [y, m] = monthKey.split('-')
              const dateObj = new Date(parseInt(y), parseInt(m) - 1, 1)
              const period = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
              
              if (!grouped[monthKey]) {
                grouped[monthKey] = { period, sortKey: monthKey, budget: 0, actual: 0 }
              }
              grouped[monthKey].budget += monthAmount
            })
          }
        })
      })

      // Process Transactions (Actuals)
      transactions.forEach((tx: any) => {
        // Only include disbursements (3) and expenditures (4)
        if (tx.transaction_type !== '3' && tx.transaction_type !== '4') return

        // Determine allocations
        let allocations: { year: number; amount: number }[] = []
        
        // For transactions, we check allocationMethod
        const txToProcess = allocationMethod === 'proportional' 
            ? tx 
            : { ...tx, period_start: null, period_end: null }
            
        allocations = splitTransactionAcrossYears(txToProcess)

        allocations.forEach(({ year, amount }) => {
          if (budgetGroupBy === 'year') {
            const key = year.toString()
            if (!grouped[key]) {
              grouped[key] = { period: key, year: year, sortKey: key, budget: 0, actual: 0 }
            }
            grouped[key].actual += amount
          } else {
            // Monthly grouping
            const monthAllocations = distributeYearToMonths(year, amount)
            monthAllocations.forEach((monthAmount, monthKey) => {
              const [y, m] = monthKey.split('-')
              const dateObj = new Date(parseInt(y), parseInt(m) - 1, 1)
              const period = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
              
              if (!grouped[monthKey]) {
                grouped[monthKey] = { period, sortKey: monthKey, budget: 0, actual: 0 }
              }
              grouped[monthKey].actual += monthAmount
            })
          }
        })
      })

      const sortedData = Object.values(grouped).sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey))
      
      // Fill missing years/months if needed
      if (budgetGroupBy === 'year' && sortedData.length > 0) {
        const firstYear = parseInt(sortedData[0].year || sortedData[0].period)
        const lastYear = parseInt(sortedData[sortedData.length - 1].year || sortedData[sortedData.length - 1].period)
        const filledData: any[] = []

        for (let year = firstYear; year <= lastYear; year++) {
          const existing = sortedData.find((item: any) => (item.year || parseInt(item.period)) === year)
          if (existing) {
            filledData.push(existing)
          } else {
            filledData.push({
              period: year.toString(),
              year: year,
              sortKey: year.toString(),
              budget: 0,
              actual: 0
            })
          }
        }
        return filledData
      }

      return sortedData
    }

    // Fallback to existing logic for rawBudgetVsActualData (from API)
    if (rawBudgetVsActualData.length === 0) return []

    const grouped: any = {}

    rawBudgetVsActualData.forEach((item: any) => {
      let period: string
      let periodKey: string
      let sortKey: string

      if (budgetGroupBy === 'month' && item.date) {
        const dateObj = new Date(item.date)
        period = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        periodKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
        sortKey = periodKey
      } else {
        period = item.year?.toString() || 'Unknown'
        periodKey = period
        sortKey = period
      }

      if (!grouped[periodKey]) {
        grouped[periodKey] = {
          period,
          year: budgetGroupBy === 'year' ? item.year : undefined,
          sortKey,
          budget: 0,
          actual: 0
        }
      }

      grouped[periodKey].budget += item.budget || 0
      grouped[periodKey].actual += item.actual || 0
    })

    const sortedData = Object.values(grouped).sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey))

    // Fill in missing years for year grouping
    if (budgetGroupBy === 'year' && sortedData.length > 0) {
      const firstYear = parseInt(sortedData[0].year)
      const lastYear = parseInt(sortedData[sortedData.length - 1].year)
      const filledData: any[] = []

      for (let year = firstYear; year <= lastYear; year++) {
        const existing = sortedData.find((item: any) => item.year === year)
        if (existing) {
          filledData.push(existing)
        } else {
          filledData.push({
            period: year.toString(),
            year: year,
            sortKey: year.toString(),
            budget: 0,
            actual: 0
          })
        }
      }

      return filledData
    }

    return sortedData
  }, [rawBudgetVsActualData, budgetGroupBy, budgets, transactions, allocationMethod])

  // Create cumulative budget data from grouped data
  const cumulativeBudgetData = useMemo(() => {
    if (groupedBudgetVsActualData.length === 0) return []

    let cumulativeBudget = 0
    let cumulativeActual = 0

    return groupedBudgetVsActualData.map((item: any) => {
      cumulativeBudget += item.budget
      cumulativeActual += item.actual

      return {
        ...item,
        budget: cumulativeBudget,
        actual: cumulativeActual
      }
    })
  }, [groupedBudgetVsActualData])

  // Group disbursement data by year or month
  const groupedDisbursementData = useMemo(() => {
    if (rawDisbursementData.length === 0) return []
    
    const grouped: any = {}
    
    rawDisbursementData.forEach((item: any) => {
      let period: string
      let periodKey: string
      let sortKey: string
      let timestamp = item.timestamp
      
      if (disbursementGroupBy === 'year' && item.date) {
        const dateObj = new Date(item.date)
        period = dateObj.getFullYear().toString()
        periodKey = period
        sortKey = period
      } else {
        period = item.period
        periodKey = item.sortKey || item.period
        sortKey = periodKey
      }
      
      if (!grouped[periodKey]) {
        grouped[periodKey] = {
          period,
          sortKey,
          timestamp,
          date: item.date,
          planned: 0,
          actual: 0
        }
      }
      
      grouped[periodKey].planned += item.planned || 0
      grouped[periodKey].actual += item.actual || 0
    })
    
    return Object.values(grouped).sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey))
  }, [rawDisbursementData, disbursementGroupBy])

  // Cumulative disbursement data calculation
  const cumulativeDisbursementData = useMemo(() => {
    if (groupedDisbursementData.length === 0) return []

    let cumulativePlanned = 0
    let cumulativeActual = 0

    return groupedDisbursementData.map((item: any) => {
      cumulativePlanned += item.planned
      cumulativeActual += item.actual

      return {
        ...item,
        planned: cumulativePlanned,
        actual: cumulativeActual
      }
    })
  }, [groupedDisbursementData])

  // Filtered data using useMemo for performance
  const filteredBudgetVsActual = useMemo(
    () => filterDataByYear(isBudgetCumulative ? cumulativeBudgetData : groupedBudgetVsActualData, budgetTimePeriod),
    [groupedBudgetVsActualData, cumulativeBudgetData, budgetTimePeriod, isBudgetCumulative]
  )

  // Process budget data for continuous time scale with timestamps
  const processedBudgetVsActual = useMemo(() => {
    if (filteredBudgetVsActual.length === 0) return []

    // For year grouping, the data already has year field - just add timestamps and fullDate
    if (budgetGroupBy === 'year') {
      return filteredBudgetVsActual.map(item => ({
        ...item,
        timestamp: new Date(`${item.year}-01-01`).getTime(),
        fullDate: item.year
      }))
    }

    // For month grouping, fill missing months and add timestamps
    const filled = fillMissingMonths(filteredBudgetVsActual, 'period', isBudgetCumulative)
    return filled.map(item => ({
      ...item,
      timestamp: new Date(item.period).getTime(),
      fullDate: format(new Date(item.period), 'MMM yyyy')
    }))
  }, [filteredBudgetVsActual, budgetGroupBy, isBudgetCumulative])

  const filteredCumulativeData = useMemo(
    () => filterDataByDate(cumulativeData, cumulativeTimePeriod, 'date'),
    [cumulativeData, cumulativeTimePeriod]
  )

  const filteredDisbursementData = useMemo(
    () => filterDataByDate(isDisbursementCumulative ? cumulativeDisbursementData : groupedDisbursementData, disbursementTimePeriod, 'date'),
    [groupedDisbursementData, cumulativeDisbursementData, disbursementTimePeriod, isDisbursementCumulative]
  )

  // Process disbursement data for continuous time scale with timestamps
  const processedDisbursementData = useMemo(() => {
    if (filteredDisbursementData.length === 0) return []

    // For year grouping
    if (disbursementGroupBy === 'year') {
      return filteredDisbursementData.map(item => ({
        ...item,
        timestamp: new Date(`${item.period}-01-01`).getTime(),
        fullDate: item.period
      }))
    }

    // For month grouping, fill missing months and add timestamps
    const filled = fillMissingMonths(filteredDisbursementData, 'date', isDisbursementCumulative)
    return filled.map(item => ({
      ...item,
      timestamp: new Date(item.date).getTime(),
      fullDate: format(new Date(item.date), 'MMM yyyy')
    }))
  }, [filteredDisbursementData, disbursementGroupBy, isDisbursementCumulative])

  // Time period filter component
  const TimePeriodFilter = ({
    value,
    onChange,
    label
  }: {
    value: TimePeriod
    onChange: (period: TimePeriod) => void
    label?: string
  }) => {
    const periods: { value: TimePeriod; label: string }[] = [
      { value: '1m', label: '1 Month' },
      { value: '3m', label: '3 Months' },
      { value: '6m', label: '6 Months' },
      { value: '1y', label: '1 Year' },
      { value: '5y', label: '5 Years' },
      { value: 'all', label: 'All Time' },
    ]

    const selectedPeriod = periods.find(p => p.value === value)

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {label && <span className="text-xs font-medium text-slate-600">{label}</span>}
        <Select value={value} onValueChange={(val) => onChange(val as TimePeriod)}>
          <SelectTrigger className="h-8 px-3 border rounded-lg text-sm font-medium bg-white">
            <SelectValue placeholder="Select period">
              {selectedPeriod?.label || 'All Time'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {periods.map(period => (
              <SelectItem key={period.value} value={period.value} className="text-sm">
                {period.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  // Group by toggle component
  const GroupByToggle = ({ 
    value, 
    onChange 
  }: { 
    value: GroupBy
    onChange: (groupBy: GroupBy) => void
  }) => {
    return (
      <div className="flex gap-1">
        <Button
          variant={value === 'year' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange('year')}
          className={`h-7 px-3 text-xs ${
            value === 'year' 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Year
        </Button>
        <Button
          variant={value === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange('month')}
          className={`h-7 px-3 text-xs ${
            value === 'month' 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Month
        </Button>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      const millions = value / 1000000
      return `$${Number.isInteger(millions) ? millions.toFixed(0) : millions.toFixed(1).replace(/\.0$/, '')}m`
    } else if (value >= 1000) {
      const thousands = value / 1000
      return `$${Number.isInteger(thousands) ? thousands.toFixed(0) : thousands.toFixed(1).replace(/\.0$/, '')}k`
    }
    return `$${value.toFixed(0)}`
  }

  const formatTooltipValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}m`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`
    }
    return `$${value.toLocaleString()}`
  }

  // Compact currency formatter for Y-axis (e.g., "5M", "2K") - whole numbers only
  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `${Math.round(value / 1000000000)}B`
    } else if (value >= 1000000) {
      return `${Math.round(value / 1000000)}M`
    } else if (value >= 1000) {
      return `${Math.round(value / 1000)}K`
    }
    return `${Math.round(value)}`
  }

  // Compact currency formatter for tooltips with one decimal (e.g., "50.5M")
  const formatCompactCurrencyTooltip = (value: number) => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${value.toFixed(0)}`
  }

  // Toggle series visibility in the cumulative overview chart
  const handleToggleSeries = (seriesName: string) => {
    setHiddenSeries(prev => {
      const newSet = new Set(prev)
      if (newSet.has(seriesName)) {
        newSet.delete(seriesName)
      } else {
        newSet.add(seriesName)
      }
      return newSet
    })
  }

  // Toggle series visibility in the budget vs actual chart
  const handleToggleBudgetSeries = (seriesName: string) => {
    setHiddenBudgetSeries(prev => {
      const newSet = new Set(prev)
      if (newSet.has(seriesName)) {
        newSet.delete(seriesName)
      } else {
        newSet.add(seriesName)
      }
      return newSet
    })
  }

  // Toggle series visibility in the disbursement chart
  const handleToggleDisbursementSeries = (seriesName: string) => {
    setHiddenDisbursementSeries(prev => {
      const newSet = new Set(prev)
      if (newSet.has(seriesName)) {
        newSet.delete(seriesName)
      } else {
        newSet.add(seriesName)
      }
      return newSet
    })
  }

  // Export cumulative overview data to CSV
  const exportCumulativeOverviewToCSV = () => {
    if (filteredCumulativeOverviewData.length === 0) {
      toast.error('No data to export')
      return
    }

    // Get active series for headers
    const headers = ['Period']
    const seriesOrder = ['Incoming Funds', 'Incoming Commitments', 'Outgoing Commitments', 'Disbursements', 'Expenditures', 'Planned Disbursements', 'Budgets']
    seriesOrder.forEach(series => {
      if (activeSeries.has(series)) {
        headers.push(series)
      }
    })

    // Build CSV content
    let csvContent = headers.join(',') + '\n'

    filteredCumulativeOverviewData.forEach(row => {
      const rowData = [row.displayDate]
      seriesOrder.forEach(series => {
        if (activeSeries.has(series)) {
          rowData.push(row[series] || 0)
        }
      })
      csvContent += rowData.join(',') + '\n'
    })

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${isCumulative ? 'cumulative' : 'periodic'}_financial_overview_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Data exported to CSV')
  }

  // Export chart to JPG
  const exportCumulativeOverviewToJPG = () => {
    if (overviewChartType === 'table' || overviewChartType === 'total') {
      toast.error('JPG export is only available for line and bar chart views')
      return
    }

    const chartContainer = document.querySelector('.cumulative-overview-chart') as HTMLElement
    if (!chartContainer) {
      toast.error('Chart not found')
      return
    }

    // Use html2canvas to capture the chart
    import('html2canvas').then((html2canvas) => {
      html2canvas.default(chartContainer, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: chartContainer.scrollWidth,
        height: chartContainer.scrollHeight,
        windowWidth: chartContainer.scrollWidth,
        windowHeight: chartContainer.scrollHeight,
        onclone: (clonedDoc) => {
          const clonedContainer = clonedDoc.querySelector('.cumulative-overview-chart') as HTMLElement
          if (clonedContainer) {
            // Force consistent font rendering
            clonedContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif'
            // Ensure full width is captured
            clonedContainer.style.width = chartContainer.scrollWidth + 'px'
            clonedContainer.style.overflow = 'visible'
          }
        }
      }).then((canvas) => {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${isCumulative ? 'cumulative' : 'periodic'}_financial_overview_${new Date().toISOString().split('T')[0]}.jpg`
            link.click()
            URL.revokeObjectURL(url)
            toast.success('Chart exported to JPG')
          }
        }, 'image/jpeg', 0.95)
      }).catch((error) => {
        console.error('Error exporting chart:', error)
        toast.error('Failed to export chart')
      })
    }).catch((error) => {
      console.error('Error loading html2canvas:', error)
      toast.error('Failed to load export library')
    })
  }

  // Export budget vs actual data to CSV
  const exportBudgetVsActualToCSV = () => {
    if (filteredBudgetVsActual.length === 0) {
      toast.error('No data to export')
      return
    }

    // Build CSV content
    const headers = ['Period', 'Budget', 'Actual Spending']
    let csvContent = headers.join(',') + '\n'

    filteredBudgetVsActual.forEach(row => {
      const period = budgetGroupBy === 'year' ? row.year : row.period
      const rowData = [period, row.budget || 0, row.actual || 0]
      csvContent += rowData.join(',') + '\n'
    })

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${isBudgetCumulative ? 'cumulative' : 'periodic'}_budget_vs_actual_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Data exported to CSV')
  }

  // Export budget vs actual chart to JPG
  const exportBudgetVsActualToJPG = () => {
    if (budgetChartType === 'table' || budgetChartType === 'total') {
      toast.error('JPG export is only available for line and bar chart views')
      return
    }

    const chartContainer = document.querySelector('.budget-vs-actual-chart') as HTMLElement
    if (!chartContainer) {
      toast.error('Chart not found')
      return
    }

    // Use html2canvas to capture the chart
    import('html2canvas').then((html2canvas) => {
      html2canvas.default(chartContainer, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: chartContainer.scrollWidth,
        height: chartContainer.scrollHeight,
        windowWidth: chartContainer.scrollWidth,
        windowHeight: chartContainer.scrollHeight,
        onclone: (clonedDoc) => {
          const clonedContainer = clonedDoc.querySelector('.budget-vs-actual-chart') as HTMLElement
          if (clonedContainer) {
            // Force consistent font rendering
            clonedContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif'
            // Ensure full width is captured
            clonedContainer.style.width = chartContainer.scrollWidth + 'px'
            clonedContainer.style.overflow = 'visible'
          }
        }
      }).then((canvas) => {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${isBudgetCumulative ? 'cumulative' : 'periodic'}_budget_vs_actual_${new Date().toISOString().split('T')[0]}.jpg`
            link.click()
            URL.revokeObjectURL(url)
            toast.success('Chart exported to JPG')
          }
        }, 'image/jpeg', 0.95)
      }).catch((error) => {
        console.error('Error exporting chart:', error)
        toast.error('Failed to export chart')
      })
    }).catch((error) => {
      console.error('Error loading html2canvas:', error)
      toast.error('Failed to load export library')
    })
  }

  // Export disbursement data to CSV
  const exportDisbursementToCSV = () => {
    if (filteredDisbursementData.length === 0) {
      toast.error('No data to export')
      return
    }

    // Build CSV content
    const headers = ['Period', 'Planned', 'Actual']
    let csvContent = headers.join(',') + '\n'

    filteredDisbursementData.forEach(row => {
      const period = disbursementGroupBy === 'year' ? row.period : format(new Date(row.date), 'MMM yyyy')
      const rowData = [period, row.planned || 0, row.actual || 0]
      csvContent += rowData.join(',') + '\n'
    })

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${isDisbursementCumulative ? 'cumulative' : 'periodic'}_disbursements_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Data exported to CSV')
  }

  // Export disbursement chart to JPG
  const exportDisbursementToJPG = () => {
    if (disbursementChartType === 'table') {
      toast.error('JPG export is only available for chart views')
      return
    }

    const chartContainer = document.querySelector('.disbursement-chart') as HTMLElement
    if (!chartContainer) {
      toast.error('Chart not found')
      return
    }

    // Use html2canvas to capture the chart
    import('html2canvas').then((html2canvas) => {
      html2canvas.default(chartContainer, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: chartContainer.scrollWidth,
        height: chartContainer.scrollHeight,
        windowWidth: chartContainer.scrollWidth,
        windowHeight: chartContainer.scrollHeight,
        onclone: (clonedDoc) => {
          const clonedContainer = clonedDoc.querySelector('.disbursement-chart') as HTMLElement
          if (clonedContainer) {
            // Force consistent font rendering
            clonedContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif'
            // Ensure full width is captured
            clonedContainer.style.width = chartContainer.scrollWidth + 'px'
            clonedContainer.style.overflow = 'visible'
          }
        }
      }).then((canvas) => {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${isDisbursementCumulative ? 'cumulative' : 'periodic'}_disbursements_${new Date().toISOString().split('T')[0]}.jpg`
            link.click()
            URL.revokeObjectURL(url)
            toast.success('Chart exported to JPG')
          }
        }, 'image/jpeg', 0.95)
      }).catch((error) => {
        console.error('Error exporting chart:', error)
        toast.error('Failed to export chart')
      })
    }).catch((error) => {
      console.error('Error loading html2canvas:', error)
      toast.error('Failed to load export library')
    })
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Filter out entries with zero or null values
      const nonZeroPayload = payload.filter((entry: any) => entry.value != null && entry.value !== 0)

      if (nonZeroPayload.length === 0) {
        return null
      }

      // Try to get full date from the data point, fallback to label
      const fullDate = payload[0]?.payload?.fullDate || label

      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
            <p className="font-semibold text-slate-900 text-sm">{fullDate}</p>
          </div>
          <div className="p-2">
            <table className="w-full text-sm">
              <tbody>
                {nonZeroPayload.map((entry: any, index: number) => (
                  <tr key={index} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-1.5 pr-4 flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-slate-700 font-medium">{entry.name}</span>
                    </td>
                    <td className="py-1.5 text-right font-semibold text-slate-900">
                      {formatTooltipValue(entry.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }
    return null
  }

  // Color palette: Primary Scarlet, Pale Slate, Blue Slate, Cool Steel, Platinum
  const COLORS = ['#dc2625', '#4c5568', '#7b95a7', '#cfd0d5', '#f1f4f8']

  // Process cumulative overview data - all transaction types, planned disbursements, and budgets
  const cumulativeOverviewData = useMemo(() => {
    // Early return if no data to process
    if ((!transactions || transactions.length === 0) &&
        (!plannedDisbursements || plannedDisbursements.length === 0) &&
        (!budgets || budgets.length === 0)) {
      return {
        data: [],
        hasSourceData: {
          incomingFunds: false,
          incomingCommitments: false,
          outgoingCommitments: false,
          disbursements: false,
          expenditures: false,
          plannedDisbursements: false,
          plannedBudgets: false
        }
      }
    }

    // Collect all date points from transactions, planned disbursements, and budgets
    interface DatePoint {
      date: Date
      timestamp: number
      incomingFunds: number
      incomingCommitments: number
      outgoingCommitments: number
      disbursements: number
      expenditures: number
      plannedDisbursements: number
      plannedBudgets: number
    }

    const dateMap = new Map<string, DatePoint>()

    // Track which series have actual source data (not just zeros from initialization)
    const hasSourceData = {
      incomingFunds: false,
      incomingCommitments: false,
      outgoingCommitments: false,
      disbursements: false,
      expenditures: false,
      plannedDisbursements: false,
      plannedBudgets: false
    }

    // Helper to distribute a year's allocation across its months proportionally by days
    const distributeYearToMonths = (year: number, amount: number): Map<string, number> => {
      const monthMap = new Map<string, number>()
      const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 100 === 0 && year % 400 === 0)
      const daysInYear = isLeapYear ? 366 : 365
      
      // Days in each month
      const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
      
      for (let month = 0; month < 12; month++) {
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
        const allocatedAmount = (amount * daysInMonth[month]) / daysInYear
        monthMap.set(monthKey, allocatedAmount)
      }
      
      return monthMap
    }

    // Process transactions by type
    // For transactions, allocate to the specific month of the transaction date
    transactions?.forEach((transaction: any) => {
      // Apply proportional allocation if enabled
      // If allocation method is NOT proportional, we force single-date behavior
      const txToProcess = allocationMethod === 'proportional' 
        ? transaction 
        : { ...transaction, period_start: null, period_end: null }

      const yearAllocations = splitTransactionAcrossYears(txToProcess)

      yearAllocations.forEach(({ year, amount }) => {
        // Distribute year allocation across months
        const monthAllocations = distributeYearToMonths(year, amount)
        
        monthAllocations.forEach((monthAmount, monthKey) => {
          const [yearNum, monthNum] = monthKey.split('-').map(Number)
          const monthStartDate = new Date(yearNum, monthNum - 1, 1)
          const dateKey = monthStartDate.toISOString().split('T')[0]
          
          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, {
              date: monthStartDate,
              timestamp: monthStartDate.getTime(),
              incomingFunds: 0,
              incomingCommitments: 0,
              outgoingCommitments: 0,
              disbursements: 0,
              expenditures: 0,
              plannedDisbursements: 0,
              plannedBudgets: 0
            })
          }

          const point = dateMap.get(dateKey)!
          const type = transaction.transaction_type

          if (type === '1' || type === '12') {
            point.incomingFunds += monthAmount
            hasSourceData.incomingFunds = true
          } else if (type === '11') {
            point.incomingCommitments += monthAmount
            hasSourceData.incomingCommitments = true
          } else if (type === '2') {
            point.outgoingCommitments += monthAmount
            hasSourceData.outgoingCommitments = true
          } else if (type === '3') {
            point.disbursements += monthAmount
            hasSourceData.disbursements = true
          } else if (type === '4') {
            point.expenditures += monthAmount
            hasSourceData.expenditures = true
          }
        })
      })
    })

    // Process planned disbursements
    plannedDisbursements?.forEach((pd: any) => {
      if (allocationMethod === 'proportional') {
        // Use year-based proportional allocation
        const yearAllocations = splitPlannedDisbursementAcrossYears(pd)
        
        yearAllocations.forEach(({ year, amount }) => {
          // Distribute year allocation across months
          const monthAllocations = distributeYearToMonths(year, amount)
          
          monthAllocations.forEach((monthAmount, monthKey) => {
            const [yearNum, monthNum] = monthKey.split('-').map(Number)
            const monthStartDate = new Date(yearNum, monthNum - 1, 1)
            const dateKey = monthStartDate.toISOString().split('T')[0]
            
            if (!dateMap.has(dateKey)) {
              dateMap.set(dateKey, {
                date: monthStartDate,
                timestamp: monthStartDate.getTime(),
                incomingFunds: 0,
                incomingCommitments: 0,
                outgoingCommitments: 0,
                disbursements: 0,
                expenditures: 0,
                plannedDisbursements: 0,
                plannedBudgets: 0
              })
            }
            
            dateMap.get(dateKey)!.plannedDisbursements += monthAmount
            hasSourceData.plannedDisbursements = true
          })
        })
      } else {
        // Period start allocation: full amount at start date
        if (pd.period_start) {
          const startDate = new Date(pd.period_start)
          if (!isNaN(startDate.getTime())) {
            const dateKey = startDate.toISOString().split('T')[0]
            
            if (!dateMap.has(dateKey)) {
              dateMap.set(dateKey, {
                date: startDate,
                timestamp: startDate.getTime(),
                incomingFunds: 0,
                incomingCommitments: 0,
                outgoingCommitments: 0,
                disbursements: 0,
                expenditures: 0,
                plannedDisbursements: 0,
                plannedBudgets: 0
              })
            }
            
            // Get value (prefer USD)
            let value = parseFloat(String(pd.usd_amount)) || 0
            if (!value && pd.currency === 'USD' && pd.amount) {
              value = parseFloat(String(pd.amount)) || 0
            }
            
            if (value) {
              dateMap.get(dateKey)!.plannedDisbursements += value
              hasSourceData.plannedDisbursements = true
            }
          }
        }
      }
    })

    // Process budgets
    budgets?.forEach((budget: any) => {
      if (allocationMethod === 'proportional') {
        // Use year-based proportional allocation
        const yearAllocations = splitBudgetAcrossYears(budget)
        
        yearAllocations.forEach(({ year, amount }) => {
          // Distribute year allocation across months
          const monthAllocations = distributeYearToMonths(year, amount)
          
          monthAllocations.forEach((monthAmount, monthKey) => {
            const [yearNum, monthNum] = monthKey.split('-').map(Number)
            const monthStartDate = new Date(yearNum, monthNum - 1, 1)
            const dateKey = monthStartDate.toISOString().split('T')[0]
            
            if (!dateMap.has(dateKey)) {
              dateMap.set(dateKey, {
                date: monthStartDate,
                timestamp: monthStartDate.getTime(),
                incomingFunds: 0,
                incomingCommitments: 0,
                outgoingCommitments: 0,
                disbursements: 0,
                expenditures: 0,
                plannedDisbursements: 0,
                plannedBudgets: 0
              })
            }
            
            dateMap.get(dateKey)!.plannedBudgets += monthAmount
            hasSourceData.plannedBudgets = true
          })
        })
      } else {
        // Period start allocation: full amount at start date
        if (budget.period_start) {
          const startDate = new Date(budget.period_start)
          if (!isNaN(startDate.getTime())) {
            const dateKey = startDate.toISOString().split('T')[0]
            
            if (!dateMap.has(dateKey)) {
              dateMap.set(dateKey, {
                date: startDate,
                timestamp: startDate.getTime(),
                incomingFunds: 0,
                incomingCommitments: 0,
                outgoingCommitments: 0,
                disbursements: 0,
                expenditures: 0,
                plannedDisbursements: 0,
                plannedBudgets: 0
              })
            }
            
            // Get value (prefer USD)
            let value = parseFloat(String(budget.usd_value)) || 0
            if (!value && budget.currency === 'USD' && budget.value) {
              value = parseFloat(String(budget.value)) || 0
            }
            
            if (value) {
              dateMap.get(dateKey)!.plannedBudgets += value
              hasSourceData.plannedBudgets = true
            }
          }
        }
      }
    })

    // Convert to array and sort by date
    const sortedPoints = Array.from(dateMap.values()).sort((a, b) => a.timestamp - b.timestamp)

    // Calculate cumulative values
    let cumulativeIncomingFunds = 0
    let cumulativeIncomingCommitments = 0
    let cumulativeOutgoingCommitments = 0
    let cumulativeDisbursements = 0
    let cumulativeExpenditures = 0
    let cumulativePlannedDisbursements = 0
    let cumulativePlannedBudgets = 0

    // Aggregate into monthly buckets for cleaner, more consistent visualization
    const monthlyMap = new Map<string, any>()
    
    sortedPoints.forEach((point) => {
      cumulativeIncomingFunds += point.incomingFunds
      cumulativeIncomingCommitments += point.incomingCommitments
      cumulativeOutgoingCommitments += point.outgoingCommitments
      cumulativeDisbursements += point.disbursements
      cumulativeExpenditures += point.expenditures
      cumulativePlannedDisbursements += point.plannedDisbursements
      cumulativePlannedBudgets += point.plannedBudgets

      // Use year-month as key for monthly aggregation
      const monthKey = `${point.date.getFullYear()}-${String(point.date.getMonth() + 1).padStart(2, '0')}`
      
      // Keep the latest cumulative values for each month (end of month snapshot)
      monthlyMap.set(monthKey, {
        date: point.date.toISOString(),
        timestamp: point.timestamp,
        monthKey,
        displayDate: point.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        fullDate: point.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        'Incoming Funds': cumulativeIncomingFunds,
        'Incoming Commitments': cumulativeIncomingCommitments,
        'Outgoing Commitments': cumulativeOutgoingCommitments,
        'Disbursements': cumulativeDisbursements,
        'Expenditures': cumulativeExpenditures,
        'Planned Disbursements': cumulativePlannedDisbursements,
        'Budgets': cumulativePlannedBudgets
      })
    })

    const sortedData = Array.from(monthlyMap.values()).sort((a, b) => a.timestamp - b.timestamp)

    // Fill in missing months to ensure continuous time axis
    if (sortedData.length === 0) return {
      data: [],
      hasSourceData: {
        incomingFunds: false,
        incomingCommitments: false,
        outgoingCommitments: false,
        disbursements: false,
        expenditures: false,
        plannedDisbursements: false,
        plannedBudgets: false
      }
    }

    const filledData: any[] = []
    const firstDate = new Date(sortedData[0].timestamp)
    const lastDate = new Date(sortedData[sortedData.length - 1].timestamp)

    // Create a map for quick lookup
    const dataMap = new Map(sortedData.map(d => [d.monthKey, d]))

    // Iterate through all months from first to last
    let currentDate = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1)
    const endDate = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1)

    let lastCumulativeValues = {
      incomingFunds: 0,
      incomingCommitments: 0,
      outgoingCommitments: 0,
      disbursements: 0,
      expenditures: 0,
      plannedDisbursements: 0,
      plannedBudgets: 0
    }

    while (currentDate <= endDate) {
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`

      if (dataMap.has(monthKey)) {
        const existingData = dataMap.get(monthKey)!
        filledData.push(existingData)
        // Update last known cumulative values
        lastCumulativeValues = {
          incomingFunds: existingData['Incoming Funds'],
          incomingCommitments: existingData['Incoming Commitments'],
          outgoingCommitments: existingData['Outgoing Commitments'],
          disbursements: existingData['Disbursements'],
          expenditures: existingData['Expenditures'],
          plannedDisbursements: existingData['Planned Disbursements'],
          plannedBudgets: existingData['Budgets']
        }
      } else {
        // Fill missing month with last cumulative values (carry forward) for transactions
        // but set Budgets to null so only actual budget points are plotted
        filledData.push({
          date: currentDate.toISOString(),
          timestamp: currentDate.getTime(),
          monthKey,
          displayDate: currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          fullDate: currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          'Incoming Funds': lastCumulativeValues.incomingFunds,
          'Incoming Commitments': lastCumulativeValues.incomingCommitments,
          'Outgoing Commitments': lastCumulativeValues.outgoingCommitments,
          'Disbursements': lastCumulativeValues.disbursements,
          'Expenditures': lastCumulativeValues.expenditures,
          'Planned Disbursements': lastCumulativeValues.plannedDisbursements,
          'Budgets': null  // null for months without budget data
        })
      }

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    return { data: filledData, hasSourceData }
  }, [transactions, plannedDisbursements, budgets, allocationMethod])

  // Create non-cumulative (periodic) data from the cumulative data
  const periodicOverviewData = useMemo(() => {
    if (cumulativeOverviewData.data.length === 0) return []

    return cumulativeOverviewData.data.map((item, index) => {
      if (index === 0) {
        // First period shows the values as-is (they represent the period total)
        return { ...item }
      }

      // Calculate the difference from previous period
      const prevItem = cumulativeOverviewData.data[index - 1]
      return {
        ...item,
        'Incoming Funds': item['Incoming Funds'] - prevItem['Incoming Funds'],
        'Incoming Commitments': item['Incoming Commitments'] - prevItem['Incoming Commitments'],
        'Outgoing Commitments': item['Outgoing Commitments'] - prevItem['Outgoing Commitments'],
        'Disbursements': item['Disbursements'] - prevItem['Disbursements'],
        'Expenditures': item['Expenditures'] - prevItem['Expenditures'],
        'Planned Disbursements': item['Planned Disbursements'] - prevItem['Planned Disbursements'],
        'Budgets': item['Budgets'] - prevItem['Budgets']
      }
    })
  }, [cumulativeOverviewData])

  // Filter overview data by time period (use cumulative or periodic based on toggle)
  const filteredCumulativeOverviewData = useMemo(
    () => filterDataByDate(isCumulative ? cumulativeOverviewData.data : periodicOverviewData, overviewTimePeriod, 'date'),
    [cumulativeOverviewData, periodicOverviewData, overviewTimePeriod, isCumulative]
  )

  // Process data for continuous time scale with timestamps
  const processedCumulativeOverviewData = useMemo(() => {
    if (filteredCumulativeOverviewData.length === 0) return []

    // Fill missing months and add timestamps
    const filled = fillMissingMonths(filteredCumulativeOverviewData, 'date', isCumulative)
    return filled.map(item => ({
      ...item,
      timestamp: new Date(item.date).getTime(),
      fullDate: format(new Date(item.date), 'MMM yyyy')
    }))
  }, [filteredCumulativeOverviewData, isCumulative])

  // Determine which series have actual source data to show in legend
  const activeSeries = useMemo(() => {
    const series = new Set<string>()
    const sourceDataMap = {
      'Incoming Funds': cumulativeOverviewData.hasSourceData.incomingFunds,
      'Incoming Commitments': cumulativeOverviewData.hasSourceData.incomingCommitments,
      'Outgoing Commitments': cumulativeOverviewData.hasSourceData.outgoingCommitments,
      'Disbursements': cumulativeOverviewData.hasSourceData.disbursements,
      'Expenditures': cumulativeOverviewData.hasSourceData.expenditures,
      'Planned Disbursements': cumulativeOverviewData.hasSourceData.plannedDisbursements,
      'Budgets': cumulativeOverviewData.hasSourceData.plannedBudgets
    }

    Object.entries(sourceDataMap).forEach(([key, hasData]) => {
      if (hasData) series.add(key)
    })

    return series
  }, [cumulativeOverviewData])

  // Calculate total values for overview chart
  const overviewTotalData = useMemo(() => {
    const totals: any = {}

    if (isCumulative) {
      // For cumulative data, use the LAST data point (final cumulative value)
      // Summing cumulative values would be double-counting
      if (filteredCumulativeOverviewData.length > 0) {
        const lastItem = filteredCumulativeOverviewData[filteredCumulativeOverviewData.length - 1]
        Object.keys(lastItem).forEach(key => {
          if (key !== 'date' && key !== 'displayDate' && key !== 'timestamp' && key !== 'fullDate') {
            totals[key] = lastItem[key] || 0
          }
        })
      }
    } else {
      // For periodic data, sum all periods
      filteredCumulativeOverviewData.forEach(item => {
        Object.keys(item).forEach(key => {
          if (key !== 'date' && key !== 'displayDate' && key !== 'timestamp' && key !== 'fullDate') {
            totals[key] = (totals[key] || 0) + (item[key] || 0)
          }
        })
      })
    }

    // Create array of data for bar chart
    const data = []
    const seriesConfig = {
      'Incoming Funds': { color: '#dc2625' },
      'Incoming Commitments': { color: '#4c5568' },
      'Outgoing Commitments': { color: '#7b95a7' },
      'Disbursements': { color: '#dc2625' },
      'Expenditures': { color: '#4c5568' },
      'Planned Disbursements': { color: '#7b95a7' },
      'Budgets': { color: '#cfd0d5' }
    }

    Object.entries(seriesConfig).forEach(([name, config]) => {
      if (activeSeries.has(name) && totals[name] > 0) {
        data.push({
          name,
          value: totals[name],
          color: config.color
        })
      }
    })

    // Sort from largest to smallest
    data.sort((a, b) => b.value - a.value)

    return data
  }, [filteredCumulativeOverviewData, activeSeries, isCumulative])

  // Calculate total values for budget chart
  const budgetTotalData = useMemo(() => {
    let totalBudget = 0
    let totalActual = 0

    if (isBudgetCumulative) {
      // For cumulative data, use the LAST data point (final cumulative value)
      // Summing cumulative values would be double-counting
      if (filteredBudgetVsActual.length > 0) {
        const lastItem = filteredBudgetVsActual[filteredBudgetVsActual.length - 1]
        totalBudget = lastItem.budget || 0
        totalActual = lastItem.actual || 0
      }
    } else {
      // For periodic data, sum all periods
      filteredBudgetVsActual.forEach(item => {
        totalBudget += item.budget || 0
        totalActual += item.actual || 0
      })
    }

    const data = [
      { name: 'Budget', value: totalBudget, color: '#dc2625' },
      { name: 'Actual Spending', value: totalActual, color: '#4c5568' }
    ]

    // Sort from largest to smallest
    data.sort((a, b) => b.value - a.value)

    return data
  }, [filteredBudgetVsActual, isBudgetCumulative])

  // Calculate intelligent tick interval for x-axis based on data points
  const getXAxisInterval = (dataLength: number) => {
    if (dataLength <= 12) return 0 // Show all ticks for 12 or fewer months
    if (dataLength <= 24) return 1 // Show every other tick for up to 2 years
    if (dataLength <= 36) return 2 // Show every 3rd tick for up to 3 years
    if (dataLength <= 60) return 4 // Show every 5th tick (every ~5 months) for up to 5 years
    return Math.floor(dataLength / 12) // Show ~12 ticks for longer periods
  }

  // Helper function to resolve organization name from ID/ref
  // Returns both full name and display name (acronym if available)
  const resolveOrgInfo = useCallback((orgId?: string, orgName?: string, orgRef?: string, orgAcronym?: string): { name: string; displayName: string } => {
    // Try to find organization in the list
    let resolvedOrg: any = null
    
    // Try to find by org ID
    if (orgId) {
      resolvedOrg = organizations.find((o: any) => o.id === orgId)
    }
    
    // Try to find by org ref (iati_org_id or alias_refs)
    if (!resolvedOrg && orgRef) {
      resolvedOrg = organizations.find((o: any) => o.iati_org_id === orgRef)
      if (!resolvedOrg) {
        resolvedOrg = organizations.find((o: any) => 
          o.alias_refs && Array.isArray(o.alias_refs) && o.alias_refs.includes(orgRef)
        )
      }
    }
    
    if (resolvedOrg) {
      const fullName = resolvedOrg.name || orgName || orgRef || 'Unknown'
      const acronym = resolvedOrg.acronym || orgAcronym
      return {
        name: fullName,
        displayName: acronym || fullName
      }
    }
    
    // Fallback to provided values
    const fullName = orgName || orgRef || 'Unknown'
    return {
      name: fullName,
      displayName: orgAcronym || fullName
    }
  }, [organizations])

  // Compute filtered funding source data with provider and receiver information
  const filteredFundingSourceData = useMemo(() => {
    // Maps to store org info by full name (key)
    const orgInfoMap = new Map<string, { name: string; displayName: string }>()
    
    if (fundingSourceType === 'planned') {
      // Group planned disbursements by provider organization
      const byOrg: { [key: string]: number } = {}
      const byReceiver: { [key: string]: number } = {}
      const flows: Array<{ provider: string; providerDisplay: string; receiver: string; receiverDisplay: string; value: number }> = []

      plannedDisbursements?.forEach((pd: any) => {
        const providerInfo = resolveOrgInfo(pd.provider_org_id, pd.provider_org_name, pd.provider_org_ref, pd.provider_org_acronym)
        const receiverInfo = resolveOrgInfo(pd.receiver_org_id, pd.receiver_org_name, pd.receiver_org_ref, pd.receiver_org_acronym)
        
        const provider = providerInfo.name || 'Unknown Provider'
        const receiver = receiverInfo.name || 'Unknown Receiver'
        
        // Store org info for later lookup
        orgInfoMap.set(provider, providerInfo)
        orgInfoMap.set(receiver, receiverInfo)

        // ONLY use USD values
        let amount = parseFloat(pd.usd_amount) || 0
        if (!amount && pd.currency === 'USD' && pd.amount) {
          amount = parseFloat(pd.amount) || 0
        }

        if (amount > 0) {
          byOrg[provider] = (byOrg[provider] || 0) + amount
          byReceiver[receiver] = (byReceiver[receiver] || 0) + amount
          flows.push({ 
            provider, 
            providerDisplay: providerInfo.displayName || provider,
            receiver, 
            receiverDisplay: receiverInfo.displayName || receiver,
            value: amount 
          })
        }
      })

      return {
        providers: Object.entries(byOrg)
          .map(([name, value]) => ({ 
            name, 
            displayName: orgInfoMap.get(name)?.displayName || name,
            value 
          }))
          .sort((a, b) => b.value - a.value),
        receivers: Object.entries(byReceiver)
          .map(([name, value]) => ({ 
            name, 
            displayName: orgInfoMap.get(name)?.displayName || name,
            value 
          }))
          .sort((a, b) => b.value - a.value),
        flows
      }
    } else {
      // Group transactions by provider and receiver organizations
      const byOrg: { [key: string]: number } = {}
      const byReceiver: { [key: string]: number } = {}
      const flows: Array<{ provider: string; providerDisplay: string; receiver: string; receiverDisplay: string; value: number }> = []

      transactions?.forEach((t: any) => {
        // Filter by transaction type
        if (t.transaction_type !== fundingTransactionType) {
          return
        }

        const providerInfo = resolveOrgInfo(t.provider_org_id, t.provider_org_name, t.provider_org_ref, t.provider_org_acronym)
        const receiverInfo = resolveOrgInfo(t.receiver_org_id, t.receiver_org_name, t.receiver_org_ref, t.receiver_org_acronym)
        
        const provider = providerInfo.name || 'Unknown Provider'
        const receiver = receiverInfo.name || 'Unknown Receiver'
        
        // Store org info for later lookup
        orgInfoMap.set(provider, providerInfo)
        orgInfoMap.set(receiver, receiverInfo)

        // ONLY use USD values
        let amount = parseFloat(t.usd_value || t.value_usd) || 0
        if (!amount && t.currency === 'USD' && t.value) {
          amount = parseFloat(t.value) || 0
        }

        if (amount > 0) {
          byOrg[provider] = (byOrg[provider] || 0) + amount
          byReceiver[receiver] = (byReceiver[receiver] || 0) + amount
          flows.push({ 
            provider, 
            providerDisplay: providerInfo.displayName || provider,
            receiver, 
            receiverDisplay: receiverInfo.displayName || receiver,
            value: amount 
          })
        }
      })

      return {
        providers: Object.entries(byOrg)
          .map(([name, value]) => ({ 
            name, 
            displayName: orgInfoMap.get(name)?.displayName || name,
            value 
          }))
          .sort((a, b) => b.value - a.value),
        receivers: Object.entries(byReceiver)
          .map(([name, value]) => ({ 
            name, 
            displayName: orgInfoMap.get(name)?.displayName || name,
            value 
          }))
          .sort((a, b) => b.value - a.value),
        flows
      }
    }
  }, [transactions, plannedDisbursements, fundingSourceType, fundingTransactionType, resolveOrgInfo])

  // Export funding source data to CSV
  const exportFundingSourceToCSV = () => {
    if (!filteredFundingSourceData.providers || filteredFundingSourceData.providers.length === 0) {
      toast.error('No data to export')
      return
    }

    const total = filteredFundingSourceData.providers.reduce((sum, item) => sum + item.value, 0)
    const headers = ['Provider', 'Receiver', 'Amount (USD)', 'Percentage']
    let csvContent = headers.join(',') + '\n'

    // Export flow-by-flow data
    filteredFundingSourceData.flows.forEach(flow => {
      const percentage = ((flow.value / total) * 100).toFixed(2)
      csvContent += `"${flow.provider}","${flow.receiver}",${flow.value},${percentage}%\n`
    })

    // Add total row
    csvContent += `"Total","",${total},100.00%\n`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    const sourceLabel = fundingSourceType === 'planned' ? 'planned_disbursements' : 'transactions'
    const typeLabel = `type_${fundingTransactionType}`
    link.setAttribute('download', `funding_source_${sourceLabel}_${typeLabel}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Data exported to CSV')
  }

  // Export funding source chart to JPG
  const exportFundingSourceToJPG = () => {
    if (fundingChartType === 'table') {
      toast.error('JPG export is only available for chart view')
      return
    }

    const chartContainer = document.querySelector('.funding-source-chart') as HTMLElement
    if (!chartContainer) {
      toast.error('Chart not found')
      return
    }

    import('html2canvas').then((html2canvas) => {
      html2canvas.default(chartContainer, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        onclone: (clonedDoc) => {
          const clonedContainer = clonedDoc.querySelector('.funding-source-chart') as HTMLElement
          if (clonedContainer) {
            clonedContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif'
            clonedContainer.style.width = chartContainer.scrollWidth + 'px'
            clonedContainer.style.overflow = 'visible'
          }
        }
      }).then((canvas) => {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            const sourceLabel = fundingSourceType === 'planned' ? 'planned_disbursements' : 'transactions'
            const typeLabel = `type_${fundingTransactionType}`
            link.download = `funding_source_${sourceLabel}_${typeLabel}_${new Date().toISOString().split('T')[0]}.jpg`
            link.click()
            URL.revokeObjectURL(url)
            toast.success('Chart exported to JPG')
          }
        }, 'image/jpeg', 0.95)
      }).catch((error) => {
        console.error('Error exporting chart:', error)
        toast.error('Failed to export chart')
      })
    }).catch((error) => {
      console.error('Error loading html2canvas:', error)
      toast.error('Failed to load export library')
    })
  }

  if (loading || isPending) {
    return <FinancialAnalyticsSkeleton />
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Cumulative Overview Chart - All Transaction Types, Planned Disbursements, and Budgets */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">
                {isCumulative ? 'Cumulative' : 'Period-by-Period'} Financial Overview
              </CardTitle>
              <CardDescription>
                {isCumulative
                  ? 'Cumulative view of all transaction types, planned disbursements, and planned budgets over time'
                  : 'Period-by-period view showing financial activity for each time period'
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1 border rounded-lg p-1 bg-white">
                <Button
                  variant={isCumulative ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setIsCumulative(true)}
                  className="h-8"
                >
                  Cumulative
                </Button>
                <Button
                  variant={!isCumulative ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setIsCumulative(false)}
                  className="h-8"
                >
                  Periodic
                </Button>
              </div>
              {/* Allocation Method Toggle */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-white">
                  <Label htmlFor="allocation-toggle-overview" className="text-sm text-slate-700 cursor-pointer">
                    {allocationMethod === 'proportional' ? 'Proportional' : 'Period Start'}
                  </Label>
                  <Switch
                    id="allocation-toggle-overview"
                    checked={allocationMethod === 'proportional'}
                    onCheckedChange={(checked) => setAllocationMethod(checked ? 'proportional' : 'period-start')}
                  />
                </div>
                <HelpTextTooltip 
                  content={
                    allocationMethod === 'proportional'
                      ? "Allocates budget and planned disbursement amounts across their time periods. For example, a $100,000 budget from July 2024 to June 2025 will be split proportionally across those 12 months."
                      : "Shows the full budget or planned disbursement amount at its start date. Useful for seeing when amounts were originally planned or committed."
                  }
                />
              </div>
              <div className="flex gap-1 border rounded-lg p-1 bg-white">
                <Button
                  variant={overviewChartType === 'line' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setOverviewChartType('line')}
                  className="h-8 flex-shrink-0"
                  title="Line"
                >
                  <LineChartIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={overviewChartType === 'bar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setOverviewChartType('bar')}
                  className="h-8 flex-shrink-0"
                  title="Bar"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={overviewChartType === 'area' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setOverviewChartType('area')}
                  className="h-8 flex-shrink-0"
                  title="Area"
                >
                  <TrendingUpIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={overviewChartType === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setOverviewChartType('table')}
                  className="h-8 flex-shrink-0"
                  title="Table"
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={overviewChartType === 'total' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setOverviewChartType('total')}
                  className="h-8 flex-shrink-0"
                  title="Total"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportCumulativeOverviewToCSV}
                  className="h-8 px-2"
                  title="Export to CSV"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportCumulativeOverviewToJPG}
                  className="h-8 px-2"
                  title="Export to JPG"
                  disabled={overviewChartType === 'table' || overviewChartType === 'total'}
                >
                  <FileImage className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCumulativeOverviewData.length > 0 ? (
            <>
              {overviewChartType === 'total' ? (
                <div className="cumulative-overview-chart">
                  <ResponsiveContainer width="100%" height={500}>
                    <BarChart data={overviewTotalData} margin={{ top: 20, right: 30, left: 60, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                      <XAxis
                        dataKey="name"
                        stroke="#64748B"
                        fontSize={12}
                        angle={0}
                        textAnchor="middle"
                        height={60}
                      />
                      <YAxis tickFormatter={formatCompactCurrency} stroke="#64748B" fontSize={12} />
                      <Tooltip
                        formatter={(value: any) => [formatCompactCurrencyTooltip(value), '']}
                        separator=""
                        labelStyle={{ color: '#1e293b', fontWeight: 600 }}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={300}>
                        {overviewTotalData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : overviewChartType === 'table' ? (
                <div className="overflow-auto h-[500px] border border-slate-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 bg-white">Period</th>
                        {activeSeries.has('Incoming Funds') && (
                          <th className="text-right py-3 px-4 font-semibold text-slate-700 bg-white">Incoming Funds</th>
                        )}
                        {activeSeries.has('Incoming Commitments') && (
                          <th className="text-right py-3 px-4 font-semibold text-slate-700 bg-white">Incoming Commitments</th>
                        )}
                        {activeSeries.has('Outgoing Commitments') && (
                          <th className="text-right py-3 px-4 font-semibold text-slate-700 bg-white">Outgoing Commitments</th>
                        )}
                        {activeSeries.has('Disbursements') && (
                          <th className="text-right py-3 px-4 font-semibold text-slate-700 bg-white">Disbursements</th>
                        )}
                        {activeSeries.has('Expenditures') && (
                          <th className="text-right py-3 px-4 font-semibold text-slate-700 bg-white">Expenditures</th>
                        )}
                        {activeSeries.has('Planned Disbursements') && (
                          <th className="text-right py-3 px-4 font-semibold text-slate-700 bg-white">Planned Disbursements</th>
                        )}
                        {activeSeries.has('Budgets') && (
                          <th className="text-right py-3 px-4 font-semibold text-slate-700 bg-white">Budgets</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCumulativeOverviewData.map((row, index) => (
                        <tr key={index} className="border-b border-slate-100 hover:bg-muted/50">
                          <td className="py-2.5 px-4 font-medium text-slate-900">{row.displayDate}</td>
                          {activeSeries.has('Incoming Funds') && (
                            <td className="text-right py-2.5 px-4 text-slate-700">{formatTooltipValue(row['Incoming Funds'])}</td>
                          )}
                          {activeSeries.has('Incoming Commitments') && (
                            <td className="text-right py-2.5 px-4 text-slate-700">{formatTooltipValue(row['Incoming Commitments'])}</td>
                          )}
                          {activeSeries.has('Outgoing Commitments') && (
                            <td className="text-right py-2.5 px-4 text-slate-700">{formatTooltipValue(row['Outgoing Commitments'])}</td>
                          )}
                          {activeSeries.has('Disbursements') && (
                            <td className="text-right py-2.5 px-4 text-slate-700">{formatTooltipValue(row['Disbursements'])}</td>
                          )}
                          {activeSeries.has('Expenditures') && (
                            <td className="text-right py-2.5 px-4 text-slate-700">{formatTooltipValue(row['Expenditures'])}</td>
                          )}
                          {activeSeries.has('Planned Disbursements') && (
                            <td className="text-right py-2.5 px-4 text-slate-700">{formatTooltipValue(row['Planned Disbursements'])}</td>
                          )}
                          {activeSeries.has('Budgets') && (
                            <td className="text-right py-2.5 px-4 text-slate-700">{formatTooltipValue(row['Budgets'])}</td>
                          )}
                        </tr>
                      ))}
                      {/* Total Row - Use periodic data to avoid double counting */}
                      {(() => {
                        // Use periodicOverviewData filtered by same time period to calculate totals
                        const periodicFiltered = filterDataByDate(periodicOverviewData, overviewTimePeriod, 'date')
                        const totals = {
                          'Incoming Funds': periodicFiltered.reduce((sum, row) => sum + (row['Incoming Funds'] || 0), 0),
                          'Incoming Commitments': periodicFiltered.reduce((sum, row) => sum + (row['Incoming Commitments'] || 0), 0),
                          'Outgoing Commitments': periodicFiltered.reduce((sum, row) => sum + (row['Outgoing Commitments'] || 0), 0),
                          'Disbursements': periodicFiltered.reduce((sum, row) => sum + (row['Disbursements'] || 0), 0),
                          'Expenditures': periodicFiltered.reduce((sum, row) => sum + (row['Expenditures'] || 0), 0),
                          'Planned Disbursements': periodicFiltered.reduce((sum, row) => sum + (row['Planned Disbursements'] || 0), 0),
                          'Budgets': periodicFiltered.reduce((sum, row) => sum + (row['Budgets'] || 0), 0)
                        }
                        return (
                          <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                            <td className="py-2.5 px-4 text-slate-900">Total</td>
                            {activeSeries.has('Incoming Funds') && (
                              <td className="text-right py-2.5 px-4 text-slate-900">{formatTooltipValue(totals['Incoming Funds'])}</td>
                            )}
                            {activeSeries.has('Incoming Commitments') && (
                              <td className="text-right py-2.5 px-4 text-slate-900">{formatTooltipValue(totals['Incoming Commitments'])}</td>
                            )}
                            {activeSeries.has('Outgoing Commitments') && (
                              <td className="text-right py-2.5 px-4 text-slate-900">{formatTooltipValue(totals['Outgoing Commitments'])}</td>
                            )}
                            {activeSeries.has('Disbursements') && (
                              <td className="text-right py-2.5 px-4 text-slate-900">{formatTooltipValue(totals['Disbursements'])}</td>
                            )}
                            {activeSeries.has('Expenditures') && (
                              <td className="text-right py-2.5 px-4 text-slate-900">{formatTooltipValue(totals['Expenditures'])}</td>
                            )}
                            {activeSeries.has('Planned Disbursements') && (
                              <td className="text-right py-2.5 px-4 text-slate-900">{formatTooltipValue(totals['Planned Disbursements'])}</td>
                            )}
                            {activeSeries.has('Budgets') && (
                              <td className="text-right py-2.5 px-4 text-slate-900">{formatTooltipValue(totals['Budgets'])}</td>
                            )}
                          </tr>
                        )
                      })()}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="cumulative-overview-chart">
                  <ResponsiveContainer width="100%" height={500}>
                    {overviewChartType === 'line' ? (
                    <LineChart 
                      data={processedCumulativeOverviewData} 
                      margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                      key={`overview-line-${allocationMethod}-${isCumulative}-${overviewChartType}`}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                      <XAxis
                        dataKey="timestamp"
                        type="number"
                        scale="time"
                        domain={['dataMin', 'dataMax']}
                        ticks={generateYearTicks(processedCumulativeOverviewData)}
                        tickFormatter={(timestamp) => format(new Date(timestamp), 'yyyy')}
                        stroke="#64748B"
                        fontSize={12}
                        angle={0}
                        textAnchor="middle"
                        height={40}
                      />
                      <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={12} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend content={<CustomInteractiveLegend hiddenSeries={hiddenSeries} onToggleSeries={handleToggleSeries} />} />
                      {activeSeries.has('Incoming Funds') && (
                        <Line
                          type="monotone"
                          dataKey="Incoming Funds"
                          stroke={hiddenSeries.has('Incoming Funds') ? '#cfd0d5' : '#dc2625'}
                          strokeWidth={hiddenSeries.has('Incoming Funds') ? 1 : 3}
                          dot={{ fill: hiddenSeries.has('Incoming Funds') ? '#cfd0d5' : '#dc2625', r: 4 }}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-in-out"
                          opacity={hiddenSeries.has('Incoming Funds') ? 0.3 : 1}
                        />
                      )}
                      {activeSeries.has('Incoming Commitments') && (
                        <Line
                          type="monotone"
                          dataKey="Incoming Commitments"
                          stroke={hiddenSeries.has('Incoming Commitments') ? '#cfd0d5' : '#4c5568'}
                          strokeWidth={hiddenSeries.has('Incoming Commitments') ? 1 : 3}
                          strokeDasharray="8 4"
                          dot={{ fill: hiddenSeries.has('Incoming Commitments') ? '#cfd0d5' : '#4c5568', r: 4 }}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-in-out"
                          opacity={hiddenSeries.has('Incoming Commitments') ? 0.3 : 1}
                        />
                      )}
                      {activeSeries.has('Outgoing Commitments') && (
                        <Line
                          type="monotone"
                          dataKey="Outgoing Commitments"
                          stroke={hiddenSeries.has('Outgoing Commitments') ? '#cfd0d5' : '#7b95a7'}
                          strokeWidth={hiddenSeries.has('Outgoing Commitments') ? 1 : 3}
                          strokeDasharray="12 6"
                          dot={{ fill: hiddenSeries.has('Outgoing Commitments') ? '#cfd0d5' : '#7b95a7', r: 4 }}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-in-out"
                          opacity={hiddenSeries.has('Outgoing Commitments') ? 0.3 : 1}
                        />
                      )}
                      {activeSeries.has('Disbursements') && (
                        <Line
                          type="monotone"
                          dataKey="Disbursements"
                          stroke={hiddenSeries.has('Disbursements') ? '#cfd0d5' : '#dc2625'}
                          strokeWidth={hiddenSeries.has('Disbursements') ? 1 : 3}
                          dot={{ fill: hiddenSeries.has('Disbursements') ? '#cfd0d5' : '#dc2625', r: 4 }}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-in-out"
                          opacity={hiddenSeries.has('Disbursements') ? 0.3 : 1}
                        />
                      )}
                      {activeSeries.has('Expenditures') && (
                        <Line
                          type="monotone"
                          dataKey="Expenditures"
                          stroke={hiddenSeries.has('Expenditures') ? '#cfd0d5' : '#4c5568'}
                          strokeWidth={hiddenSeries.has('Expenditures') ? 1 : 3}
                          strokeDasharray="4 4"
                          dot={{ fill: hiddenSeries.has('Expenditures') ? '#cfd0d5' : '#4c5568', r: 4 }}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-in-out"
                          opacity={hiddenSeries.has('Expenditures') ? 0.3 : 1}
                        />
                      )}
                      {activeSeries.has('Planned Disbursements') && (
                        <Line
                          type="monotone"
                          dataKey="Planned Disbursements"
                          stroke={hiddenSeries.has('Planned Disbursements') ? '#cfd0d5' : '#7b95a7'}
                          strokeWidth={hiddenSeries.has('Planned Disbursements') ? 1 : 2.5}
                          strokeDasharray="5 5"
                          dot={{ fill: hiddenSeries.has('Planned Disbursements') ? '#cfd0d5' : '#7b95a7', r: 3 }}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-in-out"
                          opacity={hiddenSeries.has('Planned Disbursements') ? 0.3 : 1}
                        />
                      )}
                      {activeSeries.has('Budgets') && (
                        <Line
                          type="linear"
                          dataKey="Budgets"
                          stroke={hiddenSeries.has('Budgets') ? '#cfd0d5' : '#cfd0d5'}
                          strokeWidth={hiddenSeries.has('Budgets') ? 1 : 2.5}
                          strokeDasharray="3 3"
                          dot={false}
                          connectNulls={true}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-in-out"
                          opacity={hiddenSeries.has('Budgets') ? 0.3 : 1}
                        />
                      )}
                    </LineChart>
                  ) : overviewChartType === 'area' ? (
                    <AreaChart 
                      data={processedCumulativeOverviewData} 
                      margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                      key={`overview-area-${allocationMethod}-${isCumulative}-${overviewChartType}`}
                    >
                      <defs>
                        <linearGradient id="colorIncomingFunds" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorIncomingCommitments" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorOutgoingCommitments" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorDisbursements" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorExpenditures" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorPlannedDisbursements" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05}/>
                        </linearGradient>
                        <linearGradient id="colorBudgets" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#64748b" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#64748b" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                      <XAxis
                        dataKey="timestamp"
                        type="number"
                        scale="time"
                        domain={['dataMin', 'dataMax']}
                        ticks={generateYearTicks(processedCumulativeOverviewData)}
                        tickFormatter={(timestamp) => format(new Date(timestamp), 'yyyy')}
                        stroke="#64748B"
                        fontSize={12}
                        angle={0}
                        textAnchor="middle"
                        height={40}
                      />
                      <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={12} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend content={<CustomInteractiveLegend hiddenSeries={hiddenSeries} onToggleSeries={handleToggleSeries} />} />
                      {activeSeries.has('Incoming Funds') && (
                        <Area
                          type="monotone"
                          dataKey="Incoming Funds"
                          stroke={hiddenSeries.has('Incoming Funds') ? '#cfd0d5' : '#dc2625'}
                          strokeWidth={hiddenSeries.has('Incoming Funds') ? 1 : 2}
                          fill={hiddenSeries.has('Incoming Funds') ? 'transparent' : 'url(#colorIncomingFunds)'}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-in-out"
                          opacity={hiddenSeries.has('Incoming Funds') ? 0.3 : 1}
                        />
                      )}
                      {activeSeries.has('Incoming Commitments') && (
                        <Area
                          type="monotone"
                          dataKey="Incoming Commitments"
                          stroke={hiddenSeries.has('Incoming Commitments') ? '#cfd0d5' : '#4c5568'}
                          strokeWidth={hiddenSeries.has('Incoming Commitments') ? 1 : 2}
                          fill={hiddenSeries.has('Incoming Commitments') ? 'transparent' : 'url(#colorIncomingCommitments)'}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-in-out"
                          opacity={hiddenSeries.has('Incoming Commitments') ? 0.3 : 1}
                        />
                      )}
                      {activeSeries.has('Outgoing Commitments') && (
                        <Area
                          type="monotone"
                          dataKey="Outgoing Commitments"
                          stroke={hiddenSeries.has('Outgoing Commitments') ? '#cfd0d5' : '#7b95a7'}
                          strokeWidth={hiddenSeries.has('Outgoing Commitments') ? 1 : 2}
                          fill={hiddenSeries.has('Outgoing Commitments') ? 'transparent' : 'url(#colorOutgoingCommitments)'}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-in-out"
                          opacity={hiddenSeries.has('Outgoing Commitments') ? 0.3 : 1}
                        />
                      )}
                      {activeSeries.has('Disbursements') && (
                        <Area
                          type="monotone"
                          dataKey="Disbursements"
                          stroke={hiddenSeries.has('Disbursements') ? '#cfd0d5' : '#dc2625'}
                          strokeWidth={hiddenSeries.has('Disbursements') ? 1 : 2}
                          fill={hiddenSeries.has('Disbursements') ? 'transparent' : 'url(#colorDisbursements)'}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-in-out"
                          opacity={hiddenSeries.has('Disbursements') ? 0.3 : 1}
                        />
                      )}
                      {activeSeries.has('Expenditures') && (
                        <Area
                          type="monotone"
                          dataKey="Expenditures"
                          stroke={hiddenSeries.has('Expenditures') ? '#cfd0d5' : '#4c5568'}
                          strokeWidth={hiddenSeries.has('Expenditures') ? 1 : 2}
                          fill={hiddenSeries.has('Expenditures') ? 'transparent' : 'url(#colorExpenditures)'}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-in-out"
                          opacity={hiddenSeries.has('Expenditures') ? 0.3 : 1}
                        />
                      )}
                      {activeSeries.has('Planned Disbursements') && (
                        <Area
                          type="monotone"
                          dataKey="Planned Disbursements"
                          stroke={hiddenSeries.has('Planned Disbursements') ? '#cfd0d5' : '#7b95a7'}
                          strokeWidth={hiddenSeries.has('Planned Disbursements') ? 1 : 2}
                          strokeDasharray="5 5"
                          fill={hiddenSeries.has('Planned Disbursements') ? 'transparent' : 'url(#colorPlannedDisbursements)'}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-in-out"
                          opacity={hiddenSeries.has('Planned Disbursements') ? 0.3 : 1}
                        />
                      )}
                      {activeSeries.has('Budgets') && (
                        <Area
                          type="linear"
                          dataKey="Budgets"
                          stroke={hiddenSeries.has('Budgets') ? '#cfd0d5' : '#cfd0d5'}
                          strokeWidth={hiddenSeries.has('Budgets') ? 1 : 2}
                          strokeDasharray="3 3"
                          fill={hiddenSeries.has('Budgets') ? 'transparent' : 'url(#colorBudgets)'}
                          connectNulls={true}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-in-out"
                          opacity={hiddenSeries.has('Budgets') ? 0.3 : 1}
                        />
                      )}
                    </AreaChart>
                  ) : (
                    <BarChart 
                      data={processedCumulativeOverviewData} 
                      margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                      key={`overview-bar-${allocationMethod}-${isCumulative}-${overviewChartType}`}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                      <XAxis
                        dataKey="timestamp"
                        type="number"
                        scale="time"
                        domain={['dataMin', 'dataMax']}
                        ticks={generateYearTicks(processedCumulativeOverviewData)}
                        tickFormatter={(timestamp) => format(new Date(timestamp), 'yyyy')}
                        stroke="#64748B"
                        fontSize={12}
                        angle={0}
                        textAnchor="middle"
                        height={40}
                      />
                      <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={12} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend content={<CustomInteractiveLegend hiddenSeries={hiddenSeries} onToggleSeries={handleToggleSeries} />} />
                      {activeSeries.has('Incoming Funds') && (
                        <Bar
                          dataKey="Incoming Funds"
                          fill={hiddenSeries.has('Incoming Funds') ? '#cfd0d5' : '#dc2625'}
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-in-out"
                          opacity={hiddenSeries.has('Incoming Funds') ? 0.3 : 1}
                        />
                      )}
                      {activeSeries.has('Incoming Commitments') && (
                        <Bar
                          dataKey="Incoming Commitments"
                          fill={hiddenSeries.has('Incoming Commitments') ? '#cfd0d5' : '#4c5568'}
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-in-out"
                          opacity={hiddenSeries.has('Incoming Commitments') ? 0.3 : 1}
                        />
                      )}
                      {activeSeries.has('Outgoing Commitments') && (
                        <Bar
                          dataKey="Outgoing Commitments"
                          fill={hiddenSeries.has('Outgoing Commitments') ? '#cfd0d5' : '#7b95a7'}
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-in-out"
                          opacity={hiddenSeries.has('Outgoing Commitments') ? 0.3 : 1}
                        />
                      )}
                      {activeSeries.has('Disbursements') && (
                        <Bar
                          dataKey="Disbursements"
                          fill={hiddenSeries.has('Disbursements') ? '#cfd0d5' : '#dc2625'}
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-in-out"
                          opacity={hiddenSeries.has('Disbursements') ? 0.3 : 1}
                        />
                      )}
                      {activeSeries.has('Expenditures') && (
                        <Bar
                          dataKey="Expenditures"
                          fill={hiddenSeries.has('Expenditures') ? '#cfd0d5' : '#4c5568'}
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-in-out"
                          opacity={hiddenSeries.has('Expenditures') ? 0.3 : 1}
                        />
                      )}
                      {activeSeries.has('Planned Disbursements') && (
                        <Bar
                          dataKey="Planned Disbursements"
                          fill={hiddenSeries.has('Planned Disbursements') ? '#cfd0d5' : '#7b95a7'}
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-in-out"
                          opacity={hiddenSeries.has('Planned Disbursements') ? 0.3 : 1}
                        />
                      )}
                      {activeSeries.has('Budgets') && (
                        <Bar
                          dataKey="Budgets"
                          fill={hiddenSeries.has('Budgets') ? '#cfd0d5' : '#cfd0d5'}
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-in-out"
                          opacity={hiddenSeries.has('Budgets') ? 0.3 : 1}
                        />
                      )}
                    </BarChart>
                  )}
                </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-96 text-slate-400">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No cumulative overview data available</p>
                <p className="text-xs mt-2">Add transactions, planned disbursements, or budgets to see this chart</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget versus Actual Spend Trajectory Chart */}
      <ActivitySpendTrajectoryChart activityId={activityId} />

      {/* Budget vs Actual Spending - Full Width */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">
                {isBudgetCumulative ? 'Cumulative' : 'Period-by-Period'} Budget vs Actual Spending by Year
              </CardTitle>
              <CardDescription>
                {isBudgetCumulative
                  ? 'Cumulative view of planned budgets compared with actual spending over time'
                  : 'Period-by-period view of budgets and actual spending for each time period'
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1 border rounded-lg p-1 bg-white">
                <Button
                  variant={isBudgetCumulative ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setIsBudgetCumulative(true)}
                  className="h-8"
                >
                  Cumulative
                </Button>
                <Button
                  variant={!isBudgetCumulative ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setIsBudgetCumulative(false)}
                  className="h-8"
                >
                  Periodic
                </Button>
              </div>
              <div className="flex gap-1 border rounded-lg p-1 bg-white">
                <Button
                  variant={budgetChartType === 'line' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setBudgetChartType('line')}
                  className="h-8"
                  title="Line"
                >
                  <TrendingUpIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={budgetChartType === 'bar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setBudgetChartType('bar')}
                  className="h-8"
                  title="Bar"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={budgetChartType === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setBudgetChartType('table')}
                  className="h-8"
                  title="Table"
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={budgetChartType === 'total' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setBudgetChartType('total')}
                  className="h-8"
                  title="Total"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportBudgetVsActualToCSV}
                  className="h-8 px-2"
                  title="Export to CSV"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportBudgetVsActualToJPG}
                  className="h-8 px-2"
                  title="Export to JPG"
                  disabled={budgetChartType === 'table' || budgetChartType === 'total'}
                >
                  <FileImage className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredBudgetVsActual.length > 0 ? (
            budgetChartType === 'total' ? (
              <div className="budget-vs-actual-chart">
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart data={budgetTotalData} margin={{ top: 20, right: 30, left: 60, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                    <XAxis
                      dataKey="name"
                      stroke="#64748B"
                      fontSize={12}
                      angle={0}
                      textAnchor="middle"
                      height={40}
                    />
                    <YAxis tickFormatter={formatCompactCurrency} stroke="#64748B" fontSize={12} />
                    <Tooltip
                      formatter={(value: any) => [formatCompactCurrencyTooltip(value), '']}
                      separator=""
                      labelStyle={{ color: '#1e293b', fontWeight: 600 }}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={300}>
                      {budgetTotalData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : budgetChartType === 'table' ? (
              <div className="overflow-auto h-[500px] border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 bg-white">Period</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 bg-white">Budget</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 bg-white">Actual Spending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBudgetVsActual.map((row, index) => (
                      <tr key={index} className="border-b border-slate-100 hover:bg-muted/50">
                        <td className="py-2.5 px-4 font-medium text-slate-900">{budgetGroupBy === 'year' ? row.year : row.period}</td>
                        <td className="text-right py-2.5 px-4 text-slate-700">{formatTooltipValue(row.budget)}</td>
                        <td className="text-right py-2.5 px-4 text-slate-700">{formatTooltipValue(row.actual)}</td>
                      </tr>
                    ))}
                    {/* Total Row - Use periodic data to avoid double counting */}
                    {(() => {
                      // Use groupedBudgetVsActualData (periodic) filtered by same time period to calculate totals
                      const periodicFiltered = filterDataByYear(groupedBudgetVsActualData, budgetTimePeriod)
                      const totals = {
                        budget: periodicFiltered.reduce((sum, row) => sum + (row.budget || 0), 0),
                        actual: periodicFiltered.reduce((sum, row) => sum + (row.actual || 0), 0)
                      }
                      return (
                        <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                          <td className="py-2.5 px-4 text-slate-900">Total</td>
                          <td className="text-right py-2.5 px-4 text-slate-900">{formatTooltipValue(totals.budget)}</td>
                          <td className="text-right py-2.5 px-4 text-slate-900">{formatTooltipValue(totals.actual)}</td>
                        </tr>
                      )
                    })()}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="budget-vs-actual-chart">
                <ResponsiveContainer width="100%" height={500} key={`budget-${budgetGroupBy}-${budgetChartType}-${allocationMethod}`}>
                  {budgetChartType === 'line' ? (
                    <LineChart 
                      data={processedBudgetVsActual} 
                      margin={{ top: 20, right: 30, left: 20, bottom: budgetGroupBy === 'month' ? 80 : 40 }}
                      key={`budget-line-${allocationMethod}-${budgetGroupBy}`}
                    >
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                    <XAxis
                      dataKey="timestamp"
                      type="number"
                      scale="time"
                      domain={[(dataMin) => dataMin - 15768000000, (dataMax) => dataMax + 15768000000]}
                      ticks={generateYearTicks(processedBudgetVsActual)}
                      tickFormatter={(timestamp) => format(new Date(timestamp), 'yyyy')}
                      stroke="#64748B"
                      fontSize={12}
                      angle={0}
                      textAnchor="middle"
                      height={40}
                    />
                    <YAxis domain={[0, (dataMax) => dataMax * 1.1]} tickFormatter={formatCurrency} stroke="#64748B" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend content={<CustomInteractiveLegend hiddenSeries={hiddenBudgetSeries} onToggleSeries={handleToggleBudgetSeries} />} />
                    <Line
                      type="monotone"
                      dataKey="budget"
                      name="Budget"
                      stroke={hiddenBudgetSeries.has('Budget') ? '#cfd0d5' : '#dc2625'}
                      strokeWidth={hiddenBudgetSeries.has('Budget') ? 1 : 2.5}
                      dot={{ fill: hiddenBudgetSeries.has('Budget') ? '#cfd0d5' : '#dc2625', r: 3 }}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                      opacity={hiddenBudgetSeries.has('Budget') ? 0.3 : 1}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name="Actual Spending"
                      stroke={hiddenBudgetSeries.has('Actual Spending') ? '#cfd0d5' : '#4c5568'}
                      strokeWidth={hiddenBudgetSeries.has('Actual Spending') ? 1 : 2.5}
                      dot={{ fill: hiddenBudgetSeries.has('Actual Spending') ? '#cfd0d5' : '#4c5568', r: 3 }}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                      opacity={hiddenBudgetSeries.has('Actual Spending') ? 0.3 : 1}
                    />
                  </LineChart>
                ) : (
                  <BarChart 
                    data={processedBudgetVsActual} 
                    margin={{ top: 20, right: 30, left: 20, bottom: budgetGroupBy === 'month' ? 80 : 40 }}
                    key={`budget-bar-${allocationMethod}-${budgetGroupBy}`}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                    <XAxis
                      dataKey="timestamp"
                      type="number"
                      scale="time"
                      domain={[(dataMin) => dataMin - 15768000000, (dataMax) => dataMax + 15768000000]}
                      ticks={generateYearTicks(processedBudgetVsActual)}
                      tickFormatter={(timestamp) => format(new Date(timestamp), 'yyyy')}
                      stroke="#64748B"
                      fontSize={12}
                      angle={0}
                      textAnchor="middle"
                      height={40}
                    />
                    <YAxis domain={[0, (dataMax) => dataMax * 1.1]} tickFormatter={formatCurrency} stroke="#64748B" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                    <Legend content={<CustomInteractiveLegend hiddenSeries={hiddenBudgetSeries} onToggleSeries={handleToggleBudgetSeries} />} />
                    <Bar
                      dataKey="budget"
                      name="Budget"
                      fill={hiddenBudgetSeries.has('Budget') ? '#cfd0d5' : '#dc2625'}
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                      opacity={hiddenBudgetSeries.has('Budget') ? 0.3 : 1}
                    />
                    <Bar
                      dataKey="actual"
                      name="Actual Spending"
                      fill={hiddenBudgetSeries.has('Actual Spending') ? '#cfd0d5' : '#4c5568'}
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                      opacity={hiddenBudgetSeries.has('Actual Spending') ? 0.3 : 1}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-96 text-slate-400">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No budget vs actual data available</p>
                <p className="text-xs mt-2">Add budgets and transactions to see this chart</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Funding Source Breakdown */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">Funding Source Breakdown</CardTitle>
              <CardDescription>Distribution of funding by donor/provider</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Source Type Toggle */}
              <div className="flex gap-1 border rounded-lg p-1 bg-white">
                <Button
                  variant={fundingSourceType === 'transactions' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFundingSourceType('transactions')}
                  className="h-8"
                >
                  Transactions
                </Button>
                <Button
                  variant={fundingSourceType === 'planned' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFundingSourceType('planned')}
                  className="h-8"
                >
                  Planned
                </Button>
              </div>

              {/* Transaction Type Filter (only show when viewing transactions) */}
              {fundingSourceType === 'transactions' && (
                <div className="flex gap-1 border rounded-lg p-1 bg-white">
                  <Button
                    variant={fundingTransactionType === '1' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFundingTransactionType('1')}
                    className="h-8 text-xs px-2"
                  >
                    Incoming
                  </Button>
                  <Button
                    variant={fundingTransactionType === '2' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFundingTransactionType('2')}
                    className="h-8 text-xs px-2"
                  >
                    Commitment
                  </Button>
                  <Button
                    variant={fundingTransactionType === '3' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFundingTransactionType('3')}
                    className="h-8 text-xs px-2"
                  >
                    Disbursement
                  </Button>
                  <Button
                    variant={fundingTransactionType === '4' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFundingTransactionType('4')}
                    className="h-8 text-xs px-2"
                  >
                    Expenditure
                  </Button>
                </div>
              )}

              {/* View Toggle */}
              <div className="flex gap-1 border rounded-lg p-1 bg-white">
                <Button
                  variant={fundingChartType === 'chart' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFundingChartType('chart')}
                  className="h-8"
                >
                  Chart
                </Button>
                <Button
                  variant={fundingChartType === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFundingChartType('table')}
                  className="h-8"
                >
                  Table
                </Button>
              </div>

              {/* Export Buttons */}
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportFundingSourceToCSV}
                  className="h-8 px-2"
                  title="Export to CSV"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportFundingSourceToJPG}
                  className="h-8 px-2"
                  title="Export to JPG"
                  disabled={fundingChartType === 'table'}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredFundingSourceData.providers && filteredFundingSourceData.providers.length > 0 ? (
            fundingChartType === 'table' ? (
              <div className="overflow-auto h-[500px] border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 bg-white">Provider</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 bg-white">Receiver</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 bg-white">Amount (USD)</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 bg-white">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFundingSourceData.flows.map((flow, index) => {
                      const total = filteredFundingSourceData.providers.reduce((sum, s) => sum + s.value, 0)
                      const percentage = ((flow.value / total) * 100).toFixed(1)
                      return (
                        <tr key={index} className="border-b border-slate-100 hover:bg-muted/50">
                          <td className="py-2.5 px-4 font-medium text-slate-900" title={flow.provider}>
                            {flow.providerDisplay || flow.provider}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-slate-700" title={flow.receiver}>
                            {flow.receiverDisplay || flow.receiver}
                          </td>
                          <td className="text-right py-2.5 px-4 text-slate-700">{formatCurrency(flow.value)}</td>
                          <td className="text-right py-2.5 px-4 text-slate-700">{percentage}%</td>
                        </tr>
                      )
                    })}
                    {/* Total Row */}
                    {(() => {
                      const total = filteredFundingSourceData.flows.reduce((sum, flow) => sum + flow.value, 0)
                      return (
                        <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                          <td className="py-2.5 px-4 text-slate-900" colSpan={2}>Total</td>
                          <td className="text-right py-2.5 px-4 text-slate-900">{formatCurrency(total)}</td>
                          <td className="text-right py-2.5 px-4 text-slate-900">100.0%</td>
                        </tr>
                      )
                    })()}
                  </tbody>
                </table>
              </div>
            ) : (
              <FundingSourceSankey
                data={filteredFundingSourceData}
                fundingSourceType={fundingSourceType}
                fundingTransactionType={fundingTransactionType}
              />
            )
          ) : (
            <div className="flex items-center justify-center h-96 text-slate-400">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No funding source data available</p>
                <p className="text-xs mt-2">Add participating organizations or transactions to see funding breakdown</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


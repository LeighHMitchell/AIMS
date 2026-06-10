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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
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
import { ChartFullscreen, ChartExpandIconButton } from '@/components/charts/ChartFullscreen'
import { FormulaTooltip } from '@/components/ui/formula-tooltip'
import { FinancialTotalsBarChart } from '@/components/analytics/FinancialTotalsBarChart'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { useCalendarYearSelector, CalendarYearSelector } from '@/components/charts/CalendarYearSelector'
import { ChartViewToggle, type ChartViewToggleOption } from '@/components/ui/chart-view-toggle'
import { apiFetch } from '@/lib/api-fetch';
import { cn } from '@/lib/utils'
import { formatAxisCurrency, formatCurrencyCompact } from '@/lib/format'
import { getFinancialSeriesColor, getTransactionTypeColor, BUDGET_COLOR } from '@/lib/chart-colors'

type TimePeriod = '1m' | '3m' | '6m' | '1y' | '5y' | 'all'
type GroupBy = 'year' | 'month'

// Chart-vs-table view toggle (Style 2). Shared across this tab's charts so
// every toggle matches the Analytics Dashboard's standard ChartViewToggle.
const CHART_TABLE_OPTIONS: ChartViewToggleOption<'chart' | 'table'>[] = [
  { value: 'chart', label: 'Chart', icon: BarChart3 },
  { value: 'table', label: 'Table', icon: TableIcon },
]

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

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
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all cursor-pointer hover:bg-muted ${
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
              className={`text-sm ${isHidden ? 'line-through text-muted-foreground' : 'text-foreground'}`}
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

  // Sankey flows use USD-converted values.
  const formatCurrency = (value: number) => formatCurrencyCompact(value)

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
      .attr('class', 'absolute bg-card border border-border rounded-lg shadow-lg text-body pointer-events-none z-50')
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

    // Helper: format org label as "Name (ACRONYM)" when acronym differs from name
    const formatOrgLabel = (name: string, displayName?: string) => {
      if (displayName && displayName !== name) return `${name} (${displayName})`
      return name
    }

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
          // Show "Name (ACRONYM)" format using node data for acronyms
          const provNode = nodeMap.get(`provider-${flow.provider}`)
          const recvNode = nodeMap.get(`receiver-${flow.receiver}`)
          const providerLabel = formatOrgLabel(flow.provider, provNode?.displayName)
          const receiverLabel = formatOrgLabel(flow.receiver, recvNode?.displayName)
          tooltip.html(`
            <div class="bg-muted px-3 py-2 border-b border-border rounded-t-lg">
              <div class="font-semibold text-foreground text-body">${providerLabel} → ${receiverLabel}</div>
            </div>
            <div class="p-2">
              <table class="w-full text-body">
                <tbody>
                  <tr class="border-b border-border last:border-b-0">
                    <td class="py-1.5 pr-4 text-foreground font-medium">Amount</td>
                    <td class="py-1.5 text-right font-semibold text-foreground">${formatCurrency(flow.value)}</td>
                  </tr>
                  <tr class="border-b border-border last:border-b-0">
                    <td class="py-1.5 pr-4 text-foreground font-medium">% of Total</td>
                    <td class="py-1.5 text-right font-semibold text-foreground">${((flow.value / totalValue) * 100).toFixed(1)}%</td>
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
        const nameLabel = formatOrgLabel(d.name, d.displayName !== d.name ? d.displayName : undefined)
        tooltip.html(`
          <div class="bg-muted px-3 py-2 border-b border-border rounded-t-lg">
            <div class="font-semibold text-foreground text-body">${nameLabel}</div>
            <div class="text-helper text-muted-foreground mt-0.5">${d.type === 'provider' ? 'Provider' : 'Receiver'}</div>
          </div>
          <div class="p-2">
            <table class="w-full text-body">
              <tbody>
                <tr class="border-b border-border last:border-b-0">
                  <td class="py-1.5 pr-4 text-foreground font-medium">Amount</td>
                  <td class="py-1.5 text-right font-semibold text-foreground">${formatCurrency(d.value)}</td>
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

    // Add node labels: "Name (ACRONYM)" with wrapping for long names
    nodeGroup.each(function(d) {
      const textEl = d3.select(this).append('text')
        .attr('x', d.type === 'provider' ? d.x0 - 8 : d.x1 + 8)
        .attr('text-anchor', d.type === 'provider' ? 'end' : 'start')
        .attr('font-size', '11px')
        .attr('font-weight', 'normal')
        .attr('fill', '#374151')
        .style('pointer-events', 'none')

      // Build label: "Full Name (ACRONYM)" or just "Full Name"
      const hasAcronym = d.displayName && d.displayName !== d.name
      const label = hasAcronym ? `${d.name} (${d.displayName})` : d.name

      // Word-wrap the label
      const maxChars = 28
      const lineHeight = 13
      const words = label.split(' ')
      const lines: string[] = []
      let currentLine = ''
      words.forEach((word: string) => {
        if (currentLine.length === 0) {
          currentLine = word
        } else if ((currentLine + ' ' + word).length <= maxChars) {
          currentLine += ' ' + word
        } else {
          lines.push(currentLine)
          currentLine = word
        }
      })
      if (currentLine) lines.push(currentLine)

      // Center the text block vertically on the node
      const totalHeight = lines.length * lineHeight
      const startY = (d.y0 + d.y1) / 2 - totalHeight / 2 + lineHeight / 2

      lines.forEach((line, i) => {
        textEl.append('tspan')
          .attr('x', d.type === 'provider' ? d.x0 - 8 : d.x1 + 8)
          .attr('y', startY + i * lineHeight)
          .text(line)
      })
    })

    // Cleanup tooltip on unmount
    return () => {
      tooltip.remove()
    }

  }, [data, containerSize])

  if (!data.providers || data.providers.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        <div className="text-center">
          <div className="text-lg font-medium">No funding source data available</div>
          <div className="text-body mt-1">Add transactions or planned disbursements to see the flow</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full funding-source-chart py-4">
      <svg ref={svgRef} className="w-full" style={{ height: `${containerSize.height}px`, display: 'block' }} />
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
  // Granularity for the Financial Overview chart. Inline view is always
  // yearly; this toggle is only meaningful when the chart is expanded.
  const [overviewGranularity, setOverviewGranularity] = useState<'year' | 'month'>('year')
  const [isBudgetCumulative, setIsBudgetCumulative] = useState<boolean>(false)
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set())
  const [hiddenBudgetSeries, setHiddenBudgetSeries] = useState<Set<string>>(new Set())

  // ── Calendar / year-range selectors (one per chart so each can be filtered
  //    independently in its expanded modal). All read from the same
  //    `transactions` array for the "Data Range" shortcut.
  const transactionDates = useMemo(
    () => (transactions ?? [])
      .map((t: any) => t.transaction_date || t.value_date)
      .filter(Boolean)
      .map((d: string) => new Date(d))
      .filter((d: Date) => !Number.isNaN(d.getTime())),
    [transactions],
  )
  const budgetVsActualCal = useCalendarYearSelector(transactionDates)
  const fundingSourceCal = useCalendarYearSelector(transactionDates)
  const aidModalityCal = useCalendarYearSelector(transactionDates)
  const topProvidersCal = useCalendarYearSelector(transactionDates)
  const topReceiversCal = useCalendarYearSelector(transactionDates)

  // Helper: gate a transaction by a CalendarYearSelector's effectiveDateRange.
  const withinRange = (t: any, range: { from: Date; to: Date } | null): boolean => {
    if (!range) return true
    const dStr = t.transaction_date || t.value_date
    if (!dStr) return true
    const d = new Date(dStr)
    if (Number.isNaN(d.getTime())) return true
    return d >= range.from && d <= range.to
  }
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

  // Filtered data using useMemo for performance. The CalendarYearSelector's
  // effectiveDateRange (when set) further constrains the rows to the selected
  // year window, so the chart honours the user's calendar picker.
  const filteredBudgetVsActual = useMemo(() => {
    const base = filterDataByYear(
      isBudgetCumulative ? cumulativeBudgetData : groupedBudgetVsActualData,
      budgetTimePeriod,
    )
    const range = budgetVsActualCal.effectiveDateRange
    if (!range) return base
    const fromYear = range.from.getFullYear()
    const toYear = range.to.getFullYear()
    return base.filter((row: any) => {
      const y = Number(row.year)
      if (!Number.isFinite(y)) return true
      return y >= fromYear && y <= toYear
    })
  }, [groupedBudgetVsActualData, cumulativeBudgetData, budgetTimePeriod, isBudgetCumulative, budgetVsActualCal.effectiveDateRange])

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
        {label && <span className="text-helper font-medium text-muted-foreground">{label}</span>}
        <Select value={value} onValueChange={(val) => onChange(val as TimePeriod)}>
          <SelectTrigger className="h-8 px-3 border rounded-lg text-body font-medium bg-card">
            <SelectValue placeholder="Select period">
              {selectedPeriod?.label || 'All Time'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {periods.map(period => (
              <SelectItem key={period.value} value={period.value} className="text-body">
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
          className={`h-7 px-3 text-helper ${
            value === 'year' 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-card text-muted-foreground border-border hover:bg-muted/50'
          }`}
        >
          Year
        </Button>
        <Button
          variant={value === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange('month')}
          className={`h-7 px-3 text-helper ${
            value === 'month' 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-card text-muted-foreground border-border hover:bg-muted/50'
          }`}
        >
          Month
        </Button>
      </div>
    )
  }

  // Aggregate/chart values in this tab are USD-converted.
  const formatCurrency = (value: number) => formatCurrencyCompact(value)

  const formatTooltipValue = (value: number) => formatCurrencyCompact(value)

  // Compact currency formatter for Y-axis - whole numbers only
  const formatCompactCurrency = (value: number) => formatAxisCurrency(value)

  // Compact currency formatter for tooltips with one decimal
  const formatCompactCurrencyTooltip = (value: number) => formatCurrencyCompact(value)

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
        <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="bg-muted px-3 py-2 border-b border-border">
            <p className="font-semibold text-foreground text-body">{fullDate}</p>
          </div>
          <div className="p-2">
            <table className="w-full text-body">
              <tbody>
                {nonZeroPayload.map((entry: any, index: number) => (
                  <tr key={index} className="border-b border-border last:border-b-0">
                    <td className="py-1.5 pr-4 flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-foreground font-medium">{entry.name}</span>
                    </td>
                    <td className="py-1.5 text-right font-semibold text-foreground">
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

  // Yearly-aggregated overview used in the inline (non-fullscreen) view so the
  // chart reads at a glance. Cumulative mode keeps the LAST data point of each
  // calendar year (the running total to date); periodic mode SUMS each year's
  // periods so the bar/line shows annual flow.
  const processedCumulativeOverviewDataYearly = useMemo(() => {
    if (filteredCumulativeOverviewData.length === 0) return []
    const filled = fillMissingMonths(filteredCumulativeOverviewData, 'date', isCumulative)
    const numericKeys = [
      'Incoming Funds',
      'Incoming Commitments',
      'Outgoing Commitments',
      'Disbursements',
      'Expenditures',
      'Planned Disbursements',
      'Budgets',
    ]
    const byYear = new Map<number, any>()
    if (isCumulative) {
      for (const item of filled) {
        const year = new Date(item.date).getFullYear()
        const existing = byYear.get(year)
        if (!existing || new Date(item.date) > new Date(existing.date)) {
          byYear.set(year, item)
        }
      }
    } else {
      for (const item of filled) {
        const year = new Date(item.date).getFullYear()
        const existing = byYear.get(year) || { date: `${year}-12-31` }
        for (const k of numericKeys) {
          existing[k] = (existing[k] || 0) + (Number(item[k]) || 0)
        }
        byYear.set(year, existing)
      }
    }
    return Array.from(byYear.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, item]) => {
        const anchor = `${year}-12-31`
        return {
          ...item,
          date: anchor,
          timestamp: new Date(anchor).getTime(),
          fullDate: String(year),
          displayDate: String(year),
        }
      })
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
      'Incoming Funds': { color: getFinancialSeriesColor('Incoming Funds') },
      'Incoming Commitments': { color: getFinancialSeriesColor('Incoming Commitments') },
      'Outgoing Commitments': { color: getFinancialSeriesColor('Outgoing Commitments') },
      'Disbursements': { color: getFinancialSeriesColor('Disbursements') },
      'Expenditures': { color: getFinancialSeriesColor('Expenditures') },
      'Planned Disbursements': { color: getFinancialSeriesColor('Planned Disbursements') },
      'Budgets': { color: getFinancialSeriesColor('Budgets') }
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
      { name: 'Budget', value: totalBudget, color: BUDGET_COLOR },
      { name: 'Actual Spending', value: totalActual, color: getTransactionTypeColor('3') }
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
        // Calendar / year-range filter — clip planned disbursements whose
        // period_start/period_end fall outside the selected window.
        const range = fundingSourceCal.effectiveDateRange
        if (range) {
          const startStr = pd.period_start || pd.start_date || pd.value_date
          if (startStr) {
            const d = new Date(startStr)
            if (!Number.isNaN(d.getTime()) && (d < range.from || d > range.to)) return
          }
        }
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
        if (!withinRange(t, fundingSourceCal.effectiveDateRange)) return

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
  }, [transactions, plannedDisbursements, fundingSourceType, fundingTransactionType, resolveOrgInfo, fundingSourceCal.effectiveDateRange])

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

  // ── Aid Modality Mix ────────────────────────────────────────────────────
  // Group OUTGOING transactions by IATI Finance Type buckets so users can
  // see the activity's instrument mix (grants vs loans vs equity vs
  // guarantees vs other) at a glance. Users can filter the included
  // transaction types via the dropdown in the expanded toolbar; the chart
  // also tracks per-type sub-totals so the hover tooltip can show the
  // disaggregation (Commitments / Disbursements / Expenditures).
  const AID_MODALITY_OUTGOING_TYPES = ['2', '3', '4'] as const
  const AID_MODALITY_TYPE_LABELS: Record<string, string> = {
    '2': 'Outgoing Commitments',
    '3': 'Disbursements',
    '4': 'Expenditures',
  }
  const [aidModalityTxTypes, setAidModalityTxTypes] = useState<Set<string>>(
    () => new Set(AID_MODALITY_OUTGOING_TYPES),
  )
  const [aidModalityView, setAidModalityView] = useState<'chart' | 'table'>('chart')
  const [topProvidersView, setTopProvidersView] = useState<'chart' | 'table'>('chart')
  const [topReceiversView, setTopReceiversView] = useState<'chart' | 'table'>('chart')
  const aidModalityData = useMemo(() => {
    const buckets: Record<string, { value: number; byType: Record<string, number> }> = {}
    transactions?.forEach((t: any) => {
      if (!withinRange(t, aidModalityCal.effectiveDateRange)) return
      const type = String(t.transaction_type ?? '')
      if (!aidModalityTxTypes.has(type)) return
      const usd = parseFloat(t.usd_value || t.value_usd) || 0
      const usable = usd || (t.currency === 'USD' ? parseFloat(t.value) || 0 : 0)
      if (!Number.isFinite(usable) || usable <= 0) return
      const code = String(t.finance_type || '')
      let bucket = 'Unspecified'
      if (!code) bucket = 'Unspecified'
      else if (code.startsWith('11') || code === '110' || code === '111') bucket = 'Grants'
      else if (code.startsWith('4') || ['410','411','412','413','414','421','422','423','424'].includes(code)) bucket = 'Loans'
      else if (code.startsWith('5') || ['510','511','512','513','520'].includes(code)) bucket = 'Equity'
      else if (code.startsWith('6') || ['610','611','612','613','620','630'].includes(code)) bucket = 'Guarantees / Insurance'
      else bucket = 'Other'
      if (!buckets[bucket]) buckets[bucket] = { value: 0, byType: {} }
      buckets[bucket].value += usable
      buckets[bucket].byType[type] = (buckets[bucket].byType[type] || 0) + usable
    })
    return Object.entries(buckets)
      .map(([name, { value, byType }]) => ({ name, value, byType }))
      .sort((a, b) => b.value - a.value)
  }, [transactions, aidModalityCal.effectiveDateRange, aidModalityTxTypes])
  // Aid modality colours map to the same brand palette as the rest of the
  // finance charts (primaryScarlet / blueSlate / coolSteel / paleSlate).
  // Falling back to neutral greys for Other / Unspecified keeps the focal
  // categories prominent.
  const aidModalityColors: Record<string, string> = {
    Grants: '#dc2625',
    Loans: '#4c5568',
    Equity: '#7b95a7',
    'Guarantees / Insurance': '#cfd0d5',
    Other: '#94a3b8',
    Unspecified: '#e2e8f0',
  }
  const aidModalityTotal = aidModalityData.reduce((sum, d) => sum + d.value, 0)

  // By-year matrix used by the table view — rows = years, columns = the
  // finance-type buckets actually present in the filtered data.
  const aidModalityByYear = useMemo(() => {
    const bucketOf = (code: string) => {
      if (!code) return 'Unspecified'
      if (code.startsWith('11') || code === '110' || code === '111') return 'Grants'
      if (code.startsWith('4') || ['410','411','412','413','414','421','422','423','424'].includes(code)) return 'Loans'
      if (code.startsWith('5') || ['510','511','512','513','520'].includes(code)) return 'Equity'
      if (code.startsWith('6') || ['610','611','612','613','620','630'].includes(code)) return 'Guarantees / Insurance'
      return 'Other'
    }
    const rows = new Map<number, Record<string, number>>()
    const buckets = new Set<string>()
    transactions?.forEach((t: any) => {
      if (!withinRange(t, aidModalityCal.effectiveDateRange)) return
      const type = String(t.transaction_type ?? '')
      if (!aidModalityTxTypes.has(type)) return
      const usd = parseFloat(t.usd_value || t.value_usd) || 0
      const usable = usd || (t.currency === 'USD' ? parseFloat(t.value) || 0 : 0)
      if (!Number.isFinite(usable) || usable <= 0) return
      const date = t.transaction_date || t.value_date
      if (!date) return
      const year = new Date(date).getUTCFullYear()
      if (!Number.isFinite(year)) return
      const bucket = bucketOf(String(t.finance_type || ''))
      buckets.add(bucket)
      const row = rows.get(year) || {}
      row[bucket] = (row[bucket] || 0) + usable
      rows.set(year, row)
    })
    // Preserve the visual order from aidModalityData (which is sorted by value)
    const presentBuckets = aidModalityData.map((d) => d.name).filter((b) => buckets.has(b))
    const sortedYears = Array.from(rows.keys()).sort((a, b) => a - b)
    return {
      years: sortedYears,
      buckets: presentBuckets,
      rows,
    }
  }, [transactions, aidModalityCal.effectiveDateRange, aidModalityTxTypes, aidModalityData])

  const exportAidModalityToCSV = () => {
    if (aidModalityView === 'table') {
      if (!aidModalityByYear.years.length) {
        toast.error('No data to export')
        return
      }
      const headers = ['Year', ...aidModalityByYear.buckets, 'Total']
      let csv = headers.join(',') + '\n'
      aidModalityByYear.years.forEach((year) => {
        const row = aidModalityByYear.rows.get(year) || {}
        const cells = [
          aidModalityCal.getYearLabel(year),
          ...aidModalityByYear.buckets.map((b) => String(row[b] || 0)),
        ]
        const rowTotal = aidModalityByYear.buckets.reduce((s, b) => s + (row[b] || 0), 0)
        csv += [...cells, String(rowTotal)].join(',') + '\n'
      })
      // Totals row
      const colTotals = aidModalityByYear.buckets.map((b) =>
        aidModalityByYear.years.reduce((s, y) => s + ((aidModalityByYear.rows.get(y) || {})[b] || 0), 0),
      )
      const grand = colTotals.reduce((s, v) => s + v, 0)
      csv += ['Total', ...colTotals.map(String), String(grand)].join(',') + '\n'
      downloadCsv(csv, `aid_modality_mix_by_year_${new Date().toISOString().split('T')[0]}.csv`)
    } else {
      if (!aidModalityData.length) {
        toast.error('No data to export')
        return
      }
      let csv = 'Instrument,Total (USD),% Share\n'
      aidModalityData.forEach((row) => {
        const pct = aidModalityTotal > 0 ? ((row.value / aidModalityTotal) * 100).toFixed(2) : '0.00'
        csv += `"${row.name}",${row.value},${pct}%\n`
      })
      csv += `"Total",${aidModalityTotal},100.00%\n`
      downloadCsv(csv, `aid_modality_mix_${new Date().toISOString().split('T')[0]}.csv`)
    }
  }

  // ── Top Counterparties ──────────────────────────────────────────────────
  // Sum outgoing-money transactions (types 2/3/4) by provider org and by
  // receiver org. Top 5 of each, ranked by USD volume. Computed separately
  // so each chart respects its own calendar/year-range filter.
  const computeTopByRole = (
    role: 'provider' | 'receiver',
    range: { from: Date; to: Date } | null,
  ) => {
    const byName: Record<string, { displayName: string; value: number }> = {}
    transactions?.forEach((t: any) => {
      if (!withinRange(t, range)) return
      const type = String(t.transaction_type ?? '')
      if (!['2', '3', '4'].includes(type)) return
      const usd = parseFloat(t.usd_value || t.value_usd) || 0
      const usable = usd || (t.currency === 'USD' ? parseFloat(t.value) || 0 : 0)
      if (!Number.isFinite(usable) || usable <= 0) return
      const info = role === 'provider'
        ? resolveOrgInfo(t.provider_org_id, t.provider_org_name, t.provider_org_ref, t.provider_org_acronym)
        : resolveOrgInfo(t.receiver_org_id, t.receiver_org_name, t.receiver_org_ref, t.receiver_org_acronym)
      const name = info.name || (role === 'provider' ? 'Unknown Provider' : 'Unknown Receiver')
      if (!byName[name]) byName[name] = { displayName: info.displayName || name, value: 0 }
      byName[name].value += usable
    })
    return Object.entries(byName)
      .map(([name, { displayName, value }]) => ({ name, displayName, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }
  const topProvidersData = useMemo(
    () => computeTopByRole('provider', topProvidersCal.effectiveDateRange),
    [transactions, resolveOrgInfo, topProvidersCal.effectiveDateRange],
  )
  const topReceiversData = useMemo(
    () => computeTopByRole('receiver', topReceiversCal.effectiveDateRange),
    [transactions, resolveOrgInfo, topReceiversCal.effectiveDateRange],
  )

  if (loading || isPending) {
    return <FinancialAnalyticsSkeleton />
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Financial Totals — reused from the analytics dashboard,
          scoped to this activity. Spans both columns of the grid. Inline view
          is bare-bones: just the chart and an expand button. The dialog form
          (clicking expand) reveals all calendar/year/transaction-type/
          chart-type/export controls. */}
      <ChartFullscreen className="lg:col-span-2">
        {({ isFullscreen, toggle }) => (
          <Card className={cn("", isFullscreen && "border-0 shadow-none rounded-none h-full flex flex-col")}>
            <CardHeader className={cn(isFullscreen && "bg-surface-muted border-b rounded-t-lg")}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground">
                    Financial Totals
                  </CardTitle>
                  <CardDescription>
                    Yearly budget, planned, and actual flows
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <FormulaTooltip
                    content="Sums all actual transactions (Commitments, Disbursements, Expenditures, etc.) by reporting year, alongside published activity budgets and planned disbursements. Multi-year budgets and planned disbursements that span the boundary are split proportionally by overlap days. All values use USD-converted amounts where available."
                    size={isFullscreen ? 'md' : 'sm'}
                  />
                  <ChartExpandIconButton isFullscreen={isFullscreen} onClick={toggle} />
                </div>
              </div>
            </CardHeader>
            <CardContent className={cn(isFullscreen && "flex-1 min-h-0 flex flex-col pt-4")}>
              {isFullscreen ? (
                <FinancialTotalsBarChart activityId={activityId} fillHeight />
              ) : (
                <div className="h-[500px]">
                  <FinancialTotalsBarChart activityId={activityId} compact />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </ChartFullscreen>

      {/* Budget versus Actual Spend Trajectory Chart */}
      <ActivitySpendTrajectoryChart activityId={activityId} />

      {/* Budget vs Actual Spending - Full Width */}
      <ChartFullscreen>
        {({ isFullscreen, toggle }) => (
      <Card className={cn("", isFullscreen && "border-0 shadow-none rounded-none h-full flex flex-col")}>
        <CardHeader className={cn(isFullscreen && "bg-surface-muted border-b rounded-t-lg")}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">
                {isBudgetCumulative ? 'Cumulative' : 'Period-by-Period'} Budget vs Actual Spending by Year
              </CardTitle>
              <CardDescription>
                Annual planned vs actual spending
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <FormulaTooltip
                content="For each calendar year, compares the activity's published budget against actual spending (disbursements + expenditures), all USD-converted. Multi-year budget periods are split proportionally by day overlap so annual totals reconcile. The cumulative view replaces each year's value with a running total of that year plus all prior years."
                size={isFullscreen ? 'md' : 'sm'}
              />
              <ChartExpandIconButton isFullscreen={isFullscreen} onClick={toggle} />
            </div>
          </div>
        </CardHeader>
        {isFullscreen && (
          <div className="px-6 py-3 flex items-center gap-2 flex-wrap">
            <CalendarYearSelector {...budgetVsActualCal} />
            <div className="flex gap-1 rounded-lg p-1 bg-muted">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsBudgetCumulative(true)}
                className={cn("h-8", isBudgetCumulative ? "bg-card shadow-sm text-foreground hover:bg-card" : "text-muted-foreground hover:text-foreground")}
              >
                Cumulative
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsBudgetCumulative(false)}
                className={cn("h-8", !isBudgetCumulative ? "bg-card shadow-sm text-foreground hover:bg-card" : "text-muted-foreground hover:text-foreground")}
              >
                Periodic
              </Button>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <ChartViewToggle
                ariaLabel="View"
                variant="icon"
                value={budgetChartType === 'table' ? 'table' : 'chart'}
                onValueChange={(v) => setBudgetChartType(v === 'table' ? 'table' : 'bar')}
                options={CHART_TABLE_OPTIONS}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={exportBudgetVsActualToCSV}
                className="h-8 w-8"
                title="Download CSV"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
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
                    <YAxis tickFormatter={formatAxisCurrency} stroke="#64748B" fontSize={12} />
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
              <div className="overflow-auto h-[500px] border border-border rounded-lg">
                <table className="w-full text-body">
                  <thead className="sticky top-0 bg-surface-muted z-10">
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-foreground">Period</th>
                      <th className="text-right py-3 px-4 font-medium text-foreground">Budget</th>
                      <th className="text-right py-3 px-4 font-medium text-foreground">Actual Spending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBudgetVsActual.map((row, index) => (
                      <tr key={index} className="border-b border-border hover:bg-muted/50">
                        <td className="py-2.5 px-4 font-medium text-foreground">{budgetGroupBy === 'year' ? budgetVsActualCal.getYearLabel(Number(row.year)) : row.period}</td>
                        <td className="text-right py-2.5 px-4 text-foreground">{formatTooltipValue(row.budget)}</td>
                        <td className="text-right py-2.5 px-4 text-foreground">{formatTooltipValue(row.actual)}</td>
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
                        <tr className="border-t-2 border-border bg-muted font-semibold">
                          <td className="py-2.5 px-4 text-foreground">Total</td>
                          <td className="text-right py-2.5 px-4 text-foreground">{formatTooltipValue(totals.budget)}</td>
                          <td className="text-right py-2.5 px-4 text-foreground">{formatTooltipValue(totals.actual)}</td>
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
                      tickFormatter={(timestamp) => budgetVsActualCal.getYearLabel(new Date(timestamp).getFullYear())}
                      stroke="#64748B"
                      fontSize={12}
                      angle={0}
                      textAnchor="middle"
                      height={40}
                    />
                    <YAxis domain={[0, (dataMax) => dataMax * 1.1]} tickFormatter={formatAxisCurrency} stroke="#64748B" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    {isFullscreen && <Legend content={<CustomInteractiveLegend hiddenSeries={hiddenBudgetSeries} onToggleSeries={handleToggleBudgetSeries} />} />}
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
                      tickFormatter={(timestamp) => budgetVsActualCal.getYearLabel(new Date(timestamp).getFullYear())}
                      stroke="#64748B"
                      fontSize={12}
                      angle={0}
                      textAnchor="middle"
                      height={40}
                    />
                    <YAxis domain={[0, (dataMax) => dataMax * 1.1]} tickFormatter={formatAxisCurrency} stroke="#64748B" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                    {isFullscreen && <Legend content={<CustomInteractiveLegend hiddenSeries={hiddenBudgetSeries} onToggleSeries={handleToggleBudgetSeries} />} />}
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
            <div className="flex items-center justify-center h-96 text-muted-foreground">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No budget vs actual data available</p>
                <p className="text-helper mt-2">Add budgets and transactions to see this chart</p>
              </div>
            </div>
          )}
          {isFullscreen && (
            <p className="text-body text-muted-foreground leading-relaxed mt-4">
              The chart compares the activity's <strong>annual planned budget</strong> with the <strong>actual money spent</strong> each year, drawn from disbursements and expenditures. Bars of similar height mean spending kept pace with plan; taller budget bars signal <strong>under-spending</strong> and taller actual bars signal <strong>over-spending</strong>, with the cumulative view turning these into a running total that reveals whether shortfalls in one year were made up later. Reading this regularly grades the activity's budget execution: persistent under-spend often points to procurement delays, unused capacity, or partner-side bottlenecks, while sustained over-spend can flag scope creep or cost overruns.
            </p>
          )}
        </CardContent>
      </Card>
        )}
      </ChartFullscreen>

      {/* Funding Source Breakdown */}
      <ChartFullscreen>
        {({ isFullscreen, toggle }) => (
      <Card className={cn("", isFullscreen && "border-0 shadow-none rounded-none h-full flex flex-col")}>
        <CardHeader className={cn(isFullscreen && "bg-surface-muted border-b rounded-t-lg")}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">Funding Source Breakdown</CardTitle>
              <CardDescription>Provider-to-receiver flows</CardDescription>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <FormulaTooltip
                content="Sums USD-converted transaction values for each provider→receiver organisation pair and renders them as Sankey ribbons whose width is proportional to the total dollars moved between that pair. The toggle switches the source set between actual transactions (incoming, commitment, disbursement, expenditure) and planned disbursements only."
                size={isFullscreen ? 'md' : 'sm'}
              />
              <ChartExpandIconButton isFullscreen={isFullscreen} onClick={toggle} />
            </div>
          </div>
        </CardHeader>
        {isFullscreen && (
          <div className="px-6 py-3 flex items-center gap-2 flex-wrap">
            <CalendarYearSelector {...fundingSourceCal} />
            {/* Source Type Toggle */}
            <div className="flex gap-1 rounded-lg p-1 bg-muted">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFundingSourceType('transactions')}
                className={cn("h-8", fundingSourceType === 'transactions' ? "bg-card shadow-sm text-foreground hover:bg-card" : "text-muted-foreground hover:text-foreground")}
              >
                Transactions
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFundingSourceType('planned')}
                className={cn("h-8", fundingSourceType === 'planned' ? "bg-card shadow-sm text-foreground hover:bg-card" : "text-muted-foreground hover:text-foreground")}
              >
                Planned
              </Button>
            </div>

            {/* Transaction Type Filter (only show when viewing transactions) */}
            {fundingSourceType === 'transactions' && (
              <div className="flex gap-1 rounded-lg p-1 bg-muted">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFundingTransactionType('1')}
                  className={cn("h-8 text-helper px-2", fundingTransactionType === '1' ? "bg-card shadow-sm text-foreground hover:bg-card" : "text-muted-foreground hover:text-foreground")}
                >
                  Incoming
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFundingTransactionType('2')}
                  className={cn("h-8 text-helper px-2", fundingTransactionType === '2' ? "bg-card shadow-sm text-foreground hover:bg-card" : "text-muted-foreground hover:text-foreground")}
                >
                  Commitment
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFundingTransactionType('3')}
                  className={cn("h-8 text-helper px-2", fundingTransactionType === '3' ? "bg-card shadow-sm text-foreground hover:bg-card" : "text-muted-foreground hover:text-foreground")}
                >
                  Disbursement
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFundingTransactionType('4')}
                  className={cn("h-8 text-helper px-2", fundingTransactionType === '4' ? "bg-card shadow-sm text-foreground hover:bg-card" : "text-muted-foreground hover:text-foreground")}
                >
                  Expenditure
                </Button>
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              <ChartViewToggle ariaLabel="View" variant="icon" value={fundingChartType} onValueChange={setFundingChartType} options={CHART_TABLE_OPTIONS} />
              <Button
                variant="ghost"
                size="icon"
                onClick={exportFundingSourceToCSV}
                className="h-8 w-8"
                title="Download CSV"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        <CardContent>
          {filteredFundingSourceData.providers && filteredFundingSourceData.providers.length > 0 ? (
            fundingChartType === 'table' ? (
              <div className="overflow-auto h-[500px] border border-border rounded-lg">
                <table className="w-full text-body">
                  <thead className="sticky top-0 bg-surface-muted z-10">
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-foreground">Provider</th>
                      <th className="text-left py-3 px-4 font-medium text-foreground">Receiver</th>
                      <th className="text-right py-3 px-4 font-medium text-foreground">Amount (USD)</th>
                      <th className="text-right py-3 px-4 font-medium text-foreground">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFundingSourceData.flows.map((flow, index) => {
                      const total = filteredFundingSourceData.providers.reduce((sum, s) => sum + s.value, 0)
                      const percentage = ((flow.value / total) * 100).toFixed(1)
                      return (
                        <tr key={index} className="border-b border-border hover:bg-muted/50">
                          <td className="py-2.5 px-4 font-medium text-foreground" title={flow.provider}>
                            {flow.providerDisplay || flow.provider}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-foreground" title={flow.receiver}>
                            {flow.receiverDisplay || flow.receiver}
                          </td>
                          <td className="text-right py-2.5 px-4 text-foreground">{formatCurrency(flow.value)}</td>
                          <td className="text-right py-2.5 px-4 text-foreground">{percentage}%</td>
                        </tr>
                      )
                    })}
                    {/* Total Row */}
                    {(() => {
                      const total = filteredFundingSourceData.flows.reduce((sum, flow) => sum + flow.value, 0)
                      return (
                        <tr className="border-t-2 border-border bg-muted font-semibold">
                          <td className="py-2.5 px-4 text-foreground" colSpan={2}>Total</td>
                          <td className="text-right py-2.5 px-4 text-foreground">{formatCurrency(total)}</td>
                          <td className="text-right py-2.5 px-4 text-foreground">100.0%</td>
                        </tr>
                      )
                    })()}
                  </tbody>
                </table>
              </div>
            ) : (
              // Inline cells match the other charts at 500px; in fullscreen
              // the sankey's own dynamic height (up to 850px) is allowed.
              <div className={cn(!isFullscreen && "h-[500px] overflow-hidden")}>
                <FundingSourceSankey
                  data={filteredFundingSourceData}
                  fundingSourceType={fundingSourceType}
                  fundingTransactionType={fundingTransactionType}
                />
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-96 text-muted-foreground">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No funding source data available</p>
                <p className="text-helper mt-2">Add participating organisations or transactions to see funding breakdown</p>
              </div>
            </div>
          )}
          {isFullscreen && (
            <p className="text-body text-muted-foreground leading-relaxed mt-4">
              Sankey-style flows run from each <strong>provider organisation</strong> on the left to the <strong>receivers</strong> on the right, with band width sized by USD value — wider bands mean more money moved between that pair, and narrow tails reveal smaller-volume relationships that wouldn't stand out in a flat transaction list. The toggle switches between <strong>actual transactions</strong> by type (incoming, commitment, disbursement, expenditure) and <strong>planned disbursements</strong> only. At a glance, this tells you who the activity's primary funders are, where the money is being directed, and whether funding is concentrated with one partner or spread across several — concentration can signal risk if a single funder withdraws.
            </p>
          )}
        </CardContent>
      </Card>
        )}
      </ChartFullscreen>

      {/* Aid Modality Mix — outgoing-money pie grouped by IATI finance-type
          buckets (grants / loans / equity / guarantees / other). */}
      <ChartFullscreen>
        {({ isFullscreen, toggle }) => (
          <Card className={cn("", isFullscreen && "border-0 shadow-none rounded-none h-full flex flex-col")}>
            <CardHeader className={cn(isFullscreen && "bg-surface-muted border-b rounded-t-lg")}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground">
                    Aid Modality Mix
                  </CardTitle>
                  <CardDescription>
                    Outgoing finance by instrument
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <FormulaTooltip
                    content="Groups all outgoing transactions (commitments, disbursements, expenditures) by the IATI finance type of each transaction — bucketed into Grants, Loans, Equity, Guarantees / Insurance, Other, or Unspecified — and sums their USD-converted value. Each slice is that bucket's share of total outgoing USD."
                    size={isFullscreen ? 'md' : 'sm'}
                  />
                  <ChartExpandIconButton isFullscreen={isFullscreen} onClick={toggle} />
                </div>
              </div>
            </CardHeader>
            {isFullscreen && (
              <div className="px-6 py-3 flex items-center gap-2 flex-wrap">
                <CalendarYearSelector {...aidModalityCal} />
                <div className="ml-auto flex items-center gap-2">
                  <ChartViewToggle ariaLabel="View" variant="icon" value={aidModalityView} onValueChange={setAidModalityView} options={CHART_TABLE_OPTIONS} />
                  {/* Multi-select dropdown — pick which outgoing transaction
                      types to include in the modality mix. */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        Transaction Types ({aidModalityTxTypes.size})
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-72 p-2"
                      onCloseAutoFocus={(e) => e.preventDefault()}
                    >
                      <div className="space-y-1">
                        {AID_MODALITY_OUTGOING_TYPES.map((code) => {
                          const checked = aidModalityTxTypes.has(code)
                          const toggle = () => {
                            setAidModalityTxTypes((prev) => {
                              const next = new Set(prev)
                              if (next.has(code)) next.delete(code)
                              else next.add(code)
                              return next
                            })
                          }
                          return (
                            <div
                              key={code}
                              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                              onClick={toggle}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={toggle}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono min-w-[24px] text-center">
                                {code}
                              </code>
                              <span className="text-body">{AID_MODALITY_TYPE_LABELS[code]}</span>
                            </div>
                          )
                        })}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={exportAidModalityToCSV}
                    className="h-8 w-8"
                    title="Download CSV"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <CardContent className={cn(isFullscreen && "flex-1 min-h-0 flex flex-col pt-4")}>
              {aidModalityTotal > 0 && isFullscreen && aidModalityView === 'table' ? (
                <div className="flex-1 min-h-0 overflow-auto border border-border rounded-lg">
                  <table className="w-full text-body">
                    <thead className="sticky top-0 bg-surface-muted z-10">
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-foreground whitespace-nowrap">Year</th>
                        {aidModalityByYear.buckets.map((bucket) => (
                          <th key={bucket} className="text-right py-3 px-4 font-medium text-foreground whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
                              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: aidModalityColors[bucket] ?? '#94a3b8' }} />
                              {bucket}
                            </div>
                          </th>
                        ))}
                        <th className="text-right py-3 px-4 font-medium text-foreground whitespace-nowrap">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aidModalityByYear.years.map((year) => {
                        const row = aidModalityByYear.rows.get(year) || {}
                        const rowTotal = aidModalityByYear.buckets.reduce((sum, b) => sum + (row[b] || 0), 0)
                        return (
                          <tr key={year} className="border-b border-border hover:bg-muted/50">
                            <td className="py-2.5 px-4 font-medium text-foreground">{aidModalityCal.getYearLabel(year)}</td>
                            {aidModalityByYear.buckets.map((bucket) => (
                              <td key={bucket} className="text-right py-2.5 px-4 text-foreground tabular-nums">
                                {formatCurrency(row[bucket] || 0)}
                              </td>
                            ))}
                            <td className="text-right py-2.5 px-4 text-foreground tabular-nums font-medium">{formatCurrency(rowTotal)}</td>
                          </tr>
                        )
                      })}
                      {(() => {
                        const colTotals = aidModalityByYear.buckets.map((b) =>
                          aidModalityByYear.years.reduce((sum, y) => sum + ((aidModalityByYear.rows.get(y) || {})[b] || 0), 0),
                        )
                        const grand = colTotals.reduce((s, v) => s + v, 0)
                        return (
                          <tr className="border-t-2 border-border bg-muted font-semibold">
                            <td className="py-2.5 px-4 text-foreground">Total</td>
                            {colTotals.map((v, i) => (
                              <td key={i} className="text-right py-2.5 px-4 text-foreground tabular-nums">{formatCurrency(v)}</td>
                            ))}
                            <td className="text-right py-2.5 px-4 text-foreground tabular-nums">{formatCurrency(grand)}</td>
                          </tr>
                        )
                      })()}
                    </tbody>
                  </table>
                </div>
              ) : aidModalityTotal > 0 ? (
                <div className={cn(isFullscreen ? "flex-1 min-h-0 relative" : "h-[500px]")}>
                  <div className={isFullscreen ? "absolute inset-0" : "h-full"}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={aidModalityData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius="75%"
                          innerRadius="45%"
                          paddingAngle={2}
                        >
                          {aidModalityData.map((d) => (
                            <Cell key={d.name} fill={aidModalityColors[d.name] ?? '#94a3b8'} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null
                            const entry = payload[0]
                            const slice = entry.payload || {}
                            const value = Number(entry.value) || 0
                            const pct = aidModalityTotal > 0 ? (value / aidModalityTotal) * 100 : 0
                            const sliceColor = entry.payload?.fill || aidModalityColors[entry.name]
                            // Disaggregate the bucket's USD into the
                            // contributing transaction types so the user
                            // can see where the slice's value comes from.
                            const byType: Record<string, number> = slice.byType || {}
                            const breakdown = AID_MODALITY_OUTGOING_TYPES
                              .filter((code) => Number(byType[code]) > 0)
                              .map((code) => ({
                                label: AID_MODALITY_TYPE_LABELS[code],
                                value: formatCurrency(Number(byType[code]) || 0),
                              }))
                            return (
                              <ChartTooltipCard
                                title={entry.name}
                                rows={[
                                  {
                                    label: 'Total',
                                    value: formatCurrency(value),
                                    color: sliceColor,
                                    extra: `${pct.toFixed(1)}%`,
                                    bordered: breakdown.length > 0,
                                  },
                                  ...breakdown,
                                ]}
                              />
                            )
                          }}
                        />
                        {isFullscreen && <Legend />}
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">No outgoing transactions with finance types recorded</p>
                  </div>
                </div>
              )}
              {isFullscreen && (
                <p className="text-body text-muted-foreground leading-relaxed mt-4">
                  The pie groups all <strong>outgoing transactions</strong> (commitments, disbursements, expenditures) by IATI <strong>Finance Type</strong> bucket — Grants, Loans, Equity, Guarantees / Insurance, Other, or Unspecified — with each slice sized by USD value. A chart that's almost entirely Grants tells you the activity is concessional in nature, while a Loans-heavy mix points to market or near-market financing. Reading the instrument mix this way is a quick way to assess concessionality, repayment risk, and how the activity fits into the funder's broader portfolio.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </ChartFullscreen>

      {/* Top Providers — top 5 providers ranked by outgoing-money USD volume. */}
      <ChartFullscreen>
        {({ isFullscreen, toggle }) => (
          <Card className={cn("", isFullscreen && "border-0 shadow-none rounded-none h-full flex flex-col")}>
            <CardHeader className={cn(isFullscreen && "bg-surface-muted border-b rounded-t-lg")}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground">
                    Top Providers
                  </CardTitle>
                  <CardDescription>
                    Top 5 providers by USD value
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <FormulaTooltip
                    content="Sums USD-converted outgoing transactions (commitments, disbursements, expenditures) per provider organisation, ranks them descending, and shows the top 5. Transactions without a stored USD value are excluded."
                    size={isFullscreen ? 'md' : 'sm'}
                  />
                  <ChartExpandIconButton isFullscreen={isFullscreen} onClick={toggle} />
                </div>
              </div>
            </CardHeader>
            {isFullscreen && (
              <div className="px-6 py-3 flex items-center gap-2 flex-wrap">
                <CalendarYearSelector {...topProvidersCal} />
                <div className="ml-auto flex items-center gap-2">
                  <ChartViewToggle ariaLabel="View" variant="icon" value={topProvidersView} onValueChange={setTopProvidersView} options={CHART_TABLE_OPTIONS} />
                </div>
              </div>
            )}
            <CardContent className={cn(isFullscreen && "flex-1 min-h-0 flex flex-col pt-4")}>
              {topProvidersData.length > 0 && isFullscreen && topProvidersView === 'table' ? (
                <div className="flex-1 min-h-0 overflow-auto border border-border rounded-lg">
                  <table className="w-full text-body">
                    <thead className="sticky top-0 bg-surface-muted z-10">
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-foreground whitespace-nowrap w-12">#</th>
                        <th className="text-left py-3 px-4 font-medium text-foreground whitespace-nowrap">Provider</th>
                        <th className="text-right py-3 px-4 font-medium text-foreground whitespace-nowrap">Outgoing (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProvidersData.map((row, i) => (
                        <tr key={row.name} className="border-b border-border hover:bg-muted/50">
                          <td className="py-2.5 px-4 text-muted-foreground tabular-nums">{i + 1}</td>
                          <td className="py-2.5 px-4 font-medium text-foreground" title={row.name}>{row.displayName || row.name}</td>
                          <td className="text-right py-2.5 px-4 text-foreground tabular-nums">{formatCurrency(Number(row.value) || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : topProvidersData.length > 0 ? (
                <div className={cn(isFullscreen ? "flex-1 min-h-0 relative" : "h-[500px]")}>
                  <div className={isFullscreen ? "absolute inset-0" : "h-full"}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topProvidersData} layout="vertical" margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tickFormatter={(v: number) => formatAxisCurrency(v)} tick={{ fontSize: 11 }} />
                        <YAxis
                          type="category"
                          dataKey="displayName"
                          width={140}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v: string) => (v && v.length > 22 ? `${v.slice(0, 22)}…` : v)}
                        />
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null
                            const row = payload[0].payload
                            return (
                              <ChartTooltipCard
                                title={row.name}
                                rows={[{ label: 'Outgoing', value: formatCurrency(Number(row.value) || 0), color: '#dc2625' }]}
                              />
                            )
                          }}
                        />
                        <Bar dataKey="value" fill="#dc2625" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">No transactions with provider organisations recorded</p>
                  </div>
                </div>
              )}
              {isFullscreen && (
                <p className="text-body text-muted-foreground leading-relaxed mt-4">
                  The chart ranks the activity's five biggest <strong>provider organisations</strong> — the orgs sending the money — by total USD across all outgoing transactions (commitments, disbursements, expenditures). A single dominant top bar means the activity is funded primarily by one provider, while a flatter spread shows funding from several sources. It's the quickest way to identify the primary funders and to flag <strong>concentration risk</strong> — heavy reliance on one provider is a fragility worth tracking if that funder were ever to withdraw.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </ChartFullscreen>

      {/* Top Receivers — top 5 receivers ranked by outgoing-money USD volume. */}
      <ChartFullscreen>
        {({ isFullscreen, toggle }) => (
          <Card className={cn("", isFullscreen && "border-0 shadow-none rounded-none h-full flex flex-col")}>
            <CardHeader className={cn(isFullscreen && "bg-surface-muted border-b rounded-t-lg")}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground">
                    Top Receivers
                  </CardTitle>
                  <CardDescription>
                    Top 5 receivers by USD value
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <FormulaTooltip
                    content="Sums USD-converted outgoing transactions (commitments, disbursements, expenditures) per receiver organisation, ranks them descending, and shows the top 5. Transactions without a stored USD value are excluded."
                    size={isFullscreen ? 'md' : 'sm'}
                  />
                  <ChartExpandIconButton isFullscreen={isFullscreen} onClick={toggle} />
                </div>
              </div>
            </CardHeader>
            {isFullscreen && (
              <div className="px-6 py-3 flex items-center gap-2 flex-wrap">
                <CalendarYearSelector {...topReceiversCal} />
                <div className="ml-auto flex items-center gap-2">
                  <ChartViewToggle ariaLabel="View" variant="icon" value={topReceiversView} onValueChange={setTopReceiversView} options={CHART_TABLE_OPTIONS} />
                </div>
              </div>
            )}
            <CardContent className={cn(isFullscreen && "flex-1 min-h-0 flex flex-col pt-4")}>
              {topReceiversData.length > 0 && isFullscreen && topReceiversView === 'table' ? (
                <div className="flex-1 min-h-0 overflow-auto border border-border rounded-lg">
                  <table className="w-full text-body">
                    <thead className="sticky top-0 bg-surface-muted z-10">
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-foreground whitespace-nowrap w-12">#</th>
                        <th className="text-left py-3 px-4 font-medium text-foreground whitespace-nowrap">Receiver</th>
                        <th className="text-right py-3 px-4 font-medium text-foreground whitespace-nowrap">Incoming (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topReceiversData.map((row, i) => (
                        <tr key={row.name} className="border-b border-border hover:bg-muted/50">
                          <td className="py-2.5 px-4 text-muted-foreground tabular-nums">{i + 1}</td>
                          <td className="py-2.5 px-4 font-medium text-foreground" title={row.name}>{row.displayName || row.name}</td>
                          <td className="text-right py-2.5 px-4 text-foreground tabular-nums">{formatCurrency(Number(row.value) || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : topReceiversData.length > 0 ? (
                <div className={cn(isFullscreen ? "flex-1 min-h-0 relative" : "h-[500px]")}>
                  <div className={isFullscreen ? "absolute inset-0" : "h-full"}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topReceiversData} layout="vertical" margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tickFormatter={(v: number) => formatAxisCurrency(v)} tick={{ fontSize: 11 }} />
                        <YAxis
                          type="category"
                          dataKey="displayName"
                          width={140}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v: string) => (v && v.length > 22 ? `${v.slice(0, 22)}…` : v)}
                        />
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null
                            const row = payload[0].payload
                            return (
                              <ChartTooltipCard
                                title={row.name}
                                rows={[{ label: 'Incoming', value: formatCurrency(Number(row.value) || 0), color: '#4c5568' }]}
                              />
                            )
                          }}
                        />
                        <Bar dataKey="value" fill="#4c5568" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">No transactions with receiver organisations recorded</p>
                  </div>
                </div>
              )}
              {isFullscreen && (
                <p className="text-body text-muted-foreground leading-relaxed mt-4">
                  The chart ranks the activity's five biggest <strong>receiver organisations</strong> — the orgs taking in the money — by total USD across all outgoing transactions (commitments, disbursements, expenditures). A single dominant top bar means the activity flows mostly to one implementer; a flatter spread distributes across several. It identifies the main implementing partners and exposes <strong>delivery concentration</strong> — over-reliance on one receiver is a delivery risk if that partner runs into capacity or compliance issues.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </ChartFullscreen>
    </div>
  )
}


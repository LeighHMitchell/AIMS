"use client"

import React, { useMemo, useRef } from 'react'
import html2canvas from 'html2canvas'
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell,
  Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Calendar, Activity, Download, SlidersHorizontal } from 'lucide-react'
import { format, parseISO, differenceInDays, min, max } from 'date-fns'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface ProjectTimelineProps {
  activities: Array<{
    id: string
    iati_id: string
    title: string
    activity_status: string
    role: string
    start_date?: string
    end_date?: string
  }>
}

// Status colors matching the existing color scheme
const STATUS_COLORS = {
  implementation: '#10b981', // green
  completion: '#3b82f6',     // blue
  pipeline: '#f59e0b',       // yellow
  cancelled: '#ef4444',      // red
  default: '#6b7280'         // gray
}

export function ProjectTimeline({ activities }: ProjectTimelineProps) {
  const router = useRouter()

  // Process activities for the timeline
  const timelineData = useMemo(() => {
    // Filter activities with valid dates
    const validActivities = activities.filter(
      a => a.start_date && a.end_date
    )

    if (validActivities.length === 0) return { data: [], minDate: null, maxDate: null }

    // Find overall date range
    const allDates = validActivities.flatMap(a => [
      a.start_date ? parseISO(a.start_date) : null,
      a.end_date ? parseISO(a.end_date) : null
    ]).filter(Boolean) as Date[]

    const minDate = min(allDates)
    const maxDate = max(allDates)
    const totalDays = differenceInDays(maxDate, minDate)

    // Create data for the chart
    const data = validActivities.map((activity, index) => {
      const startDate = parseISO(activity.start_date!)
      const endDate = parseISO(activity.end_date!)
      
      // Calculate position and width as percentages
      const startOffset = (differenceInDays(startDate, minDate) / totalDays) * 100
      const duration = (differenceInDays(endDate, startDate) / totalDays) * 100

      return {
        id: activity.id,
        name: activity.title,
        status: activity.activity_status,
        role: activity.role,
        // For the invisible positioning bar
        startOffset,
        // For the visible duration bar
        duration,
        // For tooltip display
        startDate: activity.start_date,
        endDate: activity.end_date,
        actualStartDate: startDate,
        actualEndDate: endDate,
        y: index
      }
    }).reverse() // Reverse to show most recent at top

    return { data, minDate, maxDate }
  }, [activities])

  const chartRef = useRef<HTMLDivElement>(null);

  const handleBarClick = (data: any) => {
    if (data?.id) {
      router.push(`/activities/${data.id}`)
    }
  }

  const handleExport = async (format: 'png' | 'svg' | 'csv') => {
    // #region agent log - hypothesis A (Stubbed Implementation)
    fetch('http://127.0.0.1:7242/ingest/b4892be5-ca87-459d-a863-d3e1a440a1d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProjectTimeline.tsx:handleExport-entry',message:'Export button clicked',data:{format, timelineDataLength: timelineData.data?.length || 0, browser: navigator.userAgent.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{}); // #endregion

    if (timelineData.data.length === 0) {
      toast.warning('No data available to export');
      return;
    }

    if (format === 'csv') {
      // Generate CSV
      const headers = ['Project Name', 'Status', 'Role', 'Start Date', 'End Date', 'Duration (days)'];
      const rows = timelineData.data.map(entry => [
        entry.name,
        entry.status,
        entry.role,
        format(parseISO(entry.startDate), 'MMM d, yyyy'),
        format(parseISO(entry.endDate), 'MMM d, yyyy'),
        differenceInDays(parseISO(entry.endDate), parseISO(entry.startDate))
      ]);
      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      
      // #region agent log - hypothesis C (Data Serialization)
      fetch('http://127.0.0.1:7242/ingest/b4892be5-ca87-459d-a863-d3e1a440a1d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProjectTimeline.tsx:handleExport-csv-success',message:'CSV export generated',data:{rowCount: rows.length, sampleRow: rows[0], error: null},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{}); // #endregion

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projects-timeline-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Timeline exported as CSV');
    } else if (format === 'png' || format === 'svg') {
      // Export as PNG using html2canvas
      if (!chartRef.current) {
        toast.error('Chart not found');
        return;
      }

      toast.loading('Generating image...', { id: 'export-image' });

      try {
        const canvas = await html2canvas(chartRef.current, {
          backgroundColor: '#ffffff',
          scale: 2, // Higher resolution
        });

        const link = document.createElement('a');
        link.download = `projects-timeline-${formatDate(new Date(), 'yyyy-MM-dd')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        toast.success('Timeline exported as PNG', { id: 'export-image' });
      } catch (error) {
        console.error('Error exporting image:', error);
        toast.error('Failed to export image', { id: 'export-image' });
      }
    }
  };

  // Helper for date formatting in export filename
  const formatDate = (date: Date, formatStr: string) => format(date, formatStr);

  if (timelineData.data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No projects with timeline data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold text-sm mb-2">{data.name}</p>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className="text-xs"
                style={{ 
                  backgroundColor: `${STATUS_COLORS[data.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.default}20`,
                  color: STATUS_COLORS[data.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.default,
                  borderColor: STATUS_COLORS[data.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.default
                }}
              >
                {data.status}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">
                {data.role}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {format(parseISO(data.startDate), 'MMM d, yyyy')} - {format(parseISO(data.endDate), 'MMM d, yyyy')}
            </p>
            <p className="text-muted-foreground">
              Duration: {differenceInDays(parseISO(data.endDate), parseISO(data.startDate))} days
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Projects Timeline
            </CardTitle>
            <CardDescription>
              Gantt view of all linked projects showing their implementation periods
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Filter dropdown - stub for future enhancement */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>All Projects</DropdownMenuItem>
                <DropdownMenuItem>Implementation</DropdownMenuItem>
                <DropdownMenuItem>Pipeline</DropdownMenuItem>
                <DropdownMenuItem>Completion</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Export dropdown - stub for future enhancement */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export Timeline</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('png')}>
                  Export as PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('svg')}>
                  Export as SVG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {timelineData.minDate && timelineData.maxDate && (
              <div className="text-sm text-muted-foreground">
                {format(timelineData.minDate, 'MMM yyyy')} - {format(timelineData.maxDate, 'MMM yyyy')}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={chartRef} className="w-full h-[600px] bg-white">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={timelineData.data} 
              layout="horizontal"
              margin={{ top: 20, right: 30, left: 200, bottom: 60 }}
              barCategoryGap={5}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              
              <XAxis 
                type="number" 
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(value) => {
                  if (!timelineData.minDate || !timelineData.maxDate) return ''
                  const totalDays = differenceInDays(timelineData.maxDate, timelineData.minDate)
                  const tickDate = new Date(timelineData.minDate.getTime() + (value / 100) * totalDays * 24 * 60 * 60 * 1000)
                  return format(tickDate, 'MMM yyyy')
                }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              
              <YAxis 
                type="category" 
                dataKey="name"
                width={180}
                tick={({ x, y, payload }) => (
                  <g transform={`translate(${x},${y})`}>
                    <text 
                      x={-10} 
                      y={0} 
                      dy={4} 
                      textAnchor="end" 
                      fill="#666"
                      fontSize={12}
                      className="cursor-pointer hover:fill-blue-600"
                      onClick={() => {
                        const activity = timelineData.data.find(d => d.name === payload.value)
                        if (activity) handleBarClick(activity)
                      }}
                    >
                      {payload.value.length > 30 
                        ? `${payload.value.substring(0, 30)}...` 
                        : payload.value}
                    </text>
                  </g>
                )}
              />
              
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
              
              {/* Invisible bars for positioning */}
              <Bar 
                dataKey="startOffset" 
                stackId="a" 
                fill="transparent" 
                isAnimationActive={false}
              />
              
              {/* Visible bars for duration */}
              <Bar 
                dataKey="duration" 
                stackId="a" 
                cursor="pointer"
                onClick={handleBarClick}
                radius={[4, 4, 4, 4]}
              >
                {timelineData.data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.default}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center gap-4 justify-center">
          <div className="text-sm font-medium text-muted-foreground">Status:</div>
          {Object.entries(STATUS_COLORS).filter(([key]) => key !== 'default').map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded" 
                style={{ backgroundColor: color }}
              />
              <span className="text-sm capitalize">{status}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 
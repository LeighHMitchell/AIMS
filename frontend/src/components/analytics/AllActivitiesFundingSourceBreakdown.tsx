"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Download, Camera } from 'lucide-react'
import { toast } from 'sonner'
import { FundingSourceSankey } from '@/components/activities/FinancialAnalyticsTab'

interface AllActivitiesFundingSourceBreakdownProps {
  dateRange?: {
    from: Date
    to: Date
  }
  refreshKey?: number
}

export function AllActivitiesFundingSourceBreakdown({
  dateRange,
  refreshKey
}: AllActivitiesFundingSourceBreakdownProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fundingSourceData, setFundingSourceData] = useState<{
    providers: Array<{ name: string; value: number }>
    receivers: Array<{ name: string; value: number }>
    flows: Array<{ provider: string; receiver: string; value: number }>
  }>({ providers: [], receivers: [], flows: [] })
  
  const [fundingSourceType, setFundingSourceType] = useState<'transactions' | 'planned'>('transactions')
  const [fundingTransactionType, setFundingTransactionType] = useState<'1' | '2' | '3' | '4'>('1')
  const [fundingChartType, setFundingChartType] = useState<'chart' | 'table'>('chart')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        params.set('sourceType', fundingSourceType)
        
        if (fundingSourceType === 'transactions' && fundingTransactionType) {
          params.set('transactionType', fundingTransactionType)
        }

        if (dateRange) {
          params.set('dateFrom', dateRange.from.toISOString())
          params.set('dateTo', dateRange.to.toISOString())
        }

        const response = await fetch(`/api/analytics/funding-source-breakdown?${params.toString()}`)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`
          console.error('[AllActivitiesFundingSourceBreakdown] API error:', errorMessage, response.status)
          throw new Error(errorMessage)
        }

        const data = await response.json()
        
        // Validate response structure
        if (!data || (!data.providers && !data.receivers && !data.flows)) {
          console.error('[AllActivitiesFundingSourceBreakdown] Invalid response structure:', data)
          throw new Error('Invalid response from server')
        }
        
        setFundingSourceData(data)
      } catch (err) {
        console.error('[AllActivitiesFundingSourceBreakdown] Error:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to load funding source data'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange, refreshKey, fundingSourceType, fundingTransactionType])

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}m`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`
    }
    return `$${value.toFixed(0)}`
  }

  const exportFundingSourceToCSV = () => {
    if (!fundingSourceData.providers || fundingSourceData.providers.length === 0) {
      toast.error('No data to export')
      return
    }

    const total = fundingSourceData.providers.reduce((sum, item) => sum + item.value, 0)
    const headers = ['Provider', 'Receiver', 'Amount (USD)', 'Percentage']
    let csvContent = headers.join(',') + '\n'

    fundingSourceData.flows.forEach(flow => {
      const percentage = ((flow.value / total) * 100).toFixed(2)
      csvContent += `"${flow.provider}","${flow.receiver}",${flow.value},${percentage}%\n`
    })

    csvContent += `"Total","",${total},100.00%\n`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    const sourceLabel = fundingSourceType === 'planned' ? 'planned_disbursements' : 'transactions'
    const typeLabel = `type_${fundingTransactionType}`
    link.setAttribute('download', `all_activities_funding_source_${sourceLabel}_${typeLabel}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Data exported to CSV')
  }

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
            link.download = `all_activities_funding_source_${sourceLabel}_${typeLabel}_${new Date().toISOString().split('T')[0]}.jpg`
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

  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Funding Source Breakdown
          </CardTitle>
          <CardDescription>
            Distribution of funding by donor/provider across all activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Funding Source Breakdown
          </CardTitle>
          <CardDescription>
            Distribution of funding by donor/provider across all activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 text-slate-400">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">Funding Source Breakdown</CardTitle>
            <CardDescription>Distribution of funding by donor/provider across all activities</CardDescription>
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
        {fundingSourceData.providers && fundingSourceData.providers.length > 0 ? (
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
                  {fundingSourceData.flows.map((flow, index) => {
                    const total = fundingSourceData.providers.reduce((sum, s) => sum + s.value, 0)
                    const percentage = ((flow.value / total) * 100).toFixed(1)
                    return (
                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-medium text-slate-900">{flow.provider}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-700">{flow.receiver}</td>
                        <td className="text-right py-2.5 px-4 text-slate-700">{formatCurrency(flow.value)}</td>
                        <td className="text-right py-2.5 px-4 text-slate-700">{percentage}%</td>
                      </tr>
                    )
                  })}
                  {/* Total Row */}
                  {(() => {
                    const total = fundingSourceData.flows.reduce((sum, flow) => sum + flow.value, 0)
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
              data={fundingSourceData}
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
  )
}


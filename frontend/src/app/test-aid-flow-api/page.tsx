"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'

export default function TestAidFlowAPIPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  const testAPI = async () => {
    setLoading(true)
    setError(null)
    setData(null)
    
    try {
      // Test with last 12 months
      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 12)
      
      const params = new URLSearchParams({
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd')
      })
      
      const response = await fetch(`/api/aid-flows/graph?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Aid Flow API Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testAPI} disabled={loading}>
            {loading ? 'Testing...' : 'Test API Endpoint'}
          </Button>
          
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
              Error: {error}
            </div>
          )}
          
          {data && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <p className="text-green-700 font-medium">Success!</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-100 rounded">
                  <div className="text-sm text-slate-600">Date Range</div>
                  <div className="font-medium">
                    {data.metadata?.dateRange?.start} to {data.metadata?.dateRange?.end}
                  </div>
                </div>
                
                <div className="p-3 bg-slate-100 rounded">
                  <div className="text-sm text-slate-600">Transaction Count</div>
                  <div className="font-medium">{data.metadata?.transactionCount || 0}</div>
                </div>
                
                <div className="p-3 bg-slate-100 rounded">
                  <div className="text-sm text-slate-600">Organizations</div>
                  <div className="font-medium">{data.nodes?.length || 0}</div>
                </div>
                
                <div className="p-3 bg-slate-100 rounded">
                  <div className="text-sm text-slate-600">Aid Flows</div>
                  <div className="font-medium">{data.links?.length || 0}</div>
                </div>
              </div>
              
              <details className="cursor-pointer">
                <summary className="font-medium">View Raw Response</summary>
                <pre className="mt-2 p-4 bg-slate-100 rounded overflow-auto text-xs">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 
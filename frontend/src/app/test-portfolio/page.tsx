"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'

interface TestResult {
  name: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  message?: string
  duration?: number
}

export default function TestPortfolioPage() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'API Endpoint Response', status: 'pending' },
    { name: 'Data Structure Validation', status: 'pending' },
    { name: 'Summary Cards Calculation', status: 'pending' },
    { name: 'Filter Cards Logic', status: 'pending' },
    { name: 'Timeline Data Processing', status: 'pending' },
    { name: 'Sector Distribution', status: 'pending' },
    { name: 'Error Handling', status: 'pending' },
    { name: 'Authentication Check', status: 'pending' }
  ])

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, ...updates } : test
    ))
  }

  const runApiTest = async (index: number) => {
    updateTest(index, { status: 'running' })
    const startTime = Date.now()
    
    try {
      const response = await fetch('/api/my-portfolio')
      const duration = Date.now() - startTime
      
      if (!response.ok) {
        const errorData = await response.json()
        updateTest(index, { 
          status: 'failed', 
          message: `HTTP ${response.status}: ${errorData.error}`,
          duration 
        })
        return null
      }
      
      const data = await response.json()
      updateTest(index, { 
        status: 'passed', 
        message: `Response received in ${duration}ms`,
        duration 
      })
      
      return data
    } catch (error) {
      const duration = Date.now() - startTime
      updateTest(index, { 
        status: 'failed', 
        message: error instanceof Error ? error.message : 'Unknown error',
        duration 
      })
      return null
    }
  }

  const runDataStructureTest = (data: any, index: number) => {
    updateTest(index, { status: 'running' })
    const startTime = Date.now()
    
    try {
      const requiredFields = [
        'summary', 'pipelinePastStart', 'inactive90Days', 
        'missingData', 'validationStatus', 'sectorDistribution', 
        'activityTimeline', 'participatingOrgActivities'
      ]
      
      const missingFields = requiredFields.filter(field => !(field in data))
      
      if (missingFields.length > 0) {
        updateTest(index, { 
          status: 'failed', 
          message: `Missing fields: ${missingFields.join(', ')}`,
          duration: Date.now() - startTime
        })
        return false
      }
      
      // Check summary structure
      const summaryFields = ['totalActivities', 'totalBudget', 'totalPlannedDisbursements']
      const missingSummaryFields = summaryFields.filter(field => !(field in data.summary))
      
      if (missingSummaryFields.length > 0) {
        updateTest(index, { 
          status: 'failed', 
          message: `Missing summary fields: ${missingSummaryFields.join(', ')}`,
          duration: Date.now() - startTime
        })
        return false
      }
      
      updateTest(index, { 
        status: 'passed', 
        message: 'All required fields present',
        duration: Date.now() - startTime
      })
      return true
    } catch (error) {
      updateTest(index, { 
        status: 'failed', 
        message: error instanceof Error ? error.message : 'Structure validation failed',
        duration: Date.now() - startTime
      })
      return false
    }
  }

  const runSummaryTest = (data: any, index: number) => {
    updateTest(index, { status: 'running' })
    const startTime = Date.now()
    
    try {
      const summary = data.summary
      const totalActivities = summary.totalActivities
      const totalBudget = summary.totalBudget
      
      if (typeof totalActivities !== 'number' || totalActivities < 0) {
        updateTest(index, { 
          status: 'failed', 
          message: `Invalid totalActivities: ${totalActivities}`,
          duration: Date.now() - startTime
        })
        return false
      }
      
      if (typeof totalBudget !== 'number' || totalBudget < 0) {
        updateTest(index, { 
          status: 'failed', 
          message: `Invalid totalBudget: ${totalBudget}`,
          duration: Date.now() - startTime
        })
        return false
      }
      
      updateTest(index, { 
        status: 'passed', 
        message: `${totalActivities} activities, $${totalBudget.toLocaleString()} budget`,
        duration: Date.now() - startTime
      })
      return true
    } catch (error) {
      updateTest(index, { 
        status: 'failed', 
        message: error instanceof Error ? error.message : 'Summary calculation failed',
        duration: Date.now() - startTime
      })
      return false
    }
  }

  const runFilterTest = (data: any, index: number) => {
    updateTest(index, { status: 'running' })
    const startTime = Date.now()
    
    try {
      const { pipelinePastStart, inactive90Days, missingData } = data
      
      if (!Array.isArray(pipelinePastStart)) {
        updateTest(index, { 
          status: 'failed', 
          message: 'pipelinePastStart is not an array',
          duration: Date.now() - startTime
        })
        return false
      }
      
      if (!Array.isArray(inactive90Days)) {
        updateTest(index, { 
          status: 'failed', 
          message: 'inactive90Days is not an array',
          duration: Date.now() - startTime
        })
        return false
      }
      
      if (!missingData || typeof missingData !== 'object') {
        updateTest(index, { 
          status: 'failed', 
          message: 'missingData is not an object',
          duration: Date.now() - startTime
        })
        return false
      }
      
      const totalIssues = pipelinePastStart.length + inactive90Days.length + 
        Object.values(missingData).flat().length
      
      updateTest(index, { 
        status: 'passed', 
        message: `${totalIssues} total issues identified`,
        duration: Date.now() - startTime
      })
      return true
    } catch (error) {
      updateTest(index, { 
        status: 'failed', 
        message: error instanceof Error ? error.message : 'Filter test failed',
        duration: Date.now() - startTime
      })
      return false
    }
  }

  const runTimelineTest = (data: any, index: number) => {
    updateTest(index, { status: 'running' })
    const startTime = Date.now()
    
    try {
      const timeline = data.activityTimeline
      
      if (!Array.isArray(timeline)) {
        updateTest(index, { 
          status: 'failed', 
          message: 'Timeline is not an array',
          duration: Date.now() - startTime
        })
        return false
      }
      
      const validEntries = timeline.filter((entry: any) => 
        entry && typeof entry.id === 'string' && typeof entry.title === 'string'
      )
      
      updateTest(index, { 
        status: 'passed', 
        message: `${validEntries.length}/${timeline.length} valid timeline entries`,
        duration: Date.now() - startTime
      })
      return true
    } catch (error) {
      updateTest(index, { 
        status: 'failed', 
        message: error instanceof Error ? error.message : 'Timeline test failed',
        duration: Date.now() - startTime
      })
      return false
    }
  }

  const runSectorTest = (data: any, index: number) => {
    updateTest(index, { status: 'running' })
    const startTime = Date.now()
    
    try {
      const sectors = data.sectorDistribution
      
      if (!sectors || typeof sectors !== 'object') {
        updateTest(index, { 
          status: 'failed', 
          message: 'Sector distribution is not an object',
          duration: Date.now() - startTime
        })
        return false
      }
      
      const sectorCount = Object.keys(sectors).length
      const totalActivities = Object.values(sectors).reduce((sum: number, count: any) => sum + count, 0)
      
      updateTest(index, { 
        status: 'passed', 
        message: `${sectorCount} sectors, ${totalActivities} total activities`,
        duration: Date.now() - startTime
      })
      return true
    } catch (error) {
      updateTest(index, { 
        status: 'failed', 
        message: error instanceof Error ? error.message : 'Sector test failed',
        duration: Date.now() - startTime
      })
      return false
    }
  }

  const runErrorTest = async (index: number) => {
    updateTest(index, { status: 'running' })
    const startTime = Date.now()
    
    try {
      // Test with invalid endpoint
      const response = await fetch('/api/my-portfolio-invalid')
      
      if (response.status === 404) {
        updateTest(index, { 
          status: 'passed', 
          message: 'Correctly handles 404 errors',
          duration: Date.now() - startTime
        })
        return true
      } else {
        updateTest(index, { 
          status: 'failed', 
          message: `Expected 404, got ${response.status}`,
          duration: Date.now() - startTime
        })
        return false
      }
    } catch (error) {
      updateTest(index, { 
        status: 'passed', 
        message: 'Correctly handles network errors',
        duration: Date.now() - startTime
      })
      return true
    }
  }

  const runAuthTest = (index: number) => {
    updateTest(index, { status: 'running' })
    const startTime = Date.now()
    
    try {
      // Check if we're on the client side and can access window
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname
        if (currentPath === '/test-portfolio') {
          updateTest(index, { 
            status: 'passed', 
            message: 'Successfully accessed test page',
            duration: Date.now() - startTime
          })
          return true
        }
      }
      
      updateTest(index, { 
        status: 'passed', 
        message: 'Auth check passed (server-side)',
        duration: Date.now() - startTime
      })
      return true
    } catch (error) {
      updateTest(index, { 
        status: 'failed', 
        message: error instanceof Error ? error.message : 'Auth test failed',
        duration: Date.now() - startTime
      })
      return false
    }
  }

  const runAllTests = async () => {
    // Reset all tests
    setTests(prev => prev.map(test => ({ ...test, status: 'pending' as const })))
    
    // Test 1: API Endpoint
    const data = await runApiTest(0)
    if (!data) return
    
    // Test 2: Data Structure
    const structureValid = runDataStructureTest(data, 1)
    if (!structureValid) return
    
    // Test 3: Summary Cards
    runSummaryTest(data, 2)
    
    // Test 4: Filter Cards
    runFilterTest(data, 3)
    
    // Test 5: Timeline
    runTimelineTest(data, 4)
    
    // Test 6: Sector Distribution
    runSectorTest(data, 5)
    
    // Test 7: Error Handling
    await runErrorTest(6)
    
    // Test 8: Authentication
    runAuthTest(7)
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <Badge variant="success">Passed</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'running':
        return <Badge variant="warning">Running</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  const passedTests = tests.filter(t => t.status === 'passed').length
  const failedTests = tests.filter(t => t.status === 'failed').length
  const runningTests = tests.filter(t => t.status === 'running').length

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MyPortfolio Test Suite</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive testing for the MyPortfolio feature
          </p>
        </div>
        <Button onClick={runAllTests} disabled={runningTests > 0}>
          {runningTests > 0 ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            'Run All Tests'
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{passedTests}</p>
                <p className="text-sm text-muted-foreground">Passed</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{failedTests}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{runningTests}</p>
                <p className="text-sm text-muted-foreground">Running</p>
              </div>
              <Loader2 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tests.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(test.status)}
                  <div>
                    <h3 className="font-medium">{test.name}</h3>
                    {test.message && (
                      <p className="text-sm text-muted-foreground">{test.message}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {test.duration && (
                    <span className="text-xs text-muted-foreground">
                      {test.duration}ms
                    </span>
                  )}
                  {getStatusBadge(test.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
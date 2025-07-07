/**
 * Enhanced error fallback component with reporting and recovery options
 */

import React from 'react'
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useState } from 'react'

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
  componentStack?: string
}

export function ErrorFallback({ 
  error, 
  resetErrorBoundary, 
  componentStack 
}: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [reportSent, setReportSent] = useState(false)

  const handleReportError = async () => {
    try {
      // In a real app, you'd send this to your error reporting service
      console.error('Error Report:', {
        message: error.message,
        stack: error.stack,
        componentStack,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      })
      
      setReportSent(true)
      setTimeout(() => setReportSent(false), 3000)
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  const getErrorSuggestion = (error: Error): string => {
    if (error.message.includes('fetch')) {
      return 'This appears to be a network connectivity issue. Please check your internet connection and try again.'
    }
    if (error.message.includes('parse') || error.message.includes('JSON')) {
      return 'There was an issue processing data from the server. Please refresh the page to try again.'
    }
    if (error.message.includes('permission') || error.message.includes('auth')) {
      return 'You may not have permission to access this resource. Please contact your administrator.'
    }
    if (error.message.includes('not found') || error.message.includes('404')) {
      return 'The requested resource could not be found. It may have been moved or deleted.'
    }
    return 'An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.'
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl text-red-900">
            Something went wrong
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {getErrorSuggestion(error)}
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={resetErrorBoundary}
              className="flex-1"
              variant="default"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            
            <Button 
              onClick={handleGoHome}
              variant="outline"
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>

          {/* Error details toggle */}
          <div className="border-t pt-4">
            <Button
              onClick={() => setShowDetails(!showDetails)}
              variant="ghost"
              size="sm"
              className="w-full text-gray-600"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Show Details
                </>
              )}
            </Button>

            {showDetails && (
              <div className="mt-3 space-y-3">
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <p className="font-medium text-gray-900 mb-1">Error Message:</p>
                  <p className="text-gray-700 font-mono break-all">{error.message}</p>
                </div>

                {error.stack && (
                  <details className="bg-gray-50 p-3 rounded">
                    <summary className="font-medium text-gray-900 cursor-pointer">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-32">
                      {error.stack}
                    </pre>
                  </details>
                )}

                <Button
                  onClick={handleReportError}
                  variant="outline"
                  size="sm"
                  disabled={reportSent}
                  className="w-full"
                >
                  <Bug className="h-4 w-4 mr-2" />
                  {reportSent ? 'Report Sent!' : 'Report This Error'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Minimal error fallback for inline components
 */
export function InlineErrorFallback({ 
  error, 
  resetErrorBoundary 
}: Omit<ErrorFallbackProps, 'componentStack'>) {
  return (
    <Alert className="my-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>Failed to load this component: {error.message}</span>
        <Button onClick={resetErrorBoundary} size="sm" variant="outline">
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  )
}

/**
 * Loading error fallback for async components
 */
export function AsyncErrorFallback({ 
  error, 
  resetErrorBoundary 
}: Omit<ErrorFallbackProps, 'componentStack'>) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-amber-500 mb-3" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Failed to Load
      </h3>
      <p className="text-gray-600 mb-4 max-w-md">
        {error.message || 'An error occurred while loading this content.'}
      </p>
      <Button onClick={resetErrorBoundary} size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    </div>
  )
}
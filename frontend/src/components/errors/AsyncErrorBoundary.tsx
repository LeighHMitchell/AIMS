/**
 * Enhanced error boundary with async support and different fallback strategies
 */

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { ErrorFallback, InlineErrorFallback, AsyncErrorFallback } from './ErrorFallback'

interface Props {
  children: ReactNode
  fallback?: 'page' | 'inline' | 'async'
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  isolate?: boolean // Whether to isolate errors to this boundary
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

export class AsyncErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: number | null = null

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AsyncErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      errorInfo,
    })

    // Call custom error handler
    this.props.onError?.(error, errorInfo)

    // Report to error monitoring service
    this.reportError(error, errorInfo)
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    // Auto-retry logic for certain types of errors
    if (this.state.hasError && !prevState.hasError) {
      if (this.shouldAutoRetry(this.state.error)) {
        this.scheduleRetry()
      }
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In a real application, report to your error monitoring service
    // e.g., Sentry, LogRocket, etc.
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: null, // Add user ID if available
      retryCount: this.state.retryCount,
    }

    console.error('Error Report:', errorReport)
    
    // Example: Send to monitoring service
    // errorMonitoringService.captureException(error, errorReport)
  }

  private shouldAutoRetry = (error: Error | null): boolean => {
    if (!error || this.state.retryCount >= 3) return false

    // Auto-retry for network-related errors
    const networkErrors = [
      'fetch failed',
      'network error',
      'connection error',
      'timeout',
      'ECONNREFUSED',
      'Failed to fetch',
    ]

    return networkErrors.some(pattern => 
      error.message.toLowerCase().includes(pattern.toLowerCase())
    )
  }

  private scheduleRetry = () => {
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000) // Exponential backoff, max 10s
    
    this.retryTimeoutId = window.setTimeout(() => {
      this.handleRetry()
    }, delay)
  }

  private handleRetry = () => {
    console.log(`Retrying after error (attempt ${this.state.retryCount + 1})`)
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }))
  }

  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const { fallback = 'page' } = this.props

      switch (fallback) {
        case 'inline':
          return (
            <InlineErrorFallback
              error={this.state.error}
              resetErrorBoundary={this.resetErrorBoundary}
            />
          )
        
        case 'async':
          return (
            <AsyncErrorFallback
              error={this.state.error}
              resetErrorBoundary={this.resetErrorBoundary}
            />
          )
        
        case 'page':
        default:
          return (
            <ErrorFallback
              error={this.state.error}
              resetErrorBoundary={this.resetErrorBoundary}
              componentStack={this.state.errorInfo?.componentStack || undefined}
            />
          )
      }
    }

    return this.props.children
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <AsyncErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </AsyncErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for functional components to access error boundary
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    // This could throw to the nearest error boundary
    console.error('Manual error report:', error, errorInfo)
    throw error
  }
}
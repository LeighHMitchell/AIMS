"use client"

import React, { useEffect, useRef, useState } from 'react'
import { FileText, Loader2, AlertCircle } from 'lucide-react'

interface PDFThumbnailProps {
  url: string
  width?: number
  height?: number
  className?: string
  fallbackIcon?: React.ReactNode
}

export function PDFThumbnail({
  url,
  width = 200,
  height = 150,
  className = '',
  fallbackIcon
}: PDFThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    let cancelled = false

    const renderPDF = async () => {
      if (!url || !canvasRef.current) return

      // Check if it's a PDF URL
      const isPDF = url.toLowerCase().endsWith('.pdf') ||
        url.includes('/pdf') ||
        url.includes('application/pdf')

      if (!isPDF) {
        setError(true)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(false)

        // Dynamically import pdf.js to avoid SSR issues
        const pdfjsLib = await import('pdfjs-dist')

        // Set worker source - use CDN for simplicity
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument({
          url,
          // Enable CORS
          withCredentials: false,
        })

        const pdf = await loadingTask.promise

        if (cancelled) return

        // Get the first page
        const page = await pdf.getPage(1)

        if (cancelled) return

        const canvas = canvasRef.current
        if (!canvas) return

        const context = canvas.getContext('2d')
        if (!context) return

        // Calculate scale to fit within the desired dimensions
        const viewport = page.getViewport({ scale: 1 })
        const scaleX = width / viewport.width
        const scaleY = height / viewport.height
        const scale = Math.min(scaleX, scaleY)

        const scaledViewport = page.getViewport({ scale })

        // Set canvas dimensions
        canvas.width = scaledViewport.width
        canvas.height = scaledViewport.height

        // Render the page
        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
        }

        await page.render(renderContext).promise

        if (!cancelled) {
          setRendered(true)
          setLoading(false)
        }
      } catch (err) {
        console.warn('Failed to render PDF thumbnail:', err)
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      }
    }

    renderPDF()

    return () => {
      cancelled = true
    }
  }, [url, width, height])

  // Show loading state
  if (loading && !rendered) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 rounded-lg ${className}`}
        style={{ width, height }}
      >
        <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
      </div>
    )
  }

  // Show error/fallback state
  if (error || !rendered) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 rounded-lg ${className}`}
        style={{ width, height }}
      >
        {fallbackIcon || <FileText className="h-8 w-8 text-slate-400" />}
      </div>
    )
  }

  // Show rendered PDF
  return (
    <canvas
      ref={canvasRef}
      className={`rounded-lg ${className}`}
      style={{ maxWidth: width, maxHeight: height }}
    />
  )
}

// Utility function to check if a URL is likely a PDF
export function isPDFUrl(url: string): boolean {
  if (!url) return false
  const lowerUrl = url.toLowerCase()
  return (
    lowerUrl.endsWith('.pdf') ||
    lowerUrl.includes('/pdf') ||
    lowerUrl.includes('application/pdf') ||
    lowerUrl.includes('type=pdf')
  )
}

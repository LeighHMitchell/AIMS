"use client"

import React, { useEffect, useRef, useState } from 'react'
import { FileText, FileSpreadsheet, FileImage, File, FileCode, FileArchive, Presentation, Loader2 } from 'lucide-react'

interface DocumentThumbnailProps {
  url: string
  format?: string
  title?: string
  width?: number
  height?: number
  className?: string
}

// Check if URL is external (different domain)
function isExternalUrl(url: string): boolean {
  try {
    const urlObj = new URL(url, window.location.origin)
    return urlObj.origin !== window.location.origin
  } catch {
    return false
  }
}

// Get the URL to use for fetching (proxied for external URLs)
function getProxiedUrl(url: string): string {
  if (!url) return url

  // If it's an external URL, proxy it through our API to avoid CORS
  if (isExternalUrl(url)) {
    return `/api/proxy-pdf?url=${encodeURIComponent(url)}`
  }

  return url
}

// Get icon based on file format/extension
function getDocumentIcon(url: string, format?: string) {
  const lowerUrl = url.toLowerCase()
  const lowerFormat = (format || '').toLowerCase()

  // Check for PDF
  if (lowerUrl.endsWith('.pdf') || lowerFormat.includes('pdf')) {
    return <FileText className="h-10 w-10 text-red-500" />
  }

  // Check for spreadsheets
  if (
    lowerUrl.match(/\.(xlsx?|csv|ods)$/) ||
    lowerFormat.includes('spreadsheet') ||
    lowerFormat.includes('excel')
  ) {
    return <FileSpreadsheet className="h-10 w-10 text-green-600" />
  }

  // Check for presentations
  if (
    lowerUrl.match(/\.(pptx?|odp)$/) ||
    lowerFormat.includes('presentation') ||
    lowerFormat.includes('powerpoint')
  ) {
    return <Presentation className="h-10 w-10 text-orange-500" />
  }

  // Check for images
  if (
    lowerUrl.match(/\.(jpe?g|png|gif|webp|svg|bmp)$/) ||
    lowerFormat.includes('image')
  ) {
    return <FileImage className="h-10 w-10 text-purple-500" />
  }

  // Check for code/text files
  if (
    lowerUrl.match(/\.(json|xml|html?|css|js|ts|md|txt)$/) ||
    lowerFormat.includes('text') ||
    lowerFormat.includes('xml') ||
    lowerFormat.includes('json')
  ) {
    return <FileCode className="h-10 w-10 text-blue-500" />
  }

  // Check for archives
  if (
    lowerUrl.match(/\.(zip|rar|7z|tar|gz)$/) ||
    lowerFormat.includes('zip') ||
    lowerFormat.includes('archive')
  ) {
    return <FileArchive className="h-10 w-10 text-yellow-600" />
  }

  // Check for Word documents
  if (
    lowerUrl.match(/\.(docx?|odt|rtf)$/) ||
    lowerFormat.includes('word') ||
    lowerFormat.includes('document')
  ) {
    return <FileText className="h-10 w-10 text-blue-600" />
  }

  // Default file icon
  return <File className="h-10 w-10 text-slate-500" />
}

// Get background color based on file type
function getBackgroundColor(url: string, format?: string): string {
  const lowerUrl = url.toLowerCase()
  const lowerFormat = (format || '').toLowerCase()

  if (lowerUrl.endsWith('.pdf') || lowerFormat.includes('pdf')) {
    return 'bg-red-50'
  }
  if (lowerUrl.match(/\.(xlsx?|csv|ods)$/) || lowerFormat.includes('spreadsheet')) {
    return 'bg-green-50'
  }
  if (lowerUrl.match(/\.(pptx?|odp)$/) || lowerFormat.includes('presentation')) {
    return 'bg-orange-50'
  }
  if (lowerUrl.match(/\.(jpe?g|png|gif|webp|svg)$/) || lowerFormat.includes('image')) {
    return 'bg-purple-50'
  }
  if (lowerUrl.match(/\.(docx?|odt)$/) || lowerFormat.includes('word')) {
    return 'bg-blue-50'
  }
  return 'bg-slate-50'
}

export function DocumentThumbnail({
  url,
  format,
  title,
  width,
  height,
  className = '',
}: DocumentThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(false)
  const [pdfRendered, setPdfRendered] = useState(false)
  const [error, setError] = useState(false)
  const renderAttemptedRef = useRef(false)

  const isPDF = url.toLowerCase().endsWith('.pdf') || (format || '').toLowerCase().includes('pdf')
  const isImage = url.toLowerCase().match(/\.(jpe?g|png|gif|webp|svg|bmp)$/i) || (format || '').toLowerCase().includes('image')

  // Render PDF thumbnail
  useEffect(() => {
    if (!isPDF || pdfRendered || error || renderAttemptedRef.current) return
    renderAttemptedRef.current = true

    const renderPDF = async () => {
      if (!canvasRef.current) {
        console.log('[PDF Preview] No canvas ref, skipping')
        return
      }

      try {
        setLoading(true)
        setError(false)

        // Get container dimensions or use defaults
        const containerWidth = containerRef.current?.clientWidth || width || 280
        const containerHeight = containerRef.current?.clientHeight || height || 180
        console.log('[PDF Preview] Container dimensions:', containerWidth, 'x', containerHeight)

        // Dynamically import pdf.js
        console.log('[PDF Preview] Starting to load PDF:', url)
        
        let pdfjs: any
        try {
          // Try the standard build first
          pdfjs = await import('pdfjs-dist')
          console.log('[PDF Preview] pdf.js standard build loaded')
        } catch (importErr) {
          console.log('[PDF Preview] Standard build failed, trying legacy:', importErr)
          pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
          console.log('[PDF Preview] pdf.js legacy build loaded')
        }
        
        // Disable worker - runs in main thread but more compatible
        pdfjs.GlobalWorkerOptions.workerSrc = ''

        // Use proxied URL for external PDFs to avoid CORS issues
        const pdfUrl = getProxiedUrl(url)
        console.log('[PDF Preview] Loading document from:', pdfUrl)

        const loadingTask = pdfjs.getDocument({
          url: pdfUrl,
          disableWorker: true,
          isEvalSupported: false,
          useSystemFonts: true,
        })

        const pdf = await loadingTask.promise
        const page = await pdf.getPage(1)

        const canvas = canvasRef.current
        if (!canvas) {
          setError(true)
          setLoading(false)
          return
        }

        const context = canvas.getContext('2d')
        if (!context) {
          setError(true)
          setLoading(false)
          return
        }

        // Calculate scale to fit container
        const viewport = page.getViewport({ scale: 1 })
        const scaleX = containerWidth / viewport.width
        const scaleY = containerHeight / viewport.height
        const scale = Math.min(scaleX, scaleY) * 0.95

        const scaledViewport = page.getViewport({ scale })

        canvas.width = scaledViewport.width
        canvas.height = scaledViewport.height

        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise

        setPdfRendered(true)
        setLoading(false)
      } catch (err: any) {
        console.error('[PDF Preview] Failed to render PDF thumbnail:', {
          error: err,
          message: err?.message,
          name: err?.name,
          url: url
        })
        setError(true)
        setLoading(false)
      }
    }

    renderPDF()
  }, [url, width, height, isPDF, pdfRendered, error])

  // Build style object only if dimensions are explicitly provided
  const styleObj = (width || height) ? { width, height } : undefined

  // For images, show the actual image (proxy external images to avoid CORS)
  if (isImage) {
    const imageUrl = isExternalUrl(url) ? getProxiedUrl(url) : url

    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden bg-slate-100 ${className}`}
        style={styleObj}
      >
        <img
          src={imageUrl}
          alt={title || 'Document preview'}
          className="w-full h-full object-cover"
          onError={(e) => {
            // If proxy fails, try original URL as fallback
            if (e.currentTarget.src !== url) {
              e.currentTarget.src = url
            } else {
              e.currentTarget.style.display = 'none'
            }
          }}
        />
      </div>
    )
  }

  // For PDFs, show the rendered canvas or loading/fallback state
  if (isPDF) {
    if (loading) {
      return (
        <div
          ref={containerRef}
          className={`flex items-center justify-center bg-slate-100 ${className}`}
          style={styleObj}
        >
          <div className="text-center">
            <Loader2 className="h-6 w-6 text-slate-400 animate-spin mx-auto mb-2" />
            <span className="text-xs text-slate-400">Loading...</span>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )
    }

    if (pdfRendered) {
      return (
        <div
          ref={containerRef}
          className={`relative overflow-hidden bg-white flex items-center justify-center ${className}`}
          style={styleObj}
        >
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )
    }

    // PDF failed to render or hasn't started, show fallback
    return (
      <div
        ref={containerRef}
        className={`flex flex-col items-center justify-center ${getBackgroundColor(url, format)} ${className}`}
        style={styleObj}
      >
        <canvas ref={canvasRef} className="hidden" />
        {getDocumentIcon(url, format)}
        <span className="text-xs text-slate-500 mt-2 font-medium">PDF</span>
      </div>
    )
  }

  // For other file types, show icon with background
  return (
    <div
      ref={containerRef}
      className={`flex flex-col items-center justify-center ${getBackgroundColor(url, format)} ${className}`}
      style={styleObj}
    >
      {getDocumentIcon(url, format)}
      {format && (
        <span className="text-xs text-slate-500 mt-2 font-medium uppercase">
          {format.split('/').pop()?.replace('application/', '').slice(0, 10)}
        </span>
      )}
    </div>
  )
}

"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { FileText, Loader2, FileSpreadsheet, FileImage, File, FileCode, FileArchive, Presentation } from 'lucide-react'

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
  width = 200,
  height = 140,
  className = '',
}: DocumentThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(false)
  const [pdfRendered, setPdfRendered] = useState(false)
  const [error, setError] = useState(false)

  const isPDF = url.toLowerCase().endsWith('.pdf') || (format || '').toLowerCase().includes('pdf')
  const isImage = url.toLowerCase().match(/\.(jpe?g|png|gif|webp|svg|bmp)$/i) || (format || '').toLowerCase().includes('image')

  // Render PDF thumbnail
  const renderPDF = useCallback(async () => {
    if (!isPDF || !canvasRef.current || pdfRendered) return

    try {
      setLoading(true)
      setError(false)

      // Dynamically import pdf.js
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

      // Use proxied URL for external PDFs to avoid CORS issues
      const pdfUrl = getProxiedUrl(url)

      const loadingTask = pdfjsLib.getDocument({
        url: pdfUrl,
        withCredentials: false,
      })

      const pdf = await loadingTask.promise
      const page = await pdf.getPage(1)

      const canvas = canvasRef.current
      if (!canvas) return

      const context = canvas.getContext('2d')
      if (!context) return

      // Calculate scale to fit
      const viewport = page.getViewport({ scale: 1 })
      const scaleX = width / viewport.width
      const scaleY = height / viewport.height
      const scale = Math.min(scaleX, scaleY) * 0.95 // Slightly smaller for padding

      const scaledViewport = page.getViewport({ scale })

      canvas.width = scaledViewport.width
      canvas.height = scaledViewport.height

      await page.render({
        canvasContext: context,
        viewport: scaledViewport,
      }).promise

      setPdfRendered(true)
      setLoading(false)
    } catch (err) {
      console.warn('Failed to render PDF thumbnail:', err)
      setError(true)
      setLoading(false)
    }
  }, [url, width, height, isPDF, pdfRendered])

  useEffect(() => {
    if (isPDF && !pdfRendered && !error) {
      renderPDF()
    }
  }, [isPDF, pdfRendered, error, renderPDF])

  // For images, show the actual image (proxy external images to avoid CORS)
  if (isImage) {
    const imageUrl = isExternalUrl(url) ? getProxiedUrl(url) : url

    return (
      <div
        className={`relative overflow-hidden rounded-lg bg-slate-100 ${className}`}
        style={{ width, height }}
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

  // For PDFs, show the rendered canvas or loading state
  if (isPDF) {
    if (loading) {
      return (
        <div
          className={`flex items-center justify-center bg-slate-100 rounded-lg ${className}`}
          style={{ width, height }}
        >
          <div className="text-center">
            <Loader2 className="h-6 w-6 text-slate-400 animate-spin mx-auto mb-2" />
            <span className="text-xs text-slate-400">Loading preview...</span>
          </div>
        </div>
      )
    }

    if (pdfRendered) {
      return (
        <div
          className={`relative overflow-hidden rounded-lg bg-white border border-slate-200 flex items-center justify-center ${className}`}
          style={{ width, height }}
        >
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full"
          />
        </div>
      )
    }

    // PDF failed to render, show fallback
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-lg ${getBackgroundColor(url, format)} ${className}`}
        style={{ width, height }}
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
      className={`flex flex-col items-center justify-center rounded-lg ${getBackgroundColor(url, format)} ${className}`}
      style={{ width, height }}
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

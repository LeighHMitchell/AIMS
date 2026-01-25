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
  thumbnailUrl?: string // Server-generated thumbnail URL (preferred)
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
  thumbnailUrl,
}: DocumentThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(false)
  const [pdfRendered, setPdfRendered] = useState(false)
  const [error, setError] = useState(false)
  const [thumbnailError, setThumbnailError] = useState(false)
  const renderAttemptedRef = useRef(false)

  const isPDF = url.toLowerCase().endsWith('.pdf') || (format || '').toLowerCase().includes('pdf')
  const isImage = url.toLowerCase().match(/\.(jpe?g|png|gif|webp|svg|bmp)$/i) || (format || '').toLowerCase().includes('image')

  // Check if we have a server-generated thumbnail available
  const hasServerThumbnail = thumbnailUrl && !thumbnailError

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

        // Get container dimensions or use defaults (portrait 3:4 ratio for documents)
        const containerWidth = containerRef.current?.clientWidth || width || 210
        const containerHeight = containerRef.current?.clientHeight || height || 280
        console.log('[PDF Preview] Container dimensions:', containerWidth, 'x', containerHeight)

        // Dynamically import pdf.js
        console.log('[PDF Preview] Starting to load PDF:', url)
        
        const pdfjs = await import('pdfjs-dist')
        console.log('[PDF Preview] pdf.js loaded, version:', pdfjs.version)
        
        // Set worker URL - use unpkg CDN
        const workerUrl = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
        console.log('[PDF Preview] Setting worker URL:', workerUrl)
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

        // Don't proxy Supabase URLs - they should be accessible directly
        const pdfUrl = url
        console.log('[PDF Preview] Loading document from:', pdfUrl)

        const loadingTask = pdfjs.getDocument({
          url: pdfUrl,
          withCredentials: false,
        })

        console.log('[PDF Preview] Waiting for PDF to load...')
        const pdf = await loadingTask.promise
        console.log('[PDF Preview] PDF loaded, pages:', pdf.numPages)
        
        const page = await pdf.getPage(1)
        console.log('[PDF Preview] Got page 1')

        const canvas = canvasRef.current
        if (!canvas) {
          console.log('[PDF Preview] No canvas ref!')
          setError(true)
          setLoading(false)
          return
        }

        const context = canvas.getContext('2d')
        if (!context) {
          console.log('[PDF Preview] No canvas context!')
          setError(true)
          setLoading(false)
          return
        }

        // Calculate scale to fit container
        const viewport = page.getViewport({ scale: 1 })
        const scaleX = containerWidth / viewport.width
        const scaleY = containerHeight / viewport.height
        const scale = Math.min(scaleX, scaleY) * 0.95
        console.log('[PDF Preview] Rendering at scale:', scale)

        const scaledViewport = page.getViewport({ scale })

        canvas.width = scaledViewport.width
        canvas.height = scaledViewport.height

        console.log('[PDF Preview] Starting render...')
        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise

        console.log('[PDF Preview] Render complete!')
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

  // If we have a server-generated thumbnail, use it (most reliable)
  if (hasServerThumbnail) {
    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden bg-slate-100 ${className}`}
        style={styleObj}
      >
        <img
          src={thumbnailUrl}
          alt={title || 'Document preview'}
          className="w-full h-full object-cover object-top"
          onError={() => {
            // If server thumbnail fails to load, fall back to other methods
            setThumbnailError(true)
          }}
        />
      </div>
    )
  }

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
  // IMPORTANT: Keep canvas in the DOM consistently to preserve rendered content
  if (isPDF) {
    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden flex items-center justify-center ${pdfRendered ? 'bg-white' : getBackgroundColor(url, format)} ${className}`}
        style={styleObj}
      >
        {/* Canvas - always in DOM, visibility controlled by CSS */}
        {/* Uses object-cover and object-top to crop from bottom, showing top of PDF */}
        <canvas
          ref={canvasRef}
          className={pdfRendered ? "w-full h-full object-cover object-top" : "hidden"}
        />

        {/* Loading state */}
        {loading && !pdfRendered && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <div className="text-center">
              <Loader2 className="h-6 w-6 text-slate-400 animate-spin mx-auto mb-2" />
              <span className="text-xs text-slate-400">Loading...</span>
            </div>
          </div>
        )}

        {/* Fallback icon - shown when not loading and not rendered */}
        {!loading && !pdfRendered && (
          <div className="flex flex-col items-center justify-center">
            {getDocumentIcon(url, format)}
            <span className="text-xs text-slate-500 mt-2 font-medium">PDF</span>
          </div>
        )}
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
